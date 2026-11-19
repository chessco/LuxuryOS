# Commerce & Dual Credit Blueprint (`api/src/commerce`)

## System Overview
Shared commerce core supporting internal POS (`JEWELRY_INTERNAL`), reseller POS (`RESELLER_POS`), shared tenant catalog/inventory with kardex movements, time-bounded compare-and-swap reservations, 4-mode sale settlement, and dual credit facilities (`REVOLVING` + 30-day `NON_REVOLVING`).

## Local Interface & Invariants
- [`commerce.module.ts`](./commerce.module.ts): `CommerceModule` exposes `InternalPosController` and `CreditController`, and exports `CommerceService` and `CreditService`.
- [`internal-pos.controller.ts`](./internal-pos.controller.ts): `InternalPosController` (`/commerce`, roles `VENDEDOR | TENANT_ADMIN | SYSTEM_ADMIN`):
  - Shared catalog/sales/settlement: `GET /commerce/catalog`, `GET /commerce/sales`, `GET /commerce/sales/:id`, `POST /commerce/sales`, `POST /commerce/sales/:id/settle`.
  - Admin-only catalog/inventory/cancellation: `GET/POST/PATCH/DELETE /commerce/products*`, `GET /commerce/products/:id/kardex`, `POST /commerce/products/:id/movements`, `POST /commerce/sales/:id/cancel`.
- [`credit.controller.ts`](./credit.controller.ts): `CreditController` (`/commerce/credit`, roles `VENDEDOR | TENANT_ADMIN | SYSTEM_ADMIN`):
  - `GET /commerce/credit/accounts`, `PUT /commerce/credit/accounts` (admin-only), `GET /commerce/credit/subject-summary`, `GET /commerce/credit/obligations`, `GET /commerce/credit/obligations/:id`, `POST /commerce/credit/obligations/:id/payments`.
- [`commerce.service.ts`](./commerce.service.ts): `CommerceService` implements product CRUD, kardex movements, `checkout`, `settleSale`, `cancelSale`, `getResellerCredit`, and transactional reservation expiration (`releaseExpiredReservationsGlobally`).
- [`commerce-pricing.util.ts`](./commerce-pricing.util.ts): Cent-exact reseller Price 1/Price 2 snapshots and deterministic quote fingerprint shared by quote preview and checkout.
- [`credit.service.ts`](./credit.service.ts): `CreditService` manages credit accounts, overdue synchronization (`syncOverdueObligationsInTx`), `applySaleCreditDrawdownsInTx`, `recordObligationPayment`, ledger entries (`CreditLedgerEntry`), and `getResellerCredit`.
- [`reservation-expiry.service.ts`](./reservation-expiry.service.ts): `ReservationExpiryService` runs every `60_000 ms` on all API replicas using optimistic claims to expire abandoned cart reservations.

## Subdirectories & System Boundaries
- **DTOs**: [`./dto/README.md`](./dto/README.md) — Validation contracts for products, inventory movements, sales checkout/settlement, and dual credit operations.

## Global Invariants
- **Channel isolation & Cared payment ownership**: `CommerceService.actor` validates channel role access; `RESELLER_POS` checkouts (`Role.REVENDEDOR`) MUST NOT submit `payments` or `creditDrawdowns` (`ForbiddenException` — Cared processes all payments and credit).
- **Mandatory idempotency**: `checkout` and `settleSale` require a non-empty `Idempotency-Key` header (scoped per tenant/channel/actor); retries return the original `CommerceSale` or payment cleanly. `recordObligationPayment` also deduplicates via optional `Idempotency-Key`.
- **Compare-and-swap inventory & credit mutations**: Stock reservations (`reservedQuantity`), stock exits, expiration releases, and `CreditAccount.revolvingUsed` updates execute inside `prisma.$transaction` with optimistic conditional predicates so concurrent requests never double-spend stock or credit limits.
- **Dual credit & delinquency lock (`CreditService.applySaleCreditDrawdownsInTx`)**:
  - Supports `REVOLVING` (bounded by authorized `revolvingLimit`) and `NON_REVOLVING` (default `30` days term), supporting cash/transfer, revolving, non-revolving, or mixed settlement across unregistered/registered subjects (client credit drawdowns require `clientId`).
  - Accounts with `status === 'SUSPENDED'` or unresolved `OVERDUE` obligations (`> 30` days / past `dueAt`) block new drawdowns unless `allowOverdueOverride === true` is authorized by `TENANT_ADMIN` or `SYSTEM_ADMIN` (recorded in `CommerceAuditLog`).
- **Reseller margin lifecycle**: Checkout freezes public prices and `max(0, P1 - P2)` spread. Settlement marks it `EARNED` only when the sale is fully paid without outstanding credit; final credit repayment promotes `PENDING_CREDIT` to `EARNED`. Cancellation and expiration void pending margins. Cashier responses omit all margin fields.

## Global Side Effects
- Transactional MySQL reads/writes on `CommerceProduct`, `InventoryMovement`, `InventoryReservation`, `CommerceSale`, `CommerceSaleItem`, `CommercePayment`, `CreditAccount`, `CreditObligation`, `CreditPayment`, `CreditLedgerEntry`, and `CommerceAuditLog`.
- Local filesystem image writes (`uploads/<tenantId>/product_*.{png,jpg,webp,gif}`) when submitting base64 data URLs on product creation/update.
- Periodic background timer (`ReservationExpiryService`, `60_000 ms`).

## System Verification
- Run: `npm --prefix api test -- src/commerce/commerce.service.spec.ts src/commerce/credit.service.spec.ts src/commerce/credit.controller.spec.ts src/commerce/reservation-expiry.service.spec.ts src/commerce/commerce.migration.spec.ts src/commerce/credit.migration.spec.ts`
