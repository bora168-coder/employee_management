'use client';

import { AuditEntryView } from '@csbms/shared';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Alert, EmptyState, Spinner } from '@/components/ui/misc';
import { Table, Td, Th } from '@/components/ui/table';
import { api, ApiError } from '@/lib/api';
import { useEmployee } from '@/lib/hooks';
import { formatDateTime } from '@/lib/utils';

/** Short, readable summary of what changed (section name or status change). */
function describe(entry: AuditEntryView, t: ReturnType<typeof useTranslations>): string {
  const after = (entry.after ?? {}) as Record<string, unknown>;
  const before = (entry.before ?? {}) as Record<string, unknown>;
  if (typeof after.section === 'string')
    return `${t('audit.section')}: ${t(`sections.${after.section}`)}`;
  if (after.status)
    return `${before.status ?? ''} → ${after.status}${after.comment ? ` (${after.comment})` : ''}`;
  if (after.attachment) return String(after.attachment);
  if (before.attachment) return String(before.attachment);
  if (after.photo) return t('employees.photo');
  return '';
}

export default function HistoryPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const { data: employee } = useEmployee(id);
  const { data, isLoading, error } = useQuery({
    queryKey: ['history', id],
    queryFn: () => api<AuditEntryView[]>(`/employees/${id}/history`),
  });

  return (
    <>
      <PageHeader title={t('employees.history')}>
        {employee && (
          <Link href={`/employees/${id}`} className="text-sm text-blue-700 hover:underline">
            {employee.nameKh}
          </Link>
        )}
      </PageHeader>
      {isLoading && <Spinner label={t('common.loading')} />}
      {error && <Alert>{error instanceof ApiError ? error.message : t('common.error')}</Alert>}
      {data && data.length === 0 && <EmptyState>{t('employees.noHistory')}</EmptyState>}
      {data && data.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>{t('audit.when')}</Th>
              <Th>{t('audit.who')}</Th>
              <Th>{t('audit.what')}</Th>
              <Th>{t('audit.details')}</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((e) => (
              <tr key={e.id}>
                <Td className="whitespace-nowrap">{formatDateTime(e.createdAt, locale)}</Td>
                <Td>{e.user?.fullName ?? '—'}</Td>
                <Td>{t.has(`audit.${e.action}`) ? t(`audit.${e.action}`) : e.action}</Td>
                <Td>{describe(e, t)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
