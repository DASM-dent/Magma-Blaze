/*
  Warnings:

  - Added the required column `updatedAt` to the `PromoCode` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "reference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DOP',
    "reference" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "shippingStatus" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "shipping" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DOP',
    "promoCodeId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentProvider" TEXT,
    "paymentReference" TEXT,
    "awaitingCustomerApproval" BOOLEAN NOT NULL DEFAULT false,
    "customerDecisionAt" DATETIME,
    "addressLine" TEXT NOT NULL,
    "packageNote" TEXT,
    "shippedAt" DATETIME,
    "deliveredAt" DATETIME,
    "deliveryPlace" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "shippingReference" TEXT,
    "shippingInvoiceUrl" TEXT,
    "shippingInvoicePdfUrl" TEXT,
    "adminNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("addressLine", "adminNote", "awaitingCustomerApproval", "country", "createdAt", "currency", "customerDecisionAt", "deliveredAt", "deliveryPlace", "driverName", "driverPhone", "id", "packageNote", "shippedAt", "shipping", "shippingInvoicePdfUrl", "shippingInvoiceUrl", "shippingReference", "shippingStatus", "status", "subtotal", "total", "updatedAt", "userId") SELECT "addressLine", "adminNote", "awaitingCustomerApproval", "country", "createdAt", "currency", "customerDecisionAt", "deliveredAt", "deliveryPlace", "driverName", "driverPhone", "id", "packageNote", "shippedAt", "shipping", "shippingInvoicePdfUrl", "shippingInvoiceUrl", "shippingReference", "shippingStatus", "status", "subtotal", "total", "updatedAt", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "priceUsd" INTEGER NOT NULL DEFAULT 0,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "views" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("categoryId", "cost", "createdAt", "description", "id", "imageUrl", "name", "price", "priceUsd", "slug", "status", "stock", "updatedAt", "views") SELECT "categoryId", "cost", "createdAt", "description", "id", "imageUrl", "name", "price", "priceUsd", "slug", "status", "stock", "updatedAt", "views" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE TABLE "new_PromoCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PERCENT',
    "percent" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "minSubtotal" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PromoCode" ("active", "code", "expiresAt", "id", "percent") SELECT "active", "code", "expiresAt", "id", "percent" FROM "PromoCode";
DROP TABLE "PromoCode";
ALTER TABLE "new_PromoCode" RENAME TO "PromoCode";
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "InventoryMovement_productId_idx" ON "InventoryMovement"("productId");

-- CreateIndex
CREATE INDEX "InventoryMovement_type_idx" ON "InventoryMovement"("type");

-- CreateIndex
CREATE INDEX "PaymentTransaction_orderId_idx" ON "PaymentTransaction"("orderId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");
