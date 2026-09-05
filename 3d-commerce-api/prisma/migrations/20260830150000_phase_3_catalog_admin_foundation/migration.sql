-- Phase 3: physical catalog + pricing + inventory + admin foundation

CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ADMIN');
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "ProductMediaType" AS ENUM ('IMAGE', 'MODEL_PREVIEW');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "phone" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_isActive_sortOrder_idx" ON "Category"("isActive", "sortOrder");

ALTER TABLE "Product"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "categoryId" TEXT,
  ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isTrending" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isBestseller" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "badge" TEXT,
  ADD COLUMN "material" TEXT,
  ADD COLUMN "scale" TEXT,
  ADD COLUMN "dimensions" TEXT,
  ADD COLUMN "height" TEXT,
  ADD COLUMN "base" TEXT,
  ADD COLUMN "packaging" TEXT,
  ADD COLUMN "weight" TEXT,
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "updatedById" TEXT;

CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_status_idx" ON "Product"("status");
CREATE INDEX "Product_isFeatured_idx" ON "Product"("isFeatured");
CREATE INDEX "Product_isTrending_idx" ON "Product"("isTrending");
CREATE INDEX "Product_isBestseller_idx" ON "Product"("isBestseller");

CREATE TABLE "ProductPrice" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "amountMinor" INTEGER NOT NULL,
  "compareAtMinor" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductPrice_productId_isActive_idx" ON "ProductPrice"("productId", "isActive");
CREATE INDEX "ProductPrice_currency_idx" ON "ProductPrice"("currency");

CREATE TABLE "ProductInventory" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "lowStockAt" INTEGER NOT NULL DEFAULT 5,
  "trackStock" BOOLEAN NOT NULL DEFAULT true,
  "allowBackorder" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductInventory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductInventory_productId_key" ON "ProductInventory"("productId");

CREATE TABLE "ProductMedia" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "type" "ProductMediaType" NOT NULL,
  "url" TEXT NOT NULL,
  "altText" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductMedia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductMedia_productId_type_sortOrder_idx" ON "ProductMedia"("productId", "type", "sortOrder");

CREATE TABLE "Tag" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

CREATE TABLE "ProductTag" (
  "productId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("productId", "tagId")
);

CREATE INDEX "ProductTag_tagId_idx" ON "ProductTag"("tagId");

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductPrice"
  ADD CONSTRAINT "ProductPrice_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductInventory"
  ADD CONSTRAINT "ProductInventory_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductMedia"
  ADD CONSTRAINT "ProductMedia_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductTag"
  ADD CONSTRAINT "ProductTag_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductTag"
  ADD CONSTRAINT "ProductTag_tagId_fkey"
  FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
