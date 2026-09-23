'use client';

import { AwardType, EmployeeDetail, formatDate, formatPhone } from '@csbms/shared';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Card, DataList, EmptyState } from '@/components/ui/misc';
import { Table, Td, Th } from '@/components/ui/table';
import { usePermissions } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Attachments } from './attachments';

const phone = (v: string | null) => (v ? (v.includes('•') ? v : formatPhone(v)) : '');
const range = (a: string | null, b: string | null) =>
  `${formatDate(a) || '…'} – ${formatDate(b) || '…'}`;

const TABS = ['personal', 'education', 'work', 'awards', 'family', 'documents'] as const;

/** Read-only view of every section of the biography. */
export function EmployeeProfile({ employee: e }: { employee: EmployeeDetail }) {
  const t = useTranslations();
  const { canEdit } = usePermissions();
  const [tab, setTab] = useState<(typeof TABS)[number]>('personal');

  const tabLabel = (k: (typeof TABS)[number]) =>
    k === 'documents' ? t('employees.documents') : t(`sections.${k}`);

  const content: Record<(typeof TABS)[number], ReactNode> = {
    personal: (
      <div className="space-y-6">
        <DataList
          items={[
            [t('field.civilServantId'), e.civilServantId],
            [t('field.nationalIdNo'), e.nationalIdNo],
            [t('field.civilServantNo'), e.civilServantNo],
            [t('field.organizationUnit'), e.organizationUnit.nameKh],
            [t('field.gender'), t(`gender.${e.gender}`)],
            [t('field.dateOfBirth'), formatDate(e.dateOfBirth)],
            [t('field.nationality'), e.nationality],
            [t('field.birthPlace'), e.birthPlace.label],
            [
              t('field.address'),
              [
                e.houseNo && `${t('field.houseNo')} ${e.houseNo}`,
                e.streetNo && `${t('field.streetNo')} ${e.streetNo}`,
                e.address.label,
              ]
                .filter(Boolean)
                .join(', '),
            ],
            [t('field.phone'), [phone(e.phone1), phone(e.phone2)].filter(Boolean).join(' / ')],
          ]}
        />
        <div>
          <h3 className="mb-2 text-sm font-semibold">{t('sections.voter')}</h3>
          <DataList
            items={[
              [t('field.voterNo'), e.voterRegistration?.voterNo],
              [t('field.pollingStation'), e.voterRegistration?.pollingStation],
              [t('field.voterLocation'), e.voterRegistration?.location.label],
              [t('field.year'), e.voterRegistration?.year],
            ]}
          />
        </div>
      </div>
    ),
    education: e.educations.length ? (
      <Table>
        <thead>
          <tr>
            <Th>{t('field.category')}</Th>
            <Th>{t('field.levelOrCourse')}</Th>
            <Th>{t('field.institution')}</Th>
            <Th>{t('field.certificate')}</Th>
            <Th>{t('field.date')}</Th>
          </tr>
        </thead>
        <tbody>
          {e.educations.map((x, i) => (
            <tr key={i}>
              <Td>{t(`educationCategory.${x.category}`)}</Td>
              <Td>{x.levelOrCourse}</Td>
              <Td>{x.institution}</Td>
              <Td>{x.certificate}</Td>
              <Td className="whitespace-nowrap">{range(x.startDate, x.endDate)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    ) : (
      <EmptyState>{t('common.noData')}</EmptyState>
    ),
    work: (
      <div className="space-y-4">
        <DataList
          items={[
            [t('field.civilServiceStartDate'), formatDate(e.civilServiceStartDate)],
            [
              t('field.currentPositionStartDate'),
              formatDate(e.currentPositionStartDate ?? e.currentPosition?.since),
            ],
            [t('field.currentPosition'), e.currentPosition?.title],
            [t('field.unit'), e.currentPosition?.unit],
            [t('field.specialty'), e.specialty],
            [
              t('field.rank'),
              e.rank
                ? `${e.rank.framework} · ${e.rank.titleKh} · ${e.rank.grade}${e.rankYear ? ` (${e.rankYear})` : ''}`
                : '',
            ],
          ]}
        />
        {e.workHistories.length > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>{t('field.date')}</Th>
                <Th>{t('field.position')}</Th>
                <Th>{t('field.ministryOrInstitution')}</Th>
                <Th>{t('field.unit')}</Th>
                <Th>{t('field.sector')}</Th>
              </tr>
            </thead>
            <tbody>
              {e.workHistories.map((w, i) => (
                <tr key={i}>
                  <Td className="whitespace-nowrap">{range(w.startDate, w.endDate)}</Td>
                  <Td>{w.positionName}</Td>
                  <Td>{w.ministryOrInstitution}</Td>
                  <Td>{w.unit}</Td>
                  <Td>{t(`workSector.${w.sector}`)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    ),
    awards: e.awards.length ? (
      <Table>
        <thead>
          <tr>
            <Th>{t('field.type')}</Th>
            <Th>{t('field.documentRef')}</Th>
            <Th>{t('field.date')}</Th>
            <Th>{t('field.ministryOrInstitution')}</Th>
            <Th>{t('field.kind')}</Th>
            <Th>{t('field.form')}</Th>
          </tr>
        </thead>
        <tbody>
          {e.awards.map((a, i) => (
            <tr key={i} className={a.type === AwardType.DISCIPLINE ? 'bg-red-50' : ''}>
              <Td>{t(`awardType.${a.type}`)}</Td>
              <Td>{a.documentRef}</Td>
              <Td>{formatDate(a.date)}</Td>
              <Td>{a.ministryOrInstitution}</Td>
              <Td>{a.kind}</Td>
              <Td>{a.form}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    ) : (
      <EmptyState>{t('common.noData')}</EmptyState>
    ),
    family: (
      <div className="space-y-4">
        {e.familyMembers.map((m) => (
          <div key={m.relation}>
            <h3 className="mb-2 text-sm font-semibold">{t(`relation.${m.relation}`)}</h3>
            <DataList
              items={[
                [
                  t('field.name'),
                  `${m.name} (${m.isAlive ? t('field.alive') : t('field.deceased')})`,
                ],
                [t('field.dateOfBirth'), formatDate(m.dateOfBirth)],
                [t('field.occupation'), m.occupation],
                [
                  m.relation === 'SPOUSE' ? t('field.address') : t('field.birthPlace'),
                  m.relation === 'SPOUSE' ? m.address : m.birthPlace,
                ],
                ...(m.relation === 'SPOUSE'
                  ? [
                      [
                        t('field.phone'),
                        [phone(m.phone1), phone(m.phone2)].filter(Boolean).join(' / '),
                      ] as [string, string],
                    ]
                  : []),
              ]}
            />
          </div>
        ))}
        <DataList
          items={[
            [t('field.childrenFemale'), String(e.childrenFemale)],
            [t('field.childrenMale'), String(e.childrenMale)],
          ]}
        />
        {e.references.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">{t('sections.references')}</h3>
            <ul className="list-disc pl-5 text-sm">
              {e.references.map((r, i) => (
                <li key={i}>
                  {r.name}
                  {r.gender && ` · ${t(`gender.${r.gender}`)}`}
                  {r.occupation && ` · ${r.occupation}`}
                  {r.phone && ` · ${phone(r.phone)}`}
                  {r.address && ` · ${r.address}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    ),
    documents: <Attachments employeeId={e.id} canEdit={canEdit} />,
  };

  return (
    <Card>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200" role="tablist">
        {TABS.map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm',
              tab === k
                ? 'border-blue-700 font-medium text-blue-800'
                : 'border-transparent text-slate-600 hover:text-slate-900',
            )}
          >
            {tabLabel(k)}
          </button>
        ))}
      </div>
      {content[tab]}
    </Card>
  );
}
