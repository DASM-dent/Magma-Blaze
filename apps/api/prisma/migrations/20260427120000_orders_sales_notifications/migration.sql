-- Improve order tracking and internal notifications.
ALTER TABLE "Notification" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE "Notification" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "Notification" ADD COLUMN "actionUrl" TEXT;
ALTER TABLE "Notification" ADD COLUMN "readAt" DATETIME;

CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_read_idx" ON "Notification"("read");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
CREATE INDEX "OrderEvent_orderId_idx" ON "OrderEvent"("orderId");
CREATE INDEX "OrderEvent_userId_idx" ON "OrderEvent"("userId");
CREATE INDEX "OrderEvent_type_idx" ON "OrderEvent"("type");
