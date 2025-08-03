/*
  Warnings:

  - You are about to drop the column `installmentNumber` on the `PaymentSchedule` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."PaymentSchedule_debtId_installmentNumber_key";

-- AlterTable
ALTER TABLE "public"."PaymentSchedule" DROP COLUMN "installmentNumber";
