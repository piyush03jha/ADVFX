-- AlterTable
ALTER TABLE "ProductFile" ADD COLUMN     "imageChannels" INTEGER,
ADD COLUMN     "imageColorSpace" TEXT,
ADD COLUMN     "imageHasAlpha" BOOLEAN,
ADD COLUMN     "imageHeight" INTEGER,
ADD COLUMN     "imageWidth" INTEGER;
