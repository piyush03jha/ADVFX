-- Prevent more than one active processing job for the same ProductFile.
-- PostgreSQL partial unique indexes allow historical COMPLETED/FAILED jobs
-- while enforcing uniqueness for currently active QUEUED/PROCESSING jobs.

CREATE UNIQUE INDEX "ProductFileProcessingJob_productFileId_active_key"
ON "ProductFileProcessingJob" ("productFileId")
WHERE "status" IN ('QUEUED', 'PROCESSING');
