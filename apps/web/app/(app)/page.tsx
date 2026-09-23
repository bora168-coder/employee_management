'use client';

import { CountRow, ReportSummary, toKhmerDigits } from '@csbms/shared';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { PageHeader } from '@/components/page-header';
import { Alert, Card, EmptyState, Spinner } from '@/components/ui/misc';
import { api } from '@/lib/api';
import { qk } from '@/lib/hooks';

function Bars({ rows, labelOf }: { rows: CountRow[]; labelOf?: (row: CountRow) => string }) {
  const locale = useLocale();
  const t = useTranslations('common');
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) return <EmptyState>{t('noData')}</EmptyState>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex justify-between text-sm">
            <span>{labelOf ? labelOf(r) : r.label}</span>
            <span className="font-medium">
              {locale === 'km' ? toKhmerDigits(r.count) : r.count}
            </span>
          </div>
          <div className="mt-1 h-2 rounded bg-slate-100">
            <div
              className="h-2 rounded bg-blue-600"
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { data, isLoading, error } = useQuery({
    queryKey: qk.summary,
    queryFn: () => api<ReportSummary>('/reports/summary'),
  });

  return (
    <>
      <PageHeader title={t('dashboard.title')} />
      {isLoading && <Spinner label={t('common.loading')} />}
      {error && <Alert>{t('common.error')}</Alert>}
      {data && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <p className="text-sm text-slate-500">{t('dashboard.total')}</p>
            <p className="text-4xl font-semibold text-blue-800">
              {locale === 'km' ? toKhmerDigits(data.total) : data.total}
            </p>
          </Card>
          <Card title={t('dashboard.byStatus')}>
            <Bars rows={data.byStatus} labelOf={(r) => t(`status.${r.key}`)} />
          </Card>
          <Card title={t('dashboard.byGender')}>
            <Bars rows={data.byGender} labelOf={(r) => t(`gender.${r.key}`)} />
          </Card>
          <Card title={t('dashboard.byUnit')} className="lg:col-span-2">
            <Bars rows={data.byUnit} />
          </Card>
          <Card title={t('dashboard.byAge')}>
            <Bars rows={data.byAge} />
          </Card>
          <Card title={t('dashboard.byRank')} className="lg:col-span-3">
            <Bars rows={data.byRank} />
          </Card>
        </div>
      )}
    </>
  );
}
