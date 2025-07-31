-- CreateEnum
CREATE TYPE "public"."AdminRole" AS ENUM ('SUPER', 'ADMIN');

-- AlterTable
ALTER TABLE "public"."Admin" ADD COLUMN     "role" "public"."AdminRole" NOT NULL DEFAULT 'ADMIN';
