'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AuthUser,
  EmployeeDetail,
  OrganizationUnitView,
  RankView,
  Role,
  ROLES_THAT_CAN_EDIT,
  ROLES_THAT_CAN_VERIFY,
} from '@csbms/shared';
import { api } from './api';

export interface PositionView {
  id: string;
  nameKh: string;
  nameEn: string | null;
}

export interface LocationOption {
  code: string;
  nameKh: string;
  nameEn: string;
}

export const qk = {
  me: ['me'] as const,
  employee: (id: string) => ['employee', id] as const,
  employees: (params: unknown) => ['employees', params] as const,
  units: ['units'] as const,
  positions: ['positions'] as const,
  ranks: ['ranks'] as const,
  users: ['users'] as const,
  summary: ['summary'] as const,
};

export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: () => api<AuthUser>('/auth/me'),
    staleTime: 5 * 60_000,
  });
}

export function usePermissions() {
  const { data: me } = useMe();
  const role = me?.role;
  return {
    me,
    canEdit: !!role && ROLES_THAT_CAN_EDIT.includes(role),
    canVerify: !!role && ROLES_THAT_CAN_VERIFY.includes(role),
    isAdmin: role === Role.SUPER_ADMIN,
    canSeeHistory: !!role && role !== Role.VIEWER,
  };
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: qk.employee(id),
    queryFn: () => api<EmployeeDetail>(`/employees/${id}`),
  });
}

export function useUnits() {
  return useQuery({
    queryKey: qk.units,
    queryFn: () => api<OrganizationUnitView[]>('/organization-units'),
  });
}

export function usePositions() {
  return useQuery({ queryKey: qk.positions, queryFn: () => api<PositionView[]>('/positions') });
}

export function useRanks() {
  return useQuery({ queryKey: qk.ranks, queryFn: () => api<RankView[]>('/ranks') });
}

export function useLocations(
  level: 'provinces' | 'districts' | 'communes' | 'villages',
  parent?: string | null,
) {
  const path =
    level === 'provinces'
      ? '/locations/provinces'
      : level === 'districts'
        ? `/locations/provinces/${parent}/districts`
        : level === 'communes'
          ? `/locations/districts/${parent}/communes`
          : `/locations/communes/${parent}/villages`;
  return useQuery({
    queryKey: ['locations', level, parent ?? null],
    queryFn: () => api<LocationOption[]>(path),
    enabled: level === 'provinces' || !!parent,
    staleTime: 60 * 60_000,
  });
}

/** Units sorted as a tree with their depth, for select boxes and the settings page. */
export function unitTree(
  units: OrganizationUnitView[],
): (OrganizationUnitView & { depth: number })[] {
  const ids = new Set(units.map((u) => u.id));
  const byParent = new Map<string | null, OrganizationUnitView[]>();
  for (const u of units) {
    const parent = u.parentId && ids.has(u.parentId) ? u.parentId : null;
    byParent.set(parent, [...(byParent.get(parent) ?? []), u]);
  }
  const out: (OrganizationUnitView & { depth: number })[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const u of byParent.get(parent) ?? []) {
      out.push({ ...u, depth });
      walk(u.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
