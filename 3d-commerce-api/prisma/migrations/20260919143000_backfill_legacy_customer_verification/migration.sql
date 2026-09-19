-- Preserve access for pre-existing customer accounts created before
-- email verification was introduced. New registrations still require verification.
UPDATE "User" u
SET "emailVerifiedAt" = CURRENT_TIMESTAMP,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE u."role" = 'CUSTOMER'
  AND u."emailVerifiedAt" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "CustomerCredential" c
    WHERE c."userId" = u."id"
  );
