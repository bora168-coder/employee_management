'use client';

import { EmployeeDetail, EmployeeSection, PersonalSection } from '@csbms/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { EmployeePhoto } from '@/components/employee/photo';
import { StatusBanner } from '@/components/employee/status-banner';
import { WorkflowActions } from '@/components/employee/workflow-actions';
import { Button } from '@/components/ui/button';
import { Alert, Card, Spinner } from '@/components/ui/misc';
import { api, ApiError } from '@/lib/api';
import { qk, useEmployee, usePermissions } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { StepAwards } from './step-awards';
import { StepEducation } from './step-education';
import { StepFamily } from './step-family';
import { StepPersonal } from './step-personal';
import { StepWork } from './step-work';

const STEPS = ['personal', 'education', 'work', 'awards', 'family', 'review'] as const;
type Step = (typeof STEPS)[number];

/** New record: only the personal step (it creates the DRAFT), then continue in edit mode. */
export function NewEmployeeWizard() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();

  const create = async (data: PersonalSection) => {
    const created = await api<EmployeeDetail>('/employees', { method: 'POST', body: data });
    queryClient.setQueryData(qk.employee(created.id), created);
    await queryClient.invalidateQueries({ queryKey: ['employees'] });
    router.replace(`/employees/${created.id}/edit?step=education`);
  };

  return (
    <>
      <StepTabs current="personal" onSelect={() => undefined} disabled />
      <Card title={t('sections.personal')}>
        <StepPersonal onSave={create} />
      </Card>
    </>
  );
}

export function EditEmployeeWizard({ id }: { id: string }) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const { canEdit } = usePermissions();
  const { data: employee, isLoading, error, refetch } = useEmployee(id);
  const [stale, setStale] = useState(false);

  const step: Step = STEPS.includes(params.get('step') as Step)
    ? (params.get('step') as Step)
    : 'personal';
  const go = (s: Step) => router.replace(`${pathname}?step=${s}`);
  const next = STEPS[STEPS.indexOf(step) + 1];
  const prev = STEPS[STEPS.indexOf(step) - 1];

  if (isLoading) return <Spinner label={t('common.loading')} />;
  if (error || !employee)
    return <Alert>{error instanceof ApiError ? error.message : t('common.notFound')}</Alert>;

  const readOnly = !canEdit || employee.status === 'SUBMITTED';

  const save = (section: EmployeeSection) => async (data: unknown) => {
    try {
      const updated = await api<EmployeeDetail>(`/employees/${id}/sections/${section}`, {
        method: 'PUT',
        body: { version: employee.version, data },
      });
      queryClient.setQueryData(qk.employee(id), updated);
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      if (next) go(next);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'STALE_VERSION') setStale(true);
      throw e;
    }
  };

  const reload = async () => {
    await refetch();
    setStale(false);
  };

  // Remount a step when the record version changes, so it shows the latest data.
  const key = `${step}-${employee.version}`;
  const stepProps = { employee, readOnly, onBack: prev ? () => go(prev) : undefined };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{employee.nameKh}</h1>
          <p className="text-sm text-slate-500">{employee.nameLatin}</p>
        </div>
      </div>
      <StatusBanner employee={employee} />
      {employee.status === 'VERIFIED' && !readOnly && (
        <Alert tone="warning">{t('employees.editVerifiedWarning')}</Alert>
      )}
      {stale && (
        <Alert tone="warning">
          {t('employees.stale')}{' '}
          <Button size="sm" variant="secondary" onClick={reload}>
            {t('common.reload')}
          </Button>
        </Alert>
      )}

      <StepTabs current={step} onSelect={go} />

      <Card title={t(`sections.${step}`)}>
        {step === 'personal' && <StepPersonal key={key} {...stepProps} onSave={save('personal')} />}
        {step === 'education' && (
          <StepEducation key={key} {...stepProps} onSave={save('education')} />
        )}
        {step === 'work' && <StepWork key={key} {...stepProps} onSave={save('work')} />}
        {step === 'awards' && <StepAwards key={key} {...stepProps} onSave={save('awards')} />}
        {step === 'family' && <StepFamily key={key} {...stepProps} onSave={save('family')} />}
        {step === 'review' && (
          <div className="flex flex-col gap-6 md:flex-row">
            <EmployeePhoto employee={employee} canUpload={!readOnly} />
            <div className="flex-1 space-y-4">
              <ul className="space-y-1 text-sm">
                <li>
                  {t('sections.education')}: {employee.educations.length}
                </li>
                <li>
                  {t('sections.work')}: {employee.workHistories.length}
                </li>
                <li>
                  {t('sections.awards')}: {employee.awards.length}
                </li>
                <li>
                  {t('sections.family')}: {employee.familyMembers.length}
                </li>
              </ul>
              <WorkflowActions employee={employee} showEdit={false} />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => go('family')}>
                  {t('common.back')}
                </Button>
                <Button variant="secondary" onClick={() => router.push(`/employees/${id}`)}>
                  {t('common.close')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function StepTabs({
  current,
  onSelect,
  disabled,
}: {
  current: Step;
  onSelect: (s: Step) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('sections');
  return (
    <nav
      className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1"
      aria-label="Steps"
    >
      {STEPS.map((s, i) => (
        <button
          key={s}
          type="button"
          disabled={disabled && s !== current}
          onClick={() => onSelect(s)}
          aria-current={s === current ? 'step' : undefined}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm',
            s === current
              ? 'bg-blue-700 text-white'
              : 'text-slate-700 hover:bg-slate-100 disabled:text-slate-400 disabled:hover:bg-transparent',
          )}
        >
          {i + 1}. {t(s)}
        </button>
      ))}
    </nav>
  );
}
