ALTER TABLE "Order" ADD COLUMN "customerPhone" TEXT;

CREATE INDEX "Order_customerPhone_idx" ON "Order"("customerPhone");
