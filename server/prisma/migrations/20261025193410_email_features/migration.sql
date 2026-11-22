-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailMorningBriefing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailTaskAdded" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordResetTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetTokenHash" TEXT,
ADD COLUMN     "verificationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "verificationTokenHash" TEXT;
