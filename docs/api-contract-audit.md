# ADVFX API contract audit

Audit date: 2026-09-17. Source of truth: local `new/changes` at `cdc7f0b`.

## Architecture

The browser uses only eight Next.js BFF routes, all for customer authentication:

`Browser -> /api/auth/* -> BACKEND_API_URL/auth/* -> NestJS -> PostgreSQL`.

The BFF keeps the customer session token in the HTTP-only `forma_session` cookie. No catalog, customer account, cart, checkout, order, custom-request, notification, or admin request is made by the frontend. Those UI areas currently use static configuration or `localStorage`.

## Frontend routes

| Route | Kind | Auth required | Data source | Backend dependency | Status |
| --- | --- | --- | --- | --- | --- |
| `/`, `/contact`, `/search`, `/shop`, `/shop/[catogery]` | pages | No | static config | None | UI-only catalog/search |
| `/product/[id]` | server page | No | `config/products.ts` | None | static detail and 3D asset |
| `/cart`, `/wishlist` | client pages | No | browser `localStorage` | None | local cart/wishlist |
| `/checkout` | client page | Yes, client redirect | local cart/address | auth session only | no quote/order/payment request |
| `/payment`, `/order/confirmation` | client/pages | No effective backend enforcement | static/local state | None | demo flow |
| `/custom` | page | No | local UI | None | no submission/upload request |
| `/account`, `/account/addresses`, `/account/orders`, `/account/orders/[id]`, `/account/payments`, `/account/settings`, `/account/wishlist` | client/pages | Yes, client redirect | static config and `localStorage` | auth session only | account persistence absent |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/verify-email/success` | client/pages | No | auth BFF | auth BFF | integrated |
| `/api/auth/{login,register,session,logout,verify-email,resend-verification,forgot-password,reset-password}` | route handlers | cookie where applicable | NestJS | Yes | integrated BFF |

There is no `/admin` route in the frontend filesystem.

## Actual frontend request inventory

| Feature | Source | Method / URL | Body / auth | Expected result | Status |
| --- | --- | --- | --- | --- | --- |
| Login | `lib/auth-client.ts` -> `api/auth/login` | POST `/api/auth/login` -> `POST /auth/login` | email/password; BFF sets HTTP-only cookie | user | works by contract |
| Register | same -> `api/auth/register` | POST -> `POST /auth/register` | name/email/password | user + verification state | works by contract |
| Session | `AuthContext` -> `api/auth/session` | GET -> `GET /auth/session` | BFF forwards cookie as Bearer token | `{ user }` | works by contract |
| Logout | `AuthContext` -> `api/auth/logout` | POST -> `POST /auth/customer/logout` | BFF forwards cookie then clears it | `{ ok: true }` | works by contract |
| Email verify / resend | auth pages -> matching BFF | POST -> auth endpoints | token or email | message | works by contract |
| Password reset request / completion | auth pages -> matching BFF | POST -> auth endpoints | email; token/password | message | works by contract |

No Axios, direct NestJS calls, authorization headers from browser JavaScript, product/category/cart/wishlist/order/address/custom/admin HTTP calls, or client file uploads were found.

## Backend endpoint inventory

Public: `GET /`, `GET /products`, `GET /products/:id`, `GET /products/slug/:slug`, `GET /categories`, `GET /categories/:id`; and the eight auth endpoints listed above plus `POST /auth/admin/login`.

Customer-owned endpoints: `GET/PATCH /users/me`; `GET/POST /addresses`; `PATCH/DELETE /addresses/:id`; `GET /cart`; `POST /cart/items`; `PATCH/DELETE /cart/items/:productId`; `DELETE /cart`; `POST/GET /orders`; `GET /orders/:id`; `POST /orders/:id/return-request`; `GET /orders/returns/mine`; `POST /checkout/quote`; `GET /checkout/orders/:orderId/status`; `GET/PATCH /notifications` plus unread paths; `POST/GET /custom-requests`; `GET /custom-requests/:id`; and `POST /custom-requests/:requestId/files`.

Admin endpoints cover category/product/media/price/inventory management, product files and processing, shipping/pricing rules, dashboard, order/return lifecycle, shipment updates, and custom-request administration. They are intended to use `AuthGuard` plus `AdminGuard`.

Important route-order caveat: in `OrdersController` and `CustomBuildController`, parameter routes precede `admin/*` routes. Nest/Fastify route matching must be covered by e2e tests before exposing an admin client.

### Controller-level inventory

| Controller | Routes | Guard / status |
| --- | --- | --- |
| App | `GET /` | public health greeting |
| Auth | `POST /auth/{register,login,customer/logout,verify-email,resend-verification,forgot-password,reset-password,admin/login,logout}`, `GET /auth/session` | customer BFF uses first eight; `/auth/logout` is admin-guarded |
| Products | `GET /products`, `GET /products/slug/:slug`, `GET /products/:id`; `POST /products`; `PATCH/DELETE /products/:id`; `POST /products/:id/pricing`, `PATCH /products/:id/inventory`, `POST /products/:id/media`, `DELETE /products/:id/media/:mediaId` | reads public; writes admin guard |
| Categories | `GET /categories`, `GET /categories/:id`; `POST`, `PATCH`, `DELETE /categories/:id` | reads public; writes admin guard |
| Users | `GET/PATCH /users/me`; `GET/POST /addresses`; `PATCH/DELETE /addresses/:id` | customer guard; ownership enforced in service |
| Cart | `GET/DELETE /cart`; `POST /cart/items`; `PATCH/DELETE /cart/items/:productId` | customer guard; per-user cart |
| Checkout | `POST /checkout/quote`; `GET /checkout/orders/:orderId/status` | customer guard; no frontend caller |
| Orders | `POST/GET /orders`; `GET /orders/:id`; `POST /orders/:id/return-request`; `GET /orders/returns/mine`; `GET /orders/admin/{list,:id,returns}`; `PATCH /orders/admin/:id/status`, `PATCH /orders/admin/returns/:id` | customer/admin split; service uses owner filters |
| Custom request | `POST/GET /custom-requests`, `GET /custom-requests/:id`; `GET /custom-requests/admin/{list,:id}`; `PATCH /custom-requests/admin/:id/{status,preview}` | customer/admin split |
| Custom request files | `POST /custom-requests/:requestId/files`; `POST /custom-requests/:requestId/files/preview` | customer reference upload; admin preview upload |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`; `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` | customer guard, owner lookup |
| Shipping, pricing, shipment, admin | `GET/POST/PATCH /shipping/rules...`; `GET/POST/DELETE /admin/pricing/{tax-rules,promotions}...`; `GET/PATCH /shipments/order/:orderId`; `GET /admin/dashboard` | admin guard |
| Product files | `POST /products/:productId/files`, `POST .../bundle`, `GET ...`, `GET .../bundles/:bundleId`, `GET .../:fileId`, `GET .../:fileId/download`, `DELETE .../:fileId`, `DELETE .../bundles/:bundleId` | source controller has mixed access control; **not customer storefront delivery** |
| Processing jobs | `POST/GET /processing-jobs`, `GET /processing-jobs/:id`, `POST /processing-jobs/worker/run` | admin-guarded operations surface; not customer storefront delivery |
| Uploads | `POST /uploads` source exists but `UploadsModule` is absent from `AppModule` | not mounted |

Several source controllers use `any` for `req`; this is a type-quality issue rather than a response-contract change. All NestJS DTO bodies are globally whitelisted and reject unknown fields.

## Data and contract mapping

| Frontend shape | Backend shape | Match | Required action |
| --- | --- | --- | --- |
| `Product`: display price in rupees, rating/reviews, `image`, `model`, format/file-size/polygons | Product + `ProductPrice.amountMinor`, `ProductMedia`, ProductFile, category/tags/inventory | No | Catalog integration needs a deliberate storefront DTO/adapter; ratings/reviews are not modeled. |
| category string | nullable `Category { id,name,slug }` | No | use IDs/slugs and server categories. |
| Cart item includes local size and copied product | `CartItem { productId, quantity }` with included product | No | establish variant/size model or remove pseudo-size before cart integration. |
| Address `addressLine1/addressLine2`, country `India` | Address `line1/line2`, country default `IN` | No | BFF mapper and persisted address migration. |
| Orders in `config/orders.ts` | Order monetary minor units, items, payment/shipment | No | account/order mapper. |
| Wishlist local objects | no Prisma Wishlist model/module | Missing | design schema/API before persistence. |
| Custom page form | `CreateCustomRequestDto`, multipart reference endpoint | Not connected | integrate only after customer API/BFF layer exists. |

## Static/mock audit

| Data | Source | Current use | Backend owner | Recommendation |
| --- | --- | --- | --- | --- |
| Products, home rails, categories | `src/config/products.ts`, `trending-products.ts`, `new-arrivals.ts`, `most-purchased-products.ts`, hero configs | storefront and product pages | Yes | replace during catalog integration; keep presentation-only copy/static 3D assets for now. |
| Orders | `src/config/orders.ts` | account and confirmation pages | Yes | replace during persistent account/order integration. |
| Addresses | `AddressContext.tsx` initial example + localStorage | account/checkout | Yes | remove example identity data and replace during account integration. |
| Cart/wishlist | contexts + localStorage | storefront actions | Yes | cart next; wishlist needs a new backend capability. |
| FAQs/reviews/countries/motion | config files | content/UI | mostly no | keep static; reviews need a future domain decision. |

## Consolidated findings and proposed conventions

| Priority | Finding | Exact fix |
| --- | --- | --- |
| P0 | Customer sessions are stored separately but all customer-owned controllers use an admin-only authenticator. | Add/use `CustomerAuthGuard` for customer endpoints; retain `AuthGuard` for admin endpoints. |
| P0 | Cart methods omit `@Req()`, so Nest does not inject the request user. | Add `@Req()` to all cart controller methods. |
| P1 | Frontend has no BFF/client contract for customer APIs and continues to expose placeholder identity/address/order data. | Next milestone: catalog integration first, then a scoped account/cart BFF migration. |
| P1 | Product list has no server filtering, sorting, pagination, or storefront DTO. | Define `GET /products?q&category&sort&page&pageSize` and a stable response adapter. |
| P2 | Wishlist, payment UI, custom submission and admin UI are disconnected or absent. | Add only after the dependent customer/API contracts exist. |

Standardize new responses as `{ data, meta? }`; validate query DTOs; use integer minor currency units; return Nest validation errors as `{ statusCode, message, error }`; and use cursor or `{ page, pageSize, total, totalPages }` metadata for catalog lists. BFF mutations must forward the HTTP-only cookie server-side and require an origin/CSRF strategy before adding them.
