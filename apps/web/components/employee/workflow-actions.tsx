'use client';

import { EmployeeDetail } from '@csbms/shared';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileText, History, Pencil, Send, Trash2, Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, buttonClass } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Textarea } from '@/components/ui/form';
import { Alert } from '@/components/ui/misc';
import { api, API_BASE, ApiError } from '@/lib/api';
import { qk, usePermissions } from '@/lib/hooks';

export function WorkflowActions({
  employee,
  showEdit = true,
}: {
  employee: EmployeeDetail;
  showEdit?: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canEdit, canVerify, canSeeHistory } = usePermissions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [comment, setComment] = useState('');

  const run = async (action: 'submit' | 'verify' | 'return', body?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api<EmployeeDetail>(`/employees/${employee.id}/${action}`, {
        method: 'POST',
        body,
      });
      queryClient.setQueryData(qk.employee(employee.id), updated);
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      setReturnOpen(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api(`/employees/${employee.id}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      router.replace('/employees');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <a
          className={buttonClass('secondary')}
          href={`${API_BASE}/employees/${employee.id}/pdf`}
          target="_blank"
          rel="noopener"
        >
          <FileText className="h-4 w-4" /> {t('common.print')}
        </a>
        {showEdit && canEdit && employee.status !== 'SUBMITTED' && (
          <Link className={buttonClass('secondary')} href={`/employees/${employee.id}/edit`}>
            <Pencil className="h-4 w-4" /> {t('common.edit')}
          </Link>
        )}
        {canSeeHistory && (
          <Link className={buttonClass('secondary')} href={`/employees/${employee.id}/history`}>
            <History className="h-4 w-4" /> {t('employees.history')}
          </Link>
        )}
        {canEdit && employee.status === 'DRAFT' && (
          <Button disabled={busy} onClick={() => run('submit')}>
            <Send className="h-4 w-4" /> {t('employees.submit')}
          </Button>
        )}
        {canVerify && employee.status === 'SUBMITTED' && (
          <>
            <Button disabled={busy} onClick={() => run('verify')}>
              <CheckCircle2 className="h-4 w-4" /> {t('employees.verify')}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setReturnOpen(true)}>
              <Undo2 className="h-4 w-4" /> {t('employees.return')}
            </Button>
          </>
        )}
        {canEdit && (
          <Button
            variant="ghost"
            className="text-red-700"
            disabled={busy}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> {t('common.delete')}
          </Button>
        )}
      </div>
      {error && <Alert>{error}</Alert>}

      <Dialog open={returnOpen} onClose={() => setReturnOpen(false)} title={t('employees.return')}>
        <Field label={t('employees.returnComment')} htmlFor="returnComment">
          <Textarea
            id="returnComment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setReturnOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled={busy || !comment.trim()} onClick={() => run('return', { comment })}>
            {t('employees.return')}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t('employees.deleteConfirm')}
      >
        <p className="text-sm text-slate-600">
          {employee.nameKh} ({employee.nameLatin})
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" disabled={busy} onClick={remove}>
            {t('common.delete')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
