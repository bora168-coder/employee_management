'use client';

import { EmployeeListItem, formatDate, Paginated } from '@csbms/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button, buttonClass } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/form';
import { Alert, Badge, EmptyState, Spinner } from '@/components/ui/misc';
import { Table, Td, Th } from '@/components/ui/table';
import { api, buildUrl } from '@/lib/api';
import { qk, unitTree, usePermissions, useRanks, useUnits } from '@/lib/hooks';

const FILTERS = ['search', 'organizationUnitId', 'status', 'gender', 'rankId', 'page'] as const;

function EmployeeList() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { canEdit, canSeeHistory } = usePermissions();
  const { data: units } = useUnits();
  const { data: ranks } = useRanks();

  // Filters live in the URL, so the page can be bookmarked and "Back" works.
  const query = Object.fromEntries(FILTERS.map((k) => [k, params.get(k) ?? ''])) as Record<
    (typeof FILTERS)[number],
    string
  >;
  const [search, setSearch] = useState(query.search);
  useEffect(() => setSearch(query.search), [query.search]);

  const setFilter = (changes: Partial<typeof query>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries({ ...changes, page: changes.page ?? '' })) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${pathname}?${next.toString()}`);
  };

  const listQuery = { ...query, page: query.page || '1', pageSize: '20' };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: qk.employees(listQuery),
    queryFn: () => api<Paginated<EmployeeListItem>>('/employees', { query: listQuery }),
    placeholderData: keepPreviousData,
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHeader
        title={t('employees.title')}
        actions={
          <>
            {canSeeHistory && (
              <a
                className={buttonClass('secondary')}
                href={buildUrl('/reports/employees.xlsx', { ...query, page: undefined })}
              >
                <Download className="h-4 w-4" />
                {t('common.export')}
              </a>
            )}
            {canEdit && (
              <Link className={buttonClass()} href="/employees/new">
                <Plus className="h-4 w-4" />
                {t('employees.new')}
              </Link>
            )}
          </>
        }
      />

      <div className="mb-4 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-6">
        <form
          className="flex gap-2 md:col-span-2"
          onSubmit={(e) => {
            e.preventDefault();
            setFilter({ search });
          }}
        >
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('employees.searchPlaceholder')}
            aria-label={t('common.search')}
          />
          <Button type="submit" variant="secondary" aria-label={t('common.search')}>
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <Select
          aria-label={t('field.organizationUnit')}
          value={query.organizationUnitId}
          onChange={(e) => setFilter({ organizationUnitId: e.target.value })}
        >
          <option value="">
            {t('field.organizationUnit')}: {t('common.all')}
          </option>
          {unitTree(units ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {' '.repeat(u.depth * 3)}
              {u.nameKh}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('field.status')}
          value={query.status}
          onChange={(e) => setFilter({ status: e.target.value })}
        >
          <option value="">
            {t('field.status')}: {t('common.all')}
          </option>
          {(['DRAFT', 'SUBMITTED', 'VERIFIED'] as const).map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('field.gender')}
          value={query.gender}
          onChange={(e) => setFilter({ gender: e.target.value })}
        >
          <option value="">
            {t('field.gender')}: {t('common.all')}
          </option>
          <option value="MALE">{t('gender.MALE')}</option>
          <option value="FEMALE">{t('gender.FEMALE')}</option>
        </Select>
        <Select
          aria-label={t('field.rank')}
          value={query.rankId}
          onChange={(e) => setFilter({ rankId: e.target.value })}
        >
          <option value="">
            {t('field.rank')}: {t('common.all')}
          </option>
          {ranks?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.framework} {r.titleKh}
            </option>
          ))}
        </Select>
      </div>

      {error && <Alert>{t('common.error')}</Alert>}
      {isLoading ? (
        <Spinner label={t('common.loading')} />
      ) : data && data.items.length === 0 ? (
        <EmptyState>{t('common.noData')}</EmptyState>
      ) : data ? (
        <div className={isFetching ? 'opacity-60' : ''}>
          <Table>
            <thead>
              <tr>
                <Th>{t('employees.name')}</Th>
                <Th>{t('field.gender')}</Th>
                <Th>{t('field.dateOfBirth')}</Th>
                <Th>{t('employees.position')}</Th>
                <Th>{t('employees.unit')}</Th>
                <Th>{t('field.nationalIdNo')}</Th>
                <Th>{t('field.status')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <Td>
                    <Link
                      href={`/employees/${e.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {e.nameKh}
                    </Link>
                    <div className="text-xs text-slate-500">{e.nameLatin}</div>
                  </Td>
                  <Td>{t(`gender.${e.gender}`)}</Td>
                  <Td className="whitespace-nowrap">{formatDate(e.dateOfBirth)}</Td>
                  <Td>{e.currentPosition?.title ?? '—'}</Td>
                  <Td>{e.organizationUnit.nameKh}</Td>
                  <Td className="whitespace-nowrap">{e.nationalIdNo ?? '—'}</Td>
                  <Td>
                    <Badge tone={e.status}>{t(`status.${e.status}`)}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
            <span>{t('common.total', { count: data.total })}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => setFilter({ page: String(data.page - 1) })}
              >
                {t('common.previous')}
              </Button>
              <span>{t('common.page', { page: data.page, pages })}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={data.page >= pages}
                onClick={() => setFilter({ page: String(data.page + 1) })}
              >
                {t('common.next')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function EmployeesPage() {
  return (
    <Suspense>
      <EmployeeList />
    </Suspense>
  );
}
