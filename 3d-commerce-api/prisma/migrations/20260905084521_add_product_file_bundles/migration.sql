-- CreateTable
CREATE TABLE "ProductFileBundle" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rootFileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductFileBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFileBundleAsset" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductFileBundleAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductFileBundle_rootFileId_key" ON "ProductFileBundle"("rootFileId");

-- CreateIndex
CREATE INDEX "ProductFileBundle_productId_idx" ON "ProductFileBundle"("productId");

-- CreateIndex
CREATE INDEX "ProductFileBundle_productId_createdAt_idx" ON "ProductFileBundle"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductFileBundleAsset_bundleId_idx" ON "ProductFileBundleAsset"("bundleId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFileBundleAsset_bundleId_relativePath_key" ON "ProductFileBundleAsset"("bundleId", "relativePath");

-- AddForeignKey
ALTER TABLE "ProductFileBundle" ADD CONSTRAINT "ProductFileBundle_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFileBundle" ADD CONSTRAINT "ProductFileBundle_rootFileId_fkey" FOREIGN KEY ("rootFileId") REFERENCES "ProductFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFileBundleAsset" ADD CONSTRAINT "ProductFileBundleAsset_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "ProductFileBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
