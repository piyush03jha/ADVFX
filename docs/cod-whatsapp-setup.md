# COD and WhatsApp order updates

Run the Prisma migration and regenerate the client as part of backend deployment. Enable COD only for India/INR regular cart and buy-now orders after confirming the courier supports collecting and remitting the full order amount. Custom request orders stay prepaid. No additional COD charge is applied. Admin must verify collection before setting Delivered; capture means customer payment collected, not courier remittance. COD refunds and failed delivery returns require a separate manual workflow; do not issue Razorpay refunds for COD.

Set COD_ENABLED=true on backend. Checkout quotes expose availability. COD requires an idempotency key, confirms without Razorpay, retains pending payment until delivery, and clears purchased cart lines.

For WhatsApp, set server-only variables: WHATSAPP_ORDER_UPDATES_ENABLED=true, WHATSAPP_GRAPH_VERSION (supported Meta version), WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN (production token with whatsapp_business_messaging permission), WHATSAPP_TEMPLATE_LANGUAGE (match approved template locale), WHATSAPP_TEMPLATE_CONFIRMED, WHATSAPP_TEMPLATE_SHIPPED, WHATSAPP_TEMPLATE_DELIVERED. Never expose tokens to frontend. Create approved utility templates with positional body parameters and no other dynamic components:

- voxel_order_confirmed: Your Voxel3D order {{1}} is confirmed. Total: {{2}}. Payment method: {{3}}. View your order at https://voxel3d.org/account/orders.
- voxel_order_shipped: Your Voxel3D order {{1}} has shipped with {{2}}. Tracking ID: {{3}}. Track on the courier website using the details in https://voxel3d.org/account/orders.
- voxel_order_delivered: Your Voxel3D order {{1}} has been delivered. Thank you for shopping with us.

Customer opt-in is optional and tied to the delivery address phone at regular checkout. Existing orders and custom orders do not have recorded consent and are not messaged. Order transactions persist a unique outbox row per milestone, including when tracking is added after dispatch. A bounded NestJS worker sends approved templates; HTTP 429 retries with backoff, ambiguous outcomes require operator review rather than automatic duplicate sends. ACCEPTED means Meta accepted the request, not delivered/read. Inspect WhatsAppOrderMessage for FAILED/UNKNOWN; verify in Meta before manually resetting a row. No tracking API or Redis required. Meta message fees may apply.

Test with a real opted-in test recipient: COD placement, retry same checkout, prepaid capture, shipment with tracking, later tracking addition, delivery collection confirmation, cancelled unpaid COD, invalid phone, disabled provider, failure/429. Check order status, payment status and one row per milestone. Do not enable until migration/build and live test succeed.
