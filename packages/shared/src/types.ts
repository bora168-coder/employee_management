import type { Role } from './enums';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  organizationUnitId: string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: { field: string; message: string }[];
}

export interface LocationView {
  provinceCode: string | null;
  districtCode: string | null;
  communeCode: string | null;
  villageCode: string | null;
  /** Khmer names joined, e.g. "ភូមិ… ឃុំ… ស្រុក… ខេត្ត…" */
  label: string;
}

export interface NamedRef {
  id: string;
  nameKh: string;
}

export interface RankView {
  id: string;
  framework: string;
  titleKh: string;
  grade: number;
}

export interface CurrentPositionView {
  title: string;
  unit: string | null;
  since: string;
}

export interface EducationView {
  category: string;
  levelOrCourse: string;
  institution: string | null;
  certificate: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface WorkHistoryView {
  sector: string;
  startDate: string;
  endDate: string | null;
  positionId: string | null;
  positionText: string | null;
  /** positionId's name, or positionText */
  positionName: string;
  ministryOrInstitution: string | null;
  unit: string | null;
}

export interface AwardView {
  type: string;
  documentRef: string | null;
  date: string | null;
  ministryOrInstitution: string | null;
  kind: string | null;
  form: string | null;
}

export interface FamilyMemberView {
  relation: string;
  name: string;
  isAlive: boolean;
  dateOfBirth: string | null;
  occupation: string | null;
  address: string | null;
  birthPlace: string | null;
  phone1: string | null;
  phone2: string | null;
}

export interface ReferencePersonView {
  name: string;
  gender: string | null;
  occupation: string | null;
  phone: string | null;
  address: string | null;
}

export interface EmployeeDetail {
  id: string;
  status: string;
  version: number;
  /** true when sensitive fields are masked for the current user */
  masked: boolean;
  organizationUnit: NamedRef;
  civilServantId: string | null;
  nationalIdNo: string | null;
  civilServantNo: string | null;
  hasPhoto: boolean;
  nameKh: string;
  nameLatin: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  birthPlace: LocationView;
  houseNo: string | null;
  streetNo: string | null;
  address: LocationView;
  phone1: string | null;
  phone2: string | null;
  voterRegistration: {
    voterNo: string | null;
    pollingStation: string | null;
    location: LocationView;
    year: number | null;
  } | null;
  civilServiceStartDate: string | null;
  currentPositionStartDate: string | null;
  specialty: string | null;
  rank: RankView | null;
  rankYear: number | null;
  currentPosition: CurrentPositionView | null;
  educations: EducationView[];
  workHistories: WorkHistoryView[];
  awards: AwardView[];
  familyMembers: FamilyMemberView[];
  childrenFemale: number;
  childrenMale: number;
  references: ReferencePersonView[];
  declaredPlace: string | null;
  declaredDate: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  verifiedBy: { id: string; fullName: string } | null;
  returnComment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListItem {
  id: string;
  status: string;
  nameKh: string;
  nameLatin: string;
  gender: string;
  dateOfBirth: string;
  nationalIdNo: string | null;
  civilServantNo: string | null;
  phone1: string | null;
  organizationUnit: NamedRef;
  rank: RankView | null;
  currentPosition: CurrentPositionView | null;
  updatedAt: string;
}

export interface AttachmentView {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  uploadedBy: string | null;
  createdAt: string;
}

export interface AuditEntryView {
  id: string;
  action: string;
  entity: string;
  user: { id: string; fullName: string } | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface OrganizationUnitView {
  id: string;
  nameKh: string;
  nameEn: string | null;
  parentId: string | null;
}

export interface UserView {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  organizationUnit: NamedRef | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CountRow {
  key: string;
  label: string;
  count: number;
}

export interface ReportSummary {
  total: number;
  byStatus: CountRow[];
  byGender: CountRow[];
  byUnit: CountRow[];
  byRank: CountRow[];
  byAge: CountRow[];
}
