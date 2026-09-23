'use client';

import { EmployeeDetail, formatDate } from '@csbms/shared';
import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/misc';

export function StatusBanner({ employee }: { employee: EmployeeDetail }) {
  const t = useTranslations('employees');
  return (
    <div className="space-y-2">
      {employee.status === 'DRAFT' && employee.returnComment && (
        <Alert tone="warning">
          {t('returned')} <b>{employee.returnComment}</b>
        </Alert>
      )}
      {employee.status === 'SUBMITTED' && <Alert tone="info">{t('lockedInfo')}</Alert>}
      {employee.status === 'VERIFIED' && employee.verifiedBy && employee.verifiedAt && (
        <Alert tone="success">
          {t('verifiedInfo', {
            name: employee.verifiedBy.fullName,
            date: formatDate(employee.verifiedAt),
          })}
        </Alert>
      )}
      {employee.masked && <Alert tone="info">{t('masked')}</Alert>}
    </div>
  );
}
