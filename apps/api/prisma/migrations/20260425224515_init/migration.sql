/*
  Warnings:

  - Added the required column `updatedAt` to the `Address` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "brand" TEXT,
    "last4" TEXT,
    "holderName" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HelpTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "preferredContact" TEXT NOT NULL DEFAULT 'SYSTEM',
    "contactPhone" TEXT,
    "contactWhatsapp" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "closedAt" DATETIME,
    CONSTRAINT "HelpTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HelpTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HelpTicketMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT,
    "body" TEXT NOT NULL,
    "fromStaff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HelpTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "HelpTicket" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HelpTicketMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Address" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "province" TEXT,
    "city" TEXT,
    "line1" TEXT NOT NULL,
    "zip" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Address" ("city", "country", "id", "isDefault", "line1", "province", "userId", "zip") SELECT "city", "country", "id", "isDefault", "line1", "province", "userId", "zip" FROM "Address";
DROP TABLE "Address";
ALTER TABLE "new_Address" RENAME TO "Address";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "phone" TEXT,
    "whatsapp" TEXT,
    "preferredContact" TEXT NOT NULL DEFAULT 'SYSTEM',
    "country" TEXT NOT NULL DEFAULT 'RD',
    "region" TEXT,
    "language" TEXT NOT NULL DEFAULT 'es',
    "currency" TEXT NOT NULL DEFAULT 'DOP',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedReason" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("blocked", "blockedReason", "createdAt", "email", "failedLoginAttempts", "id", "isVerified", "lockedUntil", "name", "passwordHash", "role", "twoFactorEmailEnabled", "updatedAt") SELECT "blocked", "blockedReason", "createdAt", "email", "failedLoginAttempts", "id", "isVerified", "lockedUntil", "name", "passwordHash", "role", "twoFactorEmailEnabled", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Role_slug_key" ON "Role"("slug");

-- CreateIndex
CREATE INDEX "RolePermission_permission_idx" ON "RolePermission"("permission");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permission_key" ON "RolePermission"("roleId", "permission");

-- CreateIndex
CREATE INDEX "PaymentMethod_userId_idx" ON "PaymentMethod"("userId");

-- CreateIndex
CREATE INDEX "HelpTicket_userId_idx" ON "HelpTicket"("userId");

-- CreateIndex
CREATE INDEX "HelpTicket_assignedToId_idx" ON "HelpTicket"("assignedToId");

-- CreateIndex
CREATE INDEX "HelpTicket_status_idx" ON "HelpTicket"("status");

-- CreateIndex
CREATE INDEX "HelpTicketMessage_ticketId_idx" ON "HelpTicketMessage"("ticketId");

-- CreateIndex
CREATE INDEX "HelpTicketMessage_userId_idx" ON "HelpTicketMessage"("userId");
