'use client';

import type { ReactNode } from 'react';
import { EmployeeForbidden } from '@/components/employee/forbidden';
import { Spinner } from '@/components/ui/misc';
import { usePermissions } from '@/lib/hooks';

/** Hides admin pages from other roles (the API also blocks them). */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { me, isAdmin } = usePermissions();
  if (!me) return <Spinner />;
  return isAdmin ? <>{children}</> : <EmployeeForbidden />;
}
