# ADVFX backend roadmap

## P0 — blocking/security-critical

- Repair customer authorization: customer session tokens must authenticate customer-owned APIs, without weakening admin authorization.
- Repair the cart controller request injection so authenticated user identity reaches its service.
- Add guard/integration coverage to prevent either regression.

## P1 — required for the next milestone

### Selected milestone: Catalog integration

Current state -> public product/category endpoints and a rich Prisma catalog exist, while the entire storefront still renders static arrays and makes zero catalog requests.

Blocking issue -> there is no stable storefront catalog DTO, list query contract, BFF/client service, or mapping for price/media/category. The customer API guard defect is a direct prerequisite and is fixed in this audit.

Why next -> product discovery and detail are the first customer-facing data dependencies; persistent cart/checkout must reference real catalog IDs and server prices. The current cart stores copied, mutable display prices in `localStorage`, so integrating it first would encode the wrong source of truth.

Dependencies -> seeded active products/categories/prices/media; product list DTO; server filtering/sorting/pagination; Next BFF read routes or server-side catalog client; adapter tests.

Affected modules -> `products`, `categories`; frontend `ShopProductGrid`, product page/cards/config consumers; a new typed storefront API layer and route handlers.

Acceptance criteria -> shop/detail render active database products; all money originates as server minor units; slug/ID detail lookup is defined; server supports search/category/sort/pagination; loading/empty/error states exist; static rails remain only where explicitly editorial.

## P2 — required for complete commerce

- Persistent account: BFF contract for profile/addresses/orders and removal of example personal address/order data.
- Cart backend: decide product variants/size semantics, migrate local cart safely, use backend inventory and price.
- Checkout engine: BFF quote and order creation with idempotency; do not treat payment page as an order confirmation.
- Custom request: auth-gated BFF upload/submission flow limited to JPG/PNG (current backend additionally permits WEBP/PDF and needs a business-rule decision).
- Wishlist schema/API and account integration.
- Admin frontend and operational tools.

## P3 — future improvements

- Razorpay creation, webhook signature verification, payment reconciliation and refund workflow.
- Distributed rate limiting, CSRF/origin controls, audit logs, observability, email-provider monitoring.
- Reviews/ratings domain model, search index, editorial merchandising, fulfillment/provider integration.

No Razorpay, digital delivery, customer custom-3D preview, or frontend redesign is in this audit milestone.
