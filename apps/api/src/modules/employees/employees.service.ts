import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AuditEntryView,
  AuthUser,
  AwardsSection,
  EducationSection,
  EmployeeDetail,
  EmployeeListItem,
  EmployeeListQuery,
  EmployeeSection,
  FamilySection,
  fromKhmerDigits,
  Paginated,
  PersonalSection,
  RecordStatus,
  Role,
  WorkSection,
} from '@csbms/shared';
import { toDbDate } from '../../common/date';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LocationsService } from '../locations/locations.service';
import { OrganizationUnitsService } from '../organization-units/organization-units.service';
import {
  employeeFullInclude,
  employeeListInclude,
  locationCodesOf,
  sectionSnapshot,
  toEmployeeDetail,
  toEmployeeListItem,
} from './employee.mapper';
import { nextStatus, WorkflowAction } from './employee-workflow';

type Tx = Prisma.TransactionClient;

export type SectionData =
  PersonalSection | EducationSection | WorkSection | AwardsSection | FamilySection;

const notFound = () => new NotFoundException({ error: 'NOT_FOUND', message: 'Employee not found' });

/** Only VIEWER sees masked national ID / phone numbers. */
export const shouldMask = (user: AuthUser) => user.role === Role.VIEWER;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly units: OrganizationUnitsService,
    private readonly locations: LocationsService,
  ) {}

  // ---------- Read ----------

  async list(query: EmployeeListQuery, user: AuthUser): Promise<Paginated<EmployeeListItem>> {
    const where = await this.listWhere(query, user);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        include: employeeListInclude,
        orderBy: { [query.sort]: query.order },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    const mask = shouldMask(user);
    return {
      items: rows.map((r) => toEmployeeListItem(r, mask)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Builds the filter for list, Excel export and reports (always limited to the user's units). */
  async listWhere(
    query: Partial<EmployeeListQuery>,
    user: AuthUser,
  ): Promise<Prisma.EmployeeWhereInput> {
    const scope = await this.units.scopeFor(user);
    let unitIds = scope;
    if (query.organizationUnitId) {
      const below = await this.units.descendantIds(query.organizationUnitId);
      unitIds = scope === null ? below : below.filter((id) => scope.includes(id));
    }

    const where: Prisma.EmployeeWhereInput = { deletedAt: null };
    if (unitIds !== null) where.organizationUnitId = { in: unitIds };
    if (query.rankId) where.rankId = query.rankId;
    if (query.gender) where.gender = query.gender;
    if (query.status) where.status = query.status;
    if (query.search) {
      const s = query.search;
      const digits = fromKhmerDigits(s).replace(/\s/g, '');
      where.OR = [
        { nameKh: { contains: s, mode: 'insensitive' } },
        { nameLatin: { contains: s, mode: 'insensitive' } },
        { civilServantId: s },
        ...(/^\d+$/.test(digits) ? [{ nationalIdNo: digits }, { civilServantNo: digits }] : []),
      ];
    }
    return where;
  }

  async get(id: string, user: AuthUser, opts: { auditView?: boolean; ip?: string | null } = {}) {
    const row = await this.loadInScope(id, user);
    const detail = await this.toDetail(row, shouldMask(user));
    if (opts.auditView) {
      await this.audit.log({
        userId: user.id,
        action: 'VIEW',
        entity: 'Employee',
        entityId: id,
        ip: opts.ip,
      });
    }
    return detail;
  }

  /** Record for printing (masked for VIEWER, like the screen) plus the photo storage key. */
  async getForPrint(
    id: string,
    user: AuthUser,
  ): Promise<EmployeeDetail & { photoKey: string | null }> {
    const row = await this.loadInScope(id, user);
    return { ...(await this.toDetail(row, shouldMask(user))), photoKey: row.photoKey };
  }

  async history(id: string, user: AuthUser): Promise<AuditEntryView[]> {
    await this.loadInScope(id, user);
    return this.audit.listFor('Employee', id);
  }

  // ---------- Write ----------

  async create(data: PersonalSection, user: AuthUser, ip: string | null): Promise<EmployeeDetail> {
    await this.assertUnitInScope(user, data.organizationUnitId);
    await this.validatePersonal(data);

    const id = await this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          ...personalFields(data),
          organizationUnit: { connect: { id: data.organizationUnitId } },
          createdBy: { connect: { id: user.id } },
          voterRegistration: data.voterRegistration
            ? { create: voterFields(data.voterRegistration) }
            : undefined,
        },
      });
      await this.audit.log(
        {
          userId: user.id,
          action: 'CREATE',
          entity: 'Employee',
          entityId: employee.id,
          after: data,
          ip,
        },
        tx,
      );
      return employee.id;
    });
    return this.get(id, user);
  }

  /**
   * Saves one form section. Uses optimistic locking: the client sends the
   * `version` it loaded; if someone else saved in between, we return 409.
   */
  async updateSection(
    id: string,
    section: EmployeeSection,
    version: number,
    data: SectionData,
    user: AuthUser,
    ip: string | null,
  ): Promise<EmployeeDetail> {
    const current = await this.loadInScope(id, user);
    const status = nextStatus(current.status, 'edit');
    if (current.version !== version) throw staleVersion();

    if (section === 'personal') {
      const p = data as PersonalSection;
      if (p.organizationUnitId !== current.organizationUnitId) {
        await this.assertUnitInScope(user, p.organizationUnitId);
      }
      await this.validatePersonal(p);
    }
    if (section === 'work') await this.validateWork(data as WorkSection);

    const before = sectionSnapshot(await this.toDetail(current, false), section);

    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.employee.updateMany({
        where: { id, version, deletedAt: null },
        data: {
          ...this.sectionEmployeeFields(section, data),
          version: { increment: 1 },
          status,
          ...(current.status === RecordStatus.VERIFIED
            ? { verifiedAt: null, verifiedById: null }
            : {}),
        },
      });
      if (changed.count === 0) throw staleVersion();
      await this.replaceChildren(tx, id, section, data);
      await this.audit.log(
        {
          userId: user.id,
          action: 'UPDATE',
          entity: 'Employee',
          entityId: id,
          before: { section, ...(before as object) },
          after: { section, ...(data as object) },
          ip,
        },
        tx,
      );
    });
    return this.get(id, user);
  }

  async remove(id: string, user: AuthUser, ip: string | null): Promise<void> {
    await this.loadInScope(id, user);
    await this.prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });
      await this.audit.log(
        { userId: user.id, action: 'DELETE', entity: 'Employee', entityId: id, ip },
        tx,
      );
    });
  }

  async transition(
    id: string,
    action: Exclude<WorkflowAction, 'edit'>,
    user: AuthUser,
    ip: string | null,
    comment?: string,
  ): Promise<EmployeeDetail> {
    const current = await this.loadInScope(id, user);
    const status = nextStatus(current.status, action);
    const now = new Date();

    const data: Prisma.EmployeeUncheckedUpdateManyInput = { status, version: { increment: 1 } };
    if (action === 'submit') Object.assign(data, { submittedAt: now, returnComment: null });
    if (action === 'verify') Object.assign(data, { verifiedAt: now, verifiedById: user.id });
    if (action === 'return') Object.assign(data, { returnComment: comment ?? null });

    await this.prisma.$transaction(async (tx) => {
      // The status condition makes this safe when two people click at the same time.
      const changed = await tx.employee.updateMany({
        where: { id, status: current.status, deletedAt: null },
        data,
      });
      if (changed.count === 0) throw staleVersion();
      await this.audit.log(
        {
          userId: user.id,
          action: action.toUpperCase() as 'SUBMIT' | 'VERIFY' | 'RETURN',
          entity: 'Employee',
          entityId: id,
          before: { status: current.status },
          after: { status, ...(comment ? { comment } : {}) },
          ip,
        },
        tx,
      );
    });
    return this.get(id, user);
  }

  // ---------- Helpers ----------

  /** Loads a non-deleted employee and checks it is inside the user's units. */
  async loadInScope(id: string, user: AuthUser) {
    const row = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: employeeFullInclude,
    });
    if (!row) throw notFound();
    if (!(await this.units.isInScope(user, row.organizationUnitId))) throw notFound();
    return row;
  }

  private async toDetail(row: Awaited<ReturnType<EmployeesService['loadInScope']>>, mask: boolean) {
    const codes = locationCodesOf(row);
    const names = await this.locations.loadNames([codes.birth, codes.address, codes.voter]);
    return toEmployeeDetail(row, names, mask);
  }

  private async assertUnitInScope(user: AuthUser, unitId: string) {
    const unit = await this.prisma.organizationUnit.findUnique({ where: { id: unitId } });
    if (!unit) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Unknown organization unit',
        details: [{ field: 'organizationUnitId', message: 'Unknown organization unit' }],
      });
    }
    if (!(await this.units.isInScope(user, unitId))) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'This unit is outside your access',
      });
    }
  }

  private async validatePersonal(p: PersonalSection) {
    await this.locations.validate(p.birthPlace, 'birthPlace');
    await this.locations.validate(p.address, 'address');
    if (p.voterRegistration)
      await this.locations.validate(p.voterRegistration.location, 'voterRegistration.location');
  }

  private async validateWork(w: WorkSection) {
    if (w.rankId && !(await this.prisma.rank.findUnique({ where: { id: w.rankId } }))) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Unknown rank',
        details: [{ field: 'rankId', message: 'Unknown rank' }],
      });
    }
    const positionIds = [
      ...new Set(w.workHistories.map((h) => h.positionId).filter((v): v is string => !!v)),
    ];
    if (positionIds.length) {
      const found = await this.prisma.position.count({ where: { id: { in: positionIds } } });
      if (found !== positionIds.length) {
        throw new BadRequestException({
          error: 'VALIDATION_ERROR',
          message: 'Unknown position',
          details: [{ field: 'workHistories', message: 'Unknown position' }],
        });
      }
    }
  }

  private sectionEmployeeFields(
    section: EmployeeSection,
    data: SectionData,
  ): Prisma.EmployeeUncheckedUpdateManyInput {
    switch (section) {
      case 'personal': {
        const p = data as PersonalSection;
        return { ...personalFields(p), organizationUnitId: p.organizationUnitId };
      }
      case 'work': {
        const w = data as WorkSection;
        return {
          civilServiceStartDate: toDbDate(w.civilServiceStartDate),
          currentPositionStartDate: toDbDate(w.currentPositionStartDate),
          specialty: w.specialty ?? null,
          rankId: w.rankId ?? null,
          rankYear: w.rankYear ?? null,
        };
      }
      case 'family': {
        const f = data as FamilySection;
        return {
          childrenFemale: f.childrenFemale,
          childrenMale: f.childrenMale,
          declaredPlace: f.declaredPlace ?? null,
          declaredDate: toDbDate(f.declaredDate),
        };
      }
      default:
        return {};
    }
  }

  /** Child rows of a section are replaced as a whole (the form always sends the full list). */
  private async replaceChildren(
    tx: Tx,
    employeeId: string,
    section: EmployeeSection,
    data: SectionData,
  ) {
    switch (section) {
      case 'personal': {
        const v = (data as PersonalSection).voterRegistration;
        await tx.voterRegistration.deleteMany({ where: { employeeId } });
        if (v) await tx.voterRegistration.create({ data: { employeeId, ...voterFields(v) } });
        return;
      }
      case 'education': {
        const rows = (data as EducationSection).educations;
        await tx.education.deleteMany({ where: { employeeId } });
        await tx.education.createMany({
          data: rows.map((r, i) => ({
            employeeId,
            sortOrder: i,
            category: r.category,
            levelOrCourse: r.levelOrCourse,
            institution: r.institution ?? null,
            certificate: r.certificate ?? null,
            startDate: toDbDate(r.startDate),
            endDate: toDbDate(r.endDate),
          })),
        });
        return;
      }
      case 'work': {
        const rows = (data as WorkSection).workHistories;
        await tx.workHistory.deleteMany({ where: { employeeId } });
        await tx.workHistory.createMany({
          data: rows.map((r, i) => ({
            employeeId,
            sortOrder: i,
            sector: r.sector,
            startDate: toDbDate(r.startDate)!,
            endDate: toDbDate(r.endDate),
            positionId: r.positionId ?? null,
            positionText: r.positionText ?? null,
            ministryOrInstitution: r.ministryOrInstitution ?? null,
            unit: r.unit ?? null,
          })),
        });
        return;
      }
      case 'awards': {
        const rows = (data as AwardsSection).awards;
        await tx.awardDiscipline.deleteMany({ where: { employeeId } });
        await tx.awardDiscipline.createMany({
          data: rows.map((r, i) => ({
            employeeId,
            sortOrder: i,
            type: r.type,
            documentRef: r.documentRef ?? null,
            date: toDbDate(r.date),
            ministryOrInstitution: r.ministryOrInstitution ?? null,
            kind: r.kind ?? null,
            form: r.form ?? null,
          })),
        });
        return;
      }
      case 'family': {
        const f = data as FamilySection;
        await tx.familyMember.deleteMany({ where: { employeeId } });
        await tx.familyMember.createMany({
          data: f.familyMembers.map((m) => ({
            employeeId,
            relation: m.relation,
            name: m.name,
            isAlive: m.isAlive,
            dateOfBirth: toDbDate(m.dateOfBirth),
            occupation: m.occupation ?? null,
            address: m.address ?? null,
            birthPlace: m.birthPlace ?? null,
            phone1: m.phone1 ?? null,
            phone2: m.phone2 ?? null,
          })),
        });
        await tx.referencePerson.deleteMany({ where: { employeeId } });
        await tx.referencePerson.createMany({
          data: f.references.map((r, i) => ({
            employeeId,
            sortOrder: i + 1,
            name: r.name,
            gender: r.gender ?? null,
            occupation: r.occupation ?? null,
            phone: r.phone ?? null,
            address: r.address ?? null,
          })),
        });
        return;
      }
    }
  }
}

