-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "notifyOrders" BOOLEAN NOT NULL DEFAULT true,
    "notifyPromos" BOOLEAN NOT NULL DEFAULT false,
    "notifySupport" BOOLEAN NOT NULL DEFAULT true,
    "notifyDrops" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedReason" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("blocked", "blockedReason", "country", "createdAt", "currency", "email", "failedLoginAttempts", "id", "isVerified", "language", "lockedUntil", "name", "passwordHash", "phone", "preferredContact", "region", "role", "twoFactorEmailEnabled", "updatedAt", "whatsapp") SELECT "blocked", "blockedReason", "country", "createdAt", "currency", "email", "failedLoginAttempts", "id", "isVerified", "language", "lockedUntil", "name", "passwordHash", "phone", "preferredContact", "region", "role", "twoFactorEmailEnabled", "updatedAt", "whatsapp" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
