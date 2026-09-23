-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'HR_ADMIN', 'UNIT_HEAD', 'VIEWER');

-- CreateEnum
CREATE TYPE "EducationCategory" AS ENUM ('GENERAL', 'PROFESSIONAL', 'FOREIGN_LANGUAGE', 'ONGOING_TRAINING');

-- CreateEnum
CREATE TYPE "WorkSector" AS ENUM ('MINISTRY_OF_INTERIOR', 'OTHER_PUBLIC', 'PRIVATE_OR_NGO');

-- CreateEnum
CREATE TYPE "AwardType" AS ENUM ('AWARD', 'DISCIPLINE');

-- CreateEnum
CREATE TYPE "FamilyRelation" AS ENUM ('SPOUSE', 'FATHER', 'MOTHER');

-- CreateEnum
CREATE TYPE "AttachmentCategory" AS ENUM ('CERTIFICATE', 'SIGNED_FORM', 'OTHER');

-- CreateTable
CREATE TABLE "province" (
    "code" TEXT NOT NULL,
    "nameKh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,

    CONSTRAINT "province_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "district" (
    "code" TEXT NOT NULL,
    "nameKh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "provinceCode" TEXT NOT NULL,

    CONSTRAINT "district_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "commune" (
    "code" TEXT NOT NULL,
    "nameKh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "districtCode" TEXT NOT NULL,

    CONSTRAINT "commune_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "village" (
    "code" TEXT NOT NULL,
    "nameKh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "communeCode" TEXT NOT NULL,

    CONSTRAINT "village_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "organization_unit" (
    "id" TEXT NOT NULL,
    "nameKh" TEXT NOT NULL,
    "nameEn" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position" (
    "id" TEXT NOT NULL,
    "nameKh" TEXT NOT NULL,
    "nameEn" TEXT,

    CONSTRAINT "position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rank" (
    "id" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "titleKh" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,

    CONSTRAINT "rank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee" (
    "id" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "organizationUnitId" TEXT NOT NULL,
    "civilServantId" TEXT,
    "nationalIdNo" TEXT,
    "civilServantNo" TEXT,
    "photoKey" TEXT,
    "nameKh" TEXT NOT NULL,
    "nameLatin" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "nationality" TEXT NOT NULL DEFAULT 'ខ្មែរ',
    "birthProvinceCode" TEXT,
    "birthDistrictCode" TEXT,
    "birthCommuneCode" TEXT,
    "birthVillageCode" TEXT,
    "houseNo" TEXT,
    "streetNo" TEXT,
    "addrProvinceCode" TEXT,
    "addrDistrictCode" TEXT,
    "addrCommuneCode" TEXT,
    "addrVillageCode" TEXT,
    "phone1" TEXT,
    "phone2" TEXT,
    "civilServiceStartDate" DATE,
    "currentPositionStartDate" DATE,
    "specialty" TEXT,
    "rankId" TEXT,
    "rankYear" INTEGER,
    "childrenFemale" INTEGER NOT NULL DEFAULT 0,
    "childrenMale" INTEGER NOT NULL DEFAULT 0,
    "declaredPlace" TEXT,
    "declaredDate" DATE,
    "submittedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "returnComment" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voter_registration" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "voterNo" TEXT,
    "pollingStation" TEXT,
    "provinceCode" TEXT,
    "districtCode" TEXT,
    "communeCode" TEXT,
    "villageCode" TEXT,
    "year" INTEGER,

    CONSTRAINT "voter_registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "category" "EducationCategory" NOT NULL,
    "levelOrCourse" TEXT NOT NULL,
    "institution" TEXT,
    "certificate" TEXT,
    "startDate" DATE,
    "endDate" DATE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_history" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "sector" "WorkSector" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "positionId" TEXT,
    "positionText" TEXT,
    "ministryOrInstitution" TEXT,
    "unit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "work_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "award_discipline" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "AwardType" NOT NULL,
    "documentRef" TEXT,
    "date" DATE,
    "ministryOrInstitution" TEXT,
    "kind" TEXT,
    "form" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "award_discipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_member" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "relation" "FamilyRelation" NOT NULL,
    "name" TEXT NOT NULL,
    "isAlive" BOOLEAN NOT NULL DEFAULT true,
    "dateOfBirth" DATE,
    "occupation" TEXT,
    "address" TEXT,
    "birthPlace" TEXT,
    "phone1" TEXT,
    "phone2" TEXT,

    CONSTRAINT "family_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_person" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender",
    "occupation" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "reference_person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "category" "AttachmentCategory" NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_user" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "organizationUnitId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "district_provinceCode_idx" ON "district"("provinceCode");

-- CreateIndex
CREATE INDEX "commune_districtCode_idx" ON "commune"("districtCode");

-- CreateIndex
CREATE INDEX "village_communeCode_idx" ON "village"("communeCode");

-- CreateIndex
CREATE INDEX "organization_unit_parentId_idx" ON "organization_unit"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "position_nameKh_key" ON "position"("nameKh");

-- CreateIndex
CREATE UNIQUE INDEX "rank_framework_grade_key" ON "rank"("framework", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "employee_civilServantId_key" ON "employee"("civilServantId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_nationalIdNo_key" ON "employee"("nationalIdNo");

-- CreateIndex
CREATE UNIQUE INDEX "employee_civilServantNo_key" ON "employee"("civilServantNo");

-- CreateIndex
CREATE INDEX "employee_organizationUnitId_idx" ON "employee"("organizationUnitId");

-- CreateIndex
CREATE INDEX "employee_status_idx" ON "employee"("status");

-- CreateIndex
CREATE INDEX "employee_name_kh_trgm_idx" ON "employee" USING GIN ("nameKh" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "employee_name_latin_trgm_idx" ON "employee" USING GIN ("nameLatin" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "voter_registration_employeeId_key" ON "voter_registration"("employeeId");

-- CreateIndex
CREATE INDEX "education_employeeId_idx" ON "education"("employeeId");

-- CreateIndex
CREATE INDEX "work_history_employeeId_idx" ON "work_history"("employeeId");

-- CreateIndex
CREATE INDEX "work_history_positionId_idx" ON "work_history"("positionId");

-- CreateIndex
CREATE INDEX "award_discipline_employeeId_idx" ON "award_discipline"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "family_member_employeeId_relation_key" ON "family_member"("employeeId", "relation");

-- CreateIndex
CREATE INDEX "reference_person_employeeId_idx" ON "reference_person"("employeeId");

-- CreateIndex
CREATE INDEX "attachment_employeeId_idx" ON "attachment"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_username_key" ON "app_user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_tokenHash_key" ON "refresh_token"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_token_userId_idx" ON "refresh_token"("userId");

-- CreateIndex
CREATE INDEX "audit_log_entity_entityId_idx" ON "audit_log"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_log_userId_idx" ON "audit_log"("userId");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- AddForeignKey
ALTER TABLE "district" ADD CONSTRAINT "district_provinceCode_fkey" FOREIGN KEY ("provinceCode") REFERENCES "province"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commune" ADD CONSTRAINT "commune_districtCode_fkey" FOREIGN KEY ("districtCode") REFERENCES "district"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "village" ADD CONSTRAINT "village_communeCode_fkey" FOREIGN KEY ("communeCode") REFERENCES "commune"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_unit" ADD CONSTRAINT "organization_unit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "organization_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "organization_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "rank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voter_registration" ADD CONSTRAINT "voter_registration_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education" ADD CONSTRAINT "education_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_history" ADD CONSTRAINT "work_history_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_history" ADD CONSTRAINT "work_history_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "award_discipline" ADD CONSTRAINT "award_discipline_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_member" ADD CONSTRAINT "family_member_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_person" ADD CONSTRAINT "reference_person_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "organization_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
