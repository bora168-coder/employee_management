'use client';

import { EmployeeDetail } from '@csbms/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api, API_BASE, ApiError } from '@/lib/api';
import { qk } from '@/lib/hooks';

export function EmployeePhoto({
  employee,
  canUpload,
}: {
  employee: EmployeeDetail;
  canUpload: boolean;
}) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api(`/employees/${employee.id}/photo`, { method: 'POST', formData: fd });
      await queryClient.invalidateQueries({ queryKey: qk.employee(employee.id) });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="w-32 space-y-2">
      <div className="flex h-48 w-32 items-center justify-center overflow-hidden rounded border border-slate-300 bg-slate-100">
        {employee.hasPhoto ? (
          <img
            src={`${API_BASE}/employees/${employee.id}/photo?v=${employee.version}`}
            alt={employee.nameKh}
            className="h-full w-full object-cover"
          />
        ) : (
          <UserRound className="h-12 w-12 text-slate-400" aria-label={t('employees.photo')} />
        )}
      </div>
      {canUpload && (
        <>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <Camera className="h-4 w-4" />
            {busy ? t('common.saving') : t('employees.changePhoto')}
          </Button>
          <p className="text-xs text-slate-500">{t('employees.photoHint')}</p>
        </>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
