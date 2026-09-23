-- DropForeignKey
ALTER TABLE "app_user" DROP CONSTRAINT "app_user_organizationUnitId_fkey";

-- DropForeignKey
ALTER TABLE "employee" DROP CONSTRAINT "employee_rankId_fkey";

-- DropForeignKey
ALTER TABLE "organization_unit" DROP CONSTRAINT "organization_unit_parentId_fkey";

-- DropForeignKey
ALTER TABLE "work_history" DROP CONSTRAINT "work_history_positionId_fkey";

-- AddForeignKey
ALTER TABLE "organization_unit" ADD CONSTRAINT "organization_unit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "organization_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "rank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_history" ADD CONSTRAINT "work_history_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "organization_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
