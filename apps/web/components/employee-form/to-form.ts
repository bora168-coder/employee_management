import type {
  AwardsSectionInput,
  EducationSectionInput,
  EmployeeDetail,
  FamilyMemberView,
  LocationView,
  PersonalSectionInput,
  WorkSectionInput,
} from '@csbms/shared';
import { blank } from '@/lib/utils';

/** Converts API data (with nulls) into form values (with ""). */

const loc = (l?: LocationView | null) => ({
  provinceCode: blank(l?.provinceCode),
  districtCode: blank(l?.districtCode),
  communeCode: blank(l?.communeCode),
  villageCode: blank(l?.villageCode),
});

export function personalToForm(
  e?: EmployeeDetail,
  defaultUnitId?: string | null,
): PersonalSectionInput {
  return {
    organizationUnitId: e?.organizationUnit.id ?? defaultUnitId ?? '',
    civilServantId: blank(e?.civilServantId),
    nationalIdNo: blank(e?.nationalIdNo),
    civilServantNo: blank(e?.civilServantNo),
    nameKh: e?.nameKh ?? '',
    nameLatin: e?.nameLatin ?? '',
    gender: (e?.gender as PersonalSectionInput['gender']) ?? ('' as PersonalSectionInput['gender']),
    dateOfBirth: e?.dateOfBirth ?? '',
    nationality: e?.nationality ?? 'ខ្មែរ',
    birthPlace: loc(e?.birthPlace),
    houseNo: blank(e?.houseNo),
    streetNo: blank(e?.streetNo),
    address: loc(e?.address),
    phone1: blank(e?.phone1),
    phone2: blank(e?.phone2),
    voterRegistration: {
      voterNo: blank(e?.voterRegistration?.voterNo),
      pollingStation: blank(e?.voterRegistration?.pollingStation),
      location: loc(e?.voterRegistration?.location),
      year: blank(e?.voterRegistration?.year),
    },
  };
}

export function educationToForm(e: EmployeeDetail): EducationSectionInput {
  return {
    educations: e.educations.map((x) => ({
      category: x.category as 'GENERAL',
      levelOrCourse: x.levelOrCourse,
      institution: blank(x.institution),
      certificate: blank(x.certificate),
      startDate: blank(x.startDate),
      endDate: blank(x.endDate),
    })),
  };
}

export function workToForm(e: EmployeeDetail): WorkSectionInput {
  return {
    civilServiceStartDate: blank(e.civilServiceStartDate),
    currentPositionStartDate: blank(e.currentPositionStartDate),
    specialty: blank(e.specialty),
    rankId: blank(e.rank?.id),
    rankYear: blank(e.rankYear),
    workHistories: e.workHistories.map((w) => ({
      sector: w.sector as 'MINISTRY_OF_INTERIOR',
      startDate: w.startDate,
      endDate: blank(w.endDate),
      positionId: blank(w.positionId),
      positionText: blank(w.positionText),
      ministryOrInstitution: blank(w.ministryOrInstitution),
      unit: blank(w.unit),
    })),
  };
}

export function awardsToForm(e: EmployeeDetail): AwardsSectionInput {
  return {
    awards: e.awards.map((a) => ({
      type: a.type as 'AWARD',
      documentRef: blank(a.documentRef),
      date: blank(a.date),
      ministryOrInstitution: blank(a.ministryOrInstitution),
      kind: blank(a.kind),
      form: blank(a.form),
    })),
  };
}

export const memberToForm = (m?: FamilyMemberView) => ({
  name: m?.name ?? '',
  isAlive: m?.isAlive ?? true,
  dateOfBirth: blank(m?.dateOfBirth),
  occupation: blank(m?.occupation),
  address: blank(m?.address),
  birthPlace: blank(m?.birthPlace),
  phone1: blank(m?.phone1),
  phone2: blank(m?.phone2),
});

/** true when every value of a voter registration is empty. */
export function isEmptyVoter(v: {
  voterNo?: string | null;
  pollingStation?: string | null;
  year?: number | null;
  location: Record<string, string | null | undefined>;
}): boolean {
  return !v.voterNo && !v.pollingStation && !v.year && !Object.values(v.location).some(Boolean);
}
