-- Allow the optimized ProductFile to survive removal of its uploaded GLB source.
ALTER TABLE "ProductFile"
  DROP CONSTRAINT IF EXISTS "ProductFile_convertedFromId_fkey";

ALTER TABLE "ProductFile"
  ADD CONSTRAINT "ProductFile_convertedFromId_fkey"
  FOREIGN KEY ("convertedFromId")
  REFERENCES "ProductFile"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
