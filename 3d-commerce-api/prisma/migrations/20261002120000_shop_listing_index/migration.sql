-- Speeds up the paginated storefront listing (status + category + newest first).
CREATE INDEX "Product_status_categoryId_createdAt_idx" ON "Product"("status", "categoryId", "createdAt");
