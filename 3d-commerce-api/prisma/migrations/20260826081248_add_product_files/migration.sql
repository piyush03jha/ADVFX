-- CreateEnum
CREATE TYPE "ProductFileType" AS ENUM ('MODEL', 'IMAGE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "ProductFileFormat" AS ENUM ('ABC', 'USD', 'USDA', 'USDC', 'SVG', 'PDF', 'OBJ', 'PLY', 'STL', 'BVH', 'FBX', 'GLB', 'GLTF');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFile" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageUrl" TEXT,
    "format" "ProductFileFormat" NOT NULL,
    "fileType" "ProductFileType" NOT NULL,
    "mimeType" TEXT,
    "fileSize" BIGINT NOT NULL,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "processingError" TEXT,
    "convertedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "ProductFile_productId_idx" ON "ProductFile"("productId");

-- CreateIndex
CREATE INDEX "ProductFile_format_idx" ON "ProductFile"("format");

-- CreateIndex
CREATE INDEX "ProductFile_processingStatus_idx" ON "ProductFile"("processingStatus");

-- CreateIndex
CREATE INDEX "ProductFile_convertedFromId_idx" ON "ProductFile"("convertedFromId");

-- AddForeignKey
ALTER TABLE "ProductFile" ADD CONSTRAINT "ProductFile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFile" ADD CONSTRAINT "ProductFile_convertedFromId_fkey" FOREIGN KEY ("convertedFromId") REFERENCES "ProductFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
