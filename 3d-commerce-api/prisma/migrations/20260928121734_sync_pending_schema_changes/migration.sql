-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_FAILED';

-- AlterTable
ALTER TABLE "SiteSetting" ALTER COLUMN "updatedAt" DROP DEFAULT;
