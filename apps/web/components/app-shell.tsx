'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  FileBadge,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCog,
  Users,
  UserCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { usePermissions } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { LanguageSwitch } from './language-switch';

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { me, isAdmin } = usePermissions();
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/employees', label: t('nav.employees'), icon: Users },
    ...(isAdmin
      ? [
          { href: '/settings/units', label: t('nav.units'), icon: Building2 },
          { href: '/settings/users', label: t('nav.users'), icon: UserCog },
          { href: '/settings/reference', label: t('nav.reference'), icon: FileBadge },
        ]
      : []),
    { href: '/account', label: t('nav.account'), icon: UserCircle },
  ];

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    queryClient.clear();
    router.replace('/login');
  };

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <div className="min-h-screen md:flex">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 transform border-r border-slate-200 bg-white transition-transform md:static md:translate-x-0 print:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="border-b border-slate-200 p-4">
          <p className="text-sm font-semibold leading-snug text-blue-800">{t('app.name')}</p>
        </div>
        <nav className="space-y-1 p-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm',
                isActive(href)
                  ? 'bg-blue-50 font-medium text-blue-800'
                  : 'text-slate-700 hover:bg-slate-100',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2 print:hidden">
          <button
            className="rounded p-2 hover:bg-slate-100 md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-4">
            <LanguageSwitch />
            {me && (
              <span className="hidden text-sm text-slate-600 sm:inline">
                {me.fullName} · {t(`role.${me.role}`)}
              </span>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1 rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              {t('common.logout')}
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
