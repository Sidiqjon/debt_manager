/*
  Warnings:

  - You are about to drop the column `isVerified` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `passCode` on the `Seller` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Seller" DROP COLUMN "isVerified",
DROP COLUMN "passCode",
ALTER COLUMN "isActive" SET DEFAULT true;
