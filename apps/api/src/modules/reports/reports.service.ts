import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AuthUser,
  CountRow,
  EmployeeListQuery,
  formatDate,
  formatPhone,
  ReportSummary,
  yearsBetween,
} from '@csbms/shared';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { employeeListInclude, toEmployeeListItem } from '../employees/employee.mapper';
import { EmployeesService, shouldMask } from '../employees/employees.service';

export const EXPORT_MAX_ROWS = 10_000;

const STATUS_KH: Record<string, string> = {
  DRAFT: 'សេចក្តីព្រាង',
  SUBMITTED: 'រង់ចាំបញ្ជាក់',
  VERIFIED: 'បានបញ្ជាក់',
};
const GENDER_KH: Record<string, string> = { MALE: 'ប្រុស', FEMALE: 'ស្រី' };
const AGE_BUCKETS: [string, number, number][] = [
  ['<30', 0, 29],
  ['30-39', 30, 39],
  ['40-49', 40, 49],
  ['50-59', 50, 59],
  ['60+', 60, 200],
];

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employees: EmployeesService,
    private readonly audit: AuditService,
  ) {}

  async summary(user: AuthUser): Promise<ReportSummary> {
    const where = await this.employees.listWhere({}, user);

    const [total, byStatus, byGender, byUnit, byRank, births] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.employee.groupBy({ by: ['gender'], where, _count: { _all: true } }),
      this.prisma.employee.groupBy({ by: ['organizationUnitId'], where, _count: { _all: true } }),
      this.prisma.employee.groupBy({ by: ['rankId'], where, _count: { _all: true } }),
      this.prisma.employee.findMany({ where, select: { dateOfBirth: true } }),
    ]);

    const [units, ranks] = await Promise.all([
      this.prisma.organizationUnit.findMany({
        where: { id: { in: byUnit.map((u) => u.organizationUnitId) } },
        select: { id: true, nameKh: true },
      }),
      this.prisma.rank.findMany({
        where: { id: { in: byRank.map((r) => r.rankId).filter((v): v is string => !!v) } },
      }),
    ]);
    const unitName = new Map(units.map((u) => [u.id, u.nameKh]));
    const rankName = new Map(ranks.map((r) => [r.id, `${r.framework} ${r.titleKh}`]));

    const ages = births.map((b) => yearsBetween(b.dateOfBirth));
    const sortDesc = (rows: CountRow[]) => rows.sort((a, b) => b.count - a.count);

    return {
      total,
      byStatus: byStatus.map((r) => ({
        key: r.status,
        label: STATUS_KH[r.status] ?? r.status,
        count: r._count._all,
      })),
      byGender: byGender.map((r) => ({
        key: r.gender,
        label: GENDER_KH[r.gender] ?? r.gender,
        count: r._count._all,
      })),
      byUnit: sortDesc(
        byUnit.map((r) => ({
          key: r.organizationUnitId,
          label: unitName.get(r.organizationUnitId) ?? '?',
          count: r._count._all,
        })),
      ),
      byRank: sortDesc(
        byRank.map((r) => ({
          key: r.rankId ?? 'none',
          label: r.rankId ? (rankName.get(r.rankId) ?? '?') : 'មិនទាន់កំណត់',
          count: r._count._all,
        })),
      ),
      byAge: AGE_BUCKETS.map(([label, min, max]) => ({
        key: label,
        label,
        count: ages.filter((a) => a >= min && a <= max).length,
      })),
    };
  }

  async exportExcel(query: EmployeeListQuery, user: AuthUser, ip: string | null): Promise<Buffer> {
    const where: Prisma.EmployeeWhereInput = await this.employees.listWhere(query, user);
    const rows = await this.prisma.employee.findMany({
      where,
      include: employeeListInclude,
      orderBy: { [query.sort]: query.order },
      take: EXPORT_MAX_ROWS,
    });
    const items = rows.map((r) => toEmployeeListItem(r, shouldMask(user)));

    const wb = new ExcelJS.Workbook();
    wb.creator = 'CSBMS';
    const ws = wb.addWorksheet('Employees');
    ws.columns = [
      { header: 'ល.រ', key: 'no', width: 6 },
      { header: 'គោត្តនាម និងនាម', key: 'nameKh', width: 24 },
      { header: 'Latin name', key: 'nameLatin', width: 24 },
      { header: 'ភេទ', key: 'gender', width: 8 },
      { header: 'ថ្ងៃខែឆ្នាំកំណើត', key: 'dob', width: 14 },
      { header: 'អត្តសញ្ញាណប័ណ្ណ', key: 'nid', width: 16 },
      { header: 'អត្តលេខមន្ត្រីរាជការ', key: 'csn', width: 18 },
      { header: 'មុខតំណែង', key: 'position', width: 26 },
      { header: 'អង្គភាព', key: 'unit', width: 26 },
      { header: 'ក្របខ័ណ្ឌ', key: 'rank', width: 22 },
      { header: 'ទូរស័ព្ទ', key: 'phone', width: 16 },
      { header: 'ស្ថានភាព', key: 'status', width: 14 },
    ];
    ws.getRow(1).font = { bold: true };
    items.forEach((e, i) =>
      ws.addRow({
        no: i + 1,
        nameKh: e.nameKh,
        nameLatin: e.nameLatin,
        gender: GENDER_KH[e.gender] ?? e.gender,
        dob: formatDate(e.dateOfBirth),
        nid: e.nationalIdNo ?? '',
        csn: e.civilServantNo ?? '',
        position: e.currentPosition?.title ?? '',
        unit: e.organizationUnit.nameKh,
        rank: e.rank ? `${e.rank.framework} ${e.rank.titleKh}` : '',
        phone: e.phone1?.includes('•') ? e.phone1 : formatPhone(e.phone1),
        status: STATUS_KH[e.status] ?? e.status,
      }),
    );
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    await this.audit.log({
      userId: user.id,
      action: 'EXPORT',
      entity: 'Employee',
      entityId: '*',
      after: { rows: items.length, filters: query },
      ip,
    });
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