function staleVersion() {
  return new ConflictException({
    error: 'STALE_VERSION',
    message: 'Someone else changed this record. Please reload and try again.',
  });
}

function personalFields(p: PersonalSection) {
  return {
    civilServantId: p.civilServantId ?? null,
    nationalIdNo: p.nationalIdNo ?? null,
    civilServantNo: p.civilServantNo ?? null,
    nameKh: p.nameKh,
    nameLatin: p.nameLatin,
    gender: p.gender,
    dateOfBirth: toDbDate(p.dateOfBirth)!,
    nationality: p.nationality,
    birthProvinceCode: p.birthPlace.provinceCode ?? null,
    birthDistrictCode: p.birthPlace.districtCode ?? null,
    birthCommuneCode: p.birthPlace.communeCode ?? null,
    birthVillageCode: p.birthPlace.villageCode ?? null,
    houseNo: p.houseNo ?? null,
    streetNo: p.streetNo ?? null,
    addrProvinceCode: p.address.provinceCode ?? null,
    addrDistrictCode: p.address.districtCode ?? null,
    addrCommuneCode: p.address.communeCode ?? null,
    addrVillageCode: p.address.villageCode ?? null,
    phone1: p.phone1 ?? null,
    phone2: p.phone2 ?? null,
  };
}

function voterFields(v: NonNullable<PersonalSection['voterRegistration']>) {
  return {
    voterNo: v.voterNo ?? null,
    pollingStation: v.pollingStation ?? null,
    provinceCode: v.location.provinceCode ?? null,
    districtCode: v.location.districtCode ?? null,
    communeCode: v.location.communeCode ?? null,
    villageCode: v.location.villageCode ?? null,
    year: v.year ?? null,
  };
}
