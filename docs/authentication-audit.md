# ADVFX authentication audit

Audit date: 2026-09-17. Assessment before this audit's fix: **Partially complete**.

## Implemented flow

Customer registration normalizes email, validates DTOs, creates `User` and `CustomerCredential` in a transaction, uses scrypt (`N=16384,r=8,p=1`), and creates a SHA-256-hashed one-time verification token. Login uses generic invalid-credential errors, requires verification, creates a 256-bit random customer token, stores only its SHA-256 hash in `CustomerAuthSession`, and expires it in 30 days. Password reset tokens are random, hashed, 30-minute, single-use, and reset revokes all customer sessions. Verification tokens are 24-hour, single-use; resend has a 60-second database-time cooldown.

Next.js is a BFF only for auth. It receives credentials, calls NestJS server-to-server, stores the returned customer token as the HTTP-only `forma_session` cookie (`Secure` in production, `SameSite=Lax`, path `/`, 30 days), and never returns that token to browser JavaScript. Session and logout read that cookie and forward it as a Bearer token to NestJS.

Admin authentication is distinct: an admin email plus `ADMIN_AUTH_SECRET` creates an `AdminAuthSession` (12 hours), and the existing `AuthGuard` authenticates only that session. `AdminGuard` then checks `role === ADMIN`.

## Finding: customer authorization was broken

`customerLogin` correctly creates `CustomerAuthSession`, and `/auth/session` correctly calls `authenticateCustomer`. However, controllers for customer profile, addresses, cart, orders, checkout, custom requests, uploads and notifications were all decorated with `AuthGuard`. That guard calls `AuthService.authenticate`, which queries **only** `AdminAuthSession` and rejects non-admin users. Thus a verified signed-in customer could not make any customer-owned API request.

This is an authorization contract defect, not a reason to create a second auth system. The corrective design is a `CustomerAuthGuard` that extracts the Bearer token under the same syntax/length rules and calls `authenticateCustomer`; customer controllers use that guard. Admin controllers retain `AuthGuard`/`AdminGuard`.

## Security review

| Area | Result | Notes |
| --- | --- | --- |
| Passwords | Good | salted scrypt, constant-time comparison; no plaintext/hash response/logging found. |
| Sessions | Good after guard correction | random token, DB hash, expiry, revocation, inactive-user check. |
| Cookies | Good baseline | HTTP-only/Secure production/SameSite Lax/path restricted. Cookie is scoped to all frontend paths by necessity. |
| CSRF | Remaining risk | SameSite Lax reduces cross-site POST risk but no origin check/CSRF token exists. Required before authenticated BFF mutations are integrated. |
| Enumeration | Mixed | login and reset are generic; registration deliberately reveals duplicate email, an acceptable product tradeoff only if rate limited. |
| Rate limiting | Partial | global in-process IP limiter exists; it is not distributed and login-specific throttling is absent. |
| Email | Good baseline | production requires Resend config; development-only tokens are intentionally returned by backend and must never be enabled in production. |
| Authorization/ownership | Mixed | service-level ownership exists for addresses, orders, custom requests, notifications; it was unreachable for customers because of the guard defect. |
| Environment | Good baseline | database/admin secret required, production CORS/front-end/email config validated. |

## Tests and remaining risks

Existing `auth.service.spec.ts` covered only two admin-login cases before this work; it did not exercise customer registration/login/token workflows, controller guards, or e2e cookie/BFF behavior. This change adds a focused customer-guard unit suite. Full auth integration coverage still requires a disposable PostgreSQL database and mocked email transport.

Production readiness is **not yet complete**: add distributed/login-specific throttling, CSRF/origin protection for future BFF mutations, integration tests for all token lifecycles, and an e2e test confirming customer endpoints accept customer sessions while admin endpoints reject them.
