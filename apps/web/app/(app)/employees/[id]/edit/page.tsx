'use client';

import { useParams } from 'next/navigation';
import { Suspense } from 'react';
import { EditEmployeeWizard } from '@/components/employee-form/wizard';

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense>
      <EditEmployeeWizard id={id} />
    </Suspense>
  );
}
