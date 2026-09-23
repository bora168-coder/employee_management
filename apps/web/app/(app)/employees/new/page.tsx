'use client';

import { useTranslations } from 'next-intl';
import { EmployeeForbidden } from '@/components/employee/forbidden';
import { NewEmployeeWizard } from '@/components/employee-form/wizard';
import { PageHeader } from '@/components/page-header';
import { usePermissions } from '@/lib/hooks';

export default function NewEmployeePage() {
  const t = useTranslations('employees');
  const { me, canEdit } = usePermissions();
  if (me && !canEdit) return <EmployeeForbidden />;
  return (
    <div className="space-y-4">
      <PageHeader title={t('newTitle')} />
      <NewEmployeeWizard />
    </div>
  );
}
