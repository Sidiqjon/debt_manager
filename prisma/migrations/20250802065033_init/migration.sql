/*
  Warnings:

  - The values [1 yil] on the enum `DeadlinePeriod` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."DeadlinePeriod_new" AS ENUM ('1 oy', '2 oy', '3 oy', '4 oy', '5 oy', '6 oy', '7 oy', '8 oy', '9 oy', '10 oy', '11 oy', '12 oy');
ALTER TABLE "public"."Debt" ALTER COLUMN "deadline" DROP DEFAULT;
ALTER TABLE "public"."Debt" ALTER COLUMN "deadline" TYPE "public"."DeadlinePeriod_new" USING ("deadline"::text::"public"."DeadlinePeriod_new");
ALTER TYPE "public"."DeadlinePeriod" RENAME TO "DeadlinePeriod_old";
ALTER TYPE "public"."DeadlinePeriod_new" RENAME TO "DeadlinePeriod";
DROP TYPE "public"."DeadlinePeriod_old";
ALTER TABLE "public"."Debt" ALTER COLUMN "deadline" SET DEFAULT '12 oy';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Debt" ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "deadline" SET DEFAULT '12 oy';
