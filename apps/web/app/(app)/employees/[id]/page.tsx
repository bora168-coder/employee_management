'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { EmployeePhoto } from '@/components/employee/photo';
import { EmployeeProfile } from '@/components/employee/profile';
import { StatusBanner } from '@/components/employee/status-banner';
import { WorkflowActions } from '@/components/employee/workflow-actions';
import { Alert, Badge, Spinner } from '@/components/ui/misc';
import { ApiError } from '@/lib/api';
import { useEmployee, usePermissions } from '@/lib/hooks';

export default function EmployeePage() {
  const t = useTranslations();
  const { id } = useParams<{ id: string }>();
  const { data: employee, isLoading, error } = useEmployee(id);
  const { canEdit } = usePermissions();

  if (isLoading) return <Spinner label={t('common.loading')} />;
  if (error || !employee)
    return <Alert>{error instanceof ApiError ? error.message : t('common.notFound')}</Alert>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 md:flex-row">
        <EmployeePhoto employee={employee} canUpload={canEdit && employee.status !== 'SUBMITTED'} />
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{employee.nameKh}</h1>
            <Badge tone={employee.status}>{t(`status.${employee.status}`)}</Badge>
          </div>
          <p className="text-sm text-slate-600">
            {employee.nameLatin} · {employee.currentPosition?.title ?? '—'} ·{' '}
            {employee.organizationUnit.nameKh}
          </p>
          <StatusBanner employee={employee} />
          <WorkflowActions employee={employee} />
        </div>
      </div>
      <EmployeeProfile employee={employee} />
    </div>
  );
}
