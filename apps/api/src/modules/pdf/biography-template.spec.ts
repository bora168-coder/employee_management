import type { EmployeeDetail } from '@csbms/shared';
import { renderBiographyHtml } from './biography-template';

const loc = {
  provinceCode: null,
  districtCode: null,
  communeCode: null,
  villageCode: null,
  label: '',
};

const employee: EmployeeDetail = {
  id: '1',
  status: 'DRAFT',
  version: 1,
  masked: false,
  organizationUnit: { id: 'u', nameKh: 'រដ្ឋបាលស្រុក' },
  civilServantId: null,
  nationalIdNo: '012345678',
  civilServantNo: null,
  hasPhoto: false,
  nameKh: '<script>alert(1)</script>',
  nameLatin: 'TEST',
  gender: 'FEMALE',
  dateOfBirth: '1990-01-15',
  nationality: 'ខ្មែរ',
  birthPlace: loc,
  houseNo: null,
  streetNo: null,
  address: loc,
  phone1: '85512345678',
  phone2: null,
  voterRegistration: null,
  civilServiceStartDate: null,
  currentPositionStartDate: null,
  specialty: null,
  rank: null,
  rankYear: null,
  currentPosition: null,
  educations: [
    {
      category: 'GENERAL',
      levelOrCourse: 'មធ្យមសិក្សា',
      institution: null,
      certificate: null,
      startDate: '2001-10-01',
      endDate: null,
    },
  ],
  workHistories: [],
  awards: [],
  familyMembers: [],
  childrenFemale: 1,
  childrenMale: 2,
  references: [],
  declaredPlace: null,
  declaredDate: null,
  submittedAt: null,
  verifiedAt: null,
  verifiedBy: null,
  returnComment: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('renderBiographyHtml', () => {
  const html = renderBiographyHtml({
    employee,
    photoDataUri: null,
    fontCss: '',
    unitPath: ['ខេត្ត', 'ស្រុក'],
  });

  it('escapes user text', () => {
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('prints Khmer digits and all form sections', () => {
    expect(html).toContain('០១២៣៤៥៦៧៨');
    expect(html).toContain('០១/១០/២០០១');
    expect(html).toContain('ចំនួនកូន : ៣ នាក់');
    for (const s of ['ក- ', 'ខ- ', 'គ- ', 'ឃ- ', 'ង- ']) expect(html).toContain(s);
  });

  it('shows an empty photo box when there is no photo', () => {
    expect(html).toContain('រូបថត');
  });
});
