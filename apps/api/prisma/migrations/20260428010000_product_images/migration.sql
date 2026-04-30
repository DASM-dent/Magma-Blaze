CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "createdAt", "updatedAt")
SELECT 'legacy_' || "id", "id", "imageUrl", "name", 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product"
WHERE "imageUrl" IS NOT NULL AND length("imageUrl") > 0;
