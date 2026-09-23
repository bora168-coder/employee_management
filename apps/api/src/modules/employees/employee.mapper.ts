import { Prisma } from '@prisma/client';
import {
  CurrentPositionView,
  EmployeeDetail,
  EmployeeListItem,
  FamilyRelation,
  maskValue,
} from '@csbms/shared';
import { fromDbDate } from '../../common/date';
import { LocationCodes, LocationsService } from '../locations/locations.service';

export const employeeFullInclude = {
  organizationUnit: { select: { id: true, nameKh: true } },
  rank: true,
  voterRegistration: true,
  educations: { orderBy: { sortOrder: 'asc' } },
  workHistories: { orderBy: { sortOrder: 'asc' }, include: { position: true } },
  awards: { orderBy: { sortOrder: 'asc' } },
  familyMembers: true,
  references: { orderBy: { sortOrder: 'asc' } },
  verifiedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.EmployeeInclude;

export type EmployeeFull = Prisma.EmployeeGetPayload<{ include: typeof employeeFullInclude }>;

export const employeeListInclude = {
  organizationUnit: { select: { id: true, nameKh: true } },
  rank: true,
  workHistories: { where: { endDate: null }, take: 1, include: { position: true } },
} satisfies Prisma.EmployeeInclude;

export type EmployeeListRow = Prisma.EmployeeGetPayload<{ include: typeof employeeListInclude }>;

type WorkRow = EmployeeFull['workHistories'][number];

const RELATION_ORDER: string[] = [
  FamilyRelation.SPOUSE,
  FamilyRelation.FATHER,
  FamilyRelation.MOTHER,
];

export function currentPosition(rows: WorkRow[]): CurrentPositionView | null {
  const row = rows.find((w) => !w.endDate);
  if (!row) return null;
  return {
    title: row.position?.nameKh ?? row.positionText ?? '',
    unit: row.unit,
    since: fromDbDate(row.startDate)!,
  };
}

export function locationCodesOf(e: EmployeeFull): {
  birth: LocationCodes;
  address: LocationCodes;
  voter: LocationCodes;
} {
  return {
    birth: {
      provinceCode: e.birthProvinceCode,
      districtCode: e.birthDistrictCode,
      communeCode: e.birthCommuneCode,
      villageCode: e.birthVillageCode,
    },
    address: {
      provinceCode: e.addrProvinceCode,
      districtCode: e.addrDistrictCode,
      communeCode: e.addrCommuneCode,
      villageCode: e.addrVillageCode,
    },
    voter: {
      provinceCode: e.voterRegistration?.provinceCode,
      districtCode: e.voterRegistration?.districtCode,
      communeCode: e.voterRegistration?.communeCode,
      villageCode: e.voterRegistration?.villageCode,
    },
  };
}

/** Sensitive values (IDs, phone numbers) are masked when `mask` is true. */
export function toEmployeeDetail(
  e: EmployeeFull,
  names: Map<string, string>,
  mask: boolean,
): EmployeeDetail {
  const m = (v: string | null) => (mask ? maskValue(v) : v);
  const codes = locationCodesOf(e);
  return {
    id: e.id,
    status: e.status,
    version: e.version,
    masked: mask,
    organizationUnit: e.organizationUnit,
    civilServantId: e.civilServantId,
    nationalIdNo: m(e.nationalIdNo),
    civilServantNo: m(e.civilServantNo),
    hasPhoto: !!e.photoKey,
    nameKh: e.nameKh,
    nameLatin: e.nameLatin,
    gender: e.gender,
    dateOfBirth: fromDbDate(e.dateOfBirth)!,
    nationality: e.nationality,
    birthPlace: LocationsService.toView(codes.birth, names),
    houseNo: e.houseNo,
    streetNo: e.streetNo,
    address: LocationsService.toView(codes.address, names),
    phone1: m(e.phone1),
    phone2: m(e.phone2),
    voterRegistration: e.voterRegistration
      ? {
          voterNo: m(e.voterRegistration.voterNo),
          pollingStation: e.voterRegistration.pollingStation,
          location: LocationsService.toView(codes.voter, names),
          year: e.voterRegistration.year,
        }
      : null,
    civilServiceStartDate: fromDbDate(e.civilServiceStartDate),
    currentPositionStartDate: fromDbDate(e.currentPositionStartDate),
    specialty: e.specialty,
    rank: e.rank,
    rankYear: e.rankYear,
    currentPosition: currentPosition(e.workHistories),
    educations: e.educations.map((x) => ({
      category: x.category,
      levelOrCourse: x.levelOrCourse,
      institution: x.institution,
      certificate: x.certificate,
      startDate: fromDbDate(x.startDate),
      endDate: fromDbDate(x.endDate),
    })),
    workHistories: e.workHistories.map((w) => ({
      sector: w.sector,
      startDate: fromDbDate(w.startDate)!,
      endDate: fromDbDate(w.endDate),
      positionId: w.positionId,
      positionText: w.positionText,
      positionName: w.position?.nameKh ?? w.positionText ?? '',
      ministryOrInstitution: w.ministryOrInstitution,
      unit: w.unit,
    })),
    awards: e.awards.map((a) => ({
      type: a.type,
      documentRef: a.documentRef,
      date: fromDbDate(a.date),
      ministryOrInstitution: a.ministryOrInstitution,
      kind: a.kind,
      form: a.form,
    })),
    familyMembers: [...e.familyMembers]
      .sort((a, b) => RELATION_ORDER.indexOf(a.relation) - RELATION_ORDER.indexOf(b.relation))
      .map((f) => ({
        relation: f.relation,
        name: f.name,
        isAlive: f.isAlive,
        dateOfBirth: fromDbDate(f.dateOfBirth),
        occupation: f.occupation,
        address: f.address,
        birthPlace: f.birthPlace,
        phone1: m(f.phone1),
        phone2: m(f.phone2),
      })),
    childrenFemale: e.childrenFemale,
    childrenMale: e.childrenMale,
    references: e.references.map((r) => ({
      name: r.name,
      gender: r.gender,
      occupation: r.occupation,
      phone: m(r.phone),
      address: r.address,
    })),
    declaredPlace: e.declaredPlace,
    declaredDate: fromDbDate(e.declaredDate),
    submittedAt: e.submittedAt?.toISOString() ?? null,
    verifiedAt: e.verifiedAt?.toISOString() ?? null,
    verifiedBy: e.verifiedBy,
    returnComment: e.returnComment,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export function toEmployeeListItem(e: EmployeeListRow, mask: boolean): EmployeeListItem {
  const m = (v: string | null) => (mask ? maskValue(v) : v);
  const current = e.workHistories[0];
  return {
    id: e.id,
    status: e.status,
    nameKh: e.nameKh,
    nameLatin: e.nameLatin,
    gender: e.gender,
    dateOfBirth: fromDbDate(e.dateOfBirth)!,
    nationalIdNo: m(e.nationalIdNo),
    civilServantNo: m(e.civilServantNo),
    phone1: m(e.phone1),
    organizationUnit: e.organizationUnit,
    rank: e.rank,
    currentPosition: current
      ? {
          title: current.position?.nameKh ?? current.positionText ?? '',
          unit: current.unit,
          since: fromDbDate(current.startDate)!,
        }
      : null,
    updatedAt: e.updatedAt.toISOString(),
  };
}

/** The part of a record that belongs to one form section (used for audit "before"). */
export function sectionSnapshot(d: EmployeeDetail, section: string): unknown {
  switch (section) {
    case 'personal':
      return {
        organizationUnit: d.organizationUnit,
        civilServantId: d.civilServantId,
        nationalIdNo: d.nationalIdNo,
        civilServantNo: d.civilServantNo,
        nameKh: d.nameKh,
        nameLatin: d.nameLatin,
        gender: d.gender,
        dateOfBirth: d.dateOfBirth,
        nationality: d.nationality,
        birthPlace: d.birthPlace,
        houseNo: d.houseNo,
        streetNo: d.streetNo,
        address: d.address,
        phone1: d.phone1,
        phone2: d.phone2,
        voterRegistration: d.voterRegistration,
      };
    case 'education':
      return { educations: d.educations };
    case 'work':
      return {
        civilServiceStartDate: d.civilServiceStartDate,
        currentPositionStartDate: d.currentPositionStartDate,
        specialty: d.specialty,
        rank: d.rank,
        rankYear: d.rankYear,
        workHistories: d.workHistories,
      };
    case 'awards':
      return { awards: d.awards };
    case 'family':
      return {
        familyMembers: d.familyMembers,
        childrenFemale: d.childrenFemale,
        childrenMale: d.childrenMale,
        references: d.references,
        declaredPlace: d.declaredPlace,
        declaredDate: d.declaredDate,
      };
    default:
      return null;
  }
}
