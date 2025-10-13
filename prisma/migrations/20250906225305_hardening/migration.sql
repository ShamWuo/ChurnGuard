/*
  Warnings:

  - A unique constraint covering the columns `[stripeInvoiceId,source]` on the table `RecoveryAttribution` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `DunningCase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Settings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DunningCase" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stripeInvoiceId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "amountDue" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastReminderAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DunningCase" ("amountDue", "createdAt", "currency", "id", "lastReminderAt", "status", "stripeCustomerId", "stripeInvoiceId") SELECT "amountDue", "createdAt", "currency", "id", "lastReminderAt", "status", "stripeCustomerId", "stripeInvoiceId" FROM "DunningCase";
DROP TABLE "DunningCase";
ALTER TABLE "new_DunningCase" RENAME TO "DunningCase";
CREATE UNIQUE INDEX "DunningCase_stripeInvoiceId_key" ON "DunningCase"("stripeInvoiceId");
CREATE INDEX "DunningCase_stripeCustomerId_idx" ON "DunningCase"("stripeCustomerId");
CREATE TABLE "new_DunningReminder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dunningCaseId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DunningReminder_dunningCaseId_fkey" FOREIGN KEY ("dunningCaseId") REFERENCES "DunningCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DunningReminder" ("channel", "createdAt", "dunningCaseId", "id") SELECT "channel", "createdAt", "dunningCaseId", "id" FROM "DunningReminder";
DROP TABLE "DunningReminder";
ALTER TABLE "new_DunningReminder" RENAME TO "DunningReminder";
CREATE INDEX "DunningReminder_dunningCaseId_idx" ON "DunningReminder"("dunningCaseId");
CREATE TABLE "new_RetryAttempt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dunningCaseId" INTEGER NOT NULL,
    "attemptNo" INTEGER NOT NULL,
    "runAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "note" TEXT,
    CONSTRAINT "RetryAttempt_dunningCaseId_fkey" FOREIGN KEY ("dunningCaseId") REFERENCES "DunningCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RetryAttempt" ("attemptNo", "dunningCaseId", "id", "note", "runAt", "status") SELECT "attemptNo", "dunningCaseId", "id", "note", "runAt", "status" FROM "RetryAttempt";
DROP TABLE "RetryAttempt";
ALTER TABLE "new_RetryAttempt" RENAME TO "RetryAttempt";
CREATE INDEX "RetryAttempt_dunningCaseId_idx" ON "RetryAttempt"("dunningCaseId");
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "dunningBaseHours" INTEGER,
    "dunningMaxAttempts" INTEGER,
    "safeMode" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("dunningBaseHours", "dunningMaxAttempts", "id", "safeMode") SELECT "dunningBaseHours", "dunningMaxAttempts", "id", "safeMode" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE TABLE "new_Subscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" DATETIME,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Subscription" ("cancelAtPeriodEnd", "currentPeriodEnd", "id", "status", "stripeSubscriptionId", "userId") SELECT "cancelAtPeriodEnd", "currentPeriodEnd", "id", "status", "stripeSubscriptionId", "userId" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "stripeCustomerId") SELECT "createdAt", "email", "id", "stripeCustomerId" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "CspReport_createdAt_idx" ON "CspReport"("createdAt");

-- CreateIndex
CREATE INDEX "RecoveryAttribution_stripeCustomerId_idx" ON "RecoveryAttribution"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryAttribution_stripeInvoiceId_source_key" ON "RecoveryAttribution"("stripeInvoiceId", "source");

-- CreateIndex
CREATE INDEX "StripeEventLog_type_createdAt_idx" ON "StripeEventLog"("type", "createdAt");
