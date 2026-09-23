'use client';

import { AttachmentCategory, AttachmentView } from '@csbms/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Trash2, Upload } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/form';
import { Alert, EmptyState, Spinner } from '@/components/ui/misc';
import { Table, Td, Th } from '@/components/ui/table';
import { api, API_BASE, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

export function Attachments({ employeeId, canEdit }: { employeeId: string; canEdit: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>('CERTIFICATE');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = ['attachments', employeeId];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => api<AttachmentView[]>(`/employees/${employeeId}/attachments`),
  });

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: key });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const upload = (file: File) =>
    act(() => {
      const fd = new FormData();
      fd.append('category', category);
      fd.append('file', file);
      return api(`/employees/${employeeId}/attachments`, { method: 'POST', formData: fd });
    });

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="w-auto"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label={t('employees.category')}
          >
            {Object.values(AttachmentCategory).map((c) => (
              <option key={c} value={c}>
                {t(`attachmentCategory.${c}`)}
              </option>
            ))}
          </Select>
          <input
            ref={input}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
            <Upload className="h-4 w-4" /> {busy ? t('common.saving') : t('common.upload')}
          </Button>
          <span className="text-xs text-slate-500">{t('employees.fileHint')}</span>
        </div>
      )}
      {error && <Alert>{error}</Alert>}
      {isLoading ? (
        <Spinner />
      ) : !data?.length ? (
        <EmptyState>{t('common.noData')}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t('employees.fileName')}</Th>
              <Th>{t('employees.category')}</Th>
              <Th>{t('employees.uploadedBy')}</Th>
              <Th>{t('audit.when')}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id}>
                <Td>{a.fileName}</Td>
                <Td>{t(`attachmentCategory.${a.category}`)}</Td>
                <Td>{a.uploadedBy ?? '—'}</Td>
                <Td className="whitespace-nowrap">{formatDateTime(a.createdAt, locale)}</Td>
                <Td className="whitespace-nowrap text-right">
                  <a
                    className="mr-2 inline-flex items-center gap-1 text-blue-700 hover:underline"
                    href={`${API_BASE}/employees/${employeeId}/attachments/${a.id}/download`}
                  >
                    <Download className="h-4 w-4" /> {t('common.download')}
                  </a>
                  {canEdit && (
                    <button
                      className="inline-flex items-center gap-1 text-red-700 hover:underline"
                      disabled={busy}
                      onClick={() =>
                        act(() =>
                          api(`/employees/${employeeId}/attachments/${a.id}`, { method: 'DELETE' }),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" /> {t('common.delete')}
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
