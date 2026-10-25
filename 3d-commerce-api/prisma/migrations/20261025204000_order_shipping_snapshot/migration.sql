ALTER TABLE "Order" ADD COLUMN "shippingAddressSnapshot" JSONB;

UPDATE "Order" AS o
SET "shippingAddressSnapshot" = jsonb_build_object(
  'fullName', a."fullName",
  'phone', a."phone",
  'line1', a."line1",
  'line2', a."line2",
  'city', a."city",
  'state', a."state",
  'postalCode', a."postalCode",
  'country', a."country"
)
FROM "Address" AS a
WHERE o."shippingAddressId" = a."id"
  AND o."shippingAddressSnapshot" IS NULL;
