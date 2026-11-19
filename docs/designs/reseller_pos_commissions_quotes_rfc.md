# RFC: Reseller POS — Frozen Spread Margins, Credit-Gated Recognition & Drift-Safe Quotes (MVP 3)

* **Author:** chessco
* **Date:** 2026-11-18
* **Status:** RFC (Published for Team Feedback)

---

## Overview

MVP 3 adds read-only reseller resale-margin reporting (`GET /reseller/commissions`) and drift-protected commercial quote previews (`POST /reseller/quotes`) to the isolated `RESELLER_POS` module (`api/src/reseller-pos`, `api/src/commerce`, `reseller-web`).

Under the finalized model:
1. **Channel pricing split:** Internal store sales (`JEWELRY_INTERNAL`) bill **List Price (`CommerceProduct.unitPrice`, Precio 1)**. Reseller orders (`RESELLER_POS`) bill **Reseller Price (`CommerceProduct.resellerPrice ?? unitPrice`, Precio 2)** so the reseller purchases from Cared at Precio 2 and keeps the resale spread (`max(0, Precio 1 - Precio 2)`) when selling to their end customer at Precio 1.
2. **Additive snapshots without breaking `unitPrice`:** On `RESELLER_POS` sales, `CommerceSaleItem.unitPrice` and `lineTotal` remain the billed Precio 2 transaction amounts. New nullable snapshot columns record `publicUnitPrice` (`Precio 1`), `commissionUnitAmount` (`max(0, publicUnitPrice - unitPrice)`), and `commissionAmount` (`commissionUnitAmount * quantity`).
3. **Cash-collected realization (`creditedAmount === 0`):** Margin counts as earned (`commissionStatus = EARNED`, `commissionEarnedAt`) only when Caja has marked `CommerceSale.status = PAID` **and** `creditedAmount === 0`. If settled via 30-day `REVOLVING` or `NON_REVOLVING` credit (`creditedAmount > 0`), the margin remains in `PENDING_CREDIT` until `CreditService.recordObligationPayment` collects the final peso and reduces `nextSaleCredited` to `0`.
4. **Role-isolated visibility:** Store cashiers (`Role.VENDEDOR`) MUST NEVER view reseller margins or spread snapshots in `PosSales.tsx` or `/commerce/sales*` responses. Access is limited exclusively to `Role.REVENDEDOR` (own `RESELLER_POS` sales only) and `TENANT_ADMIN` / `SYSTEM_ADMIN`.
5. **Stateless quotes with change detection:** `POST /reseller/quotes` evaluates live retail price, reseller price, spread margin, and actual stock availability (excluding expired holds) without creating `InventoryReservation` locks, returning a deterministic SHA-256 `quoteFingerprint` so `POST /reseller/sales` rejects mid-flight price or availability drift before reserving stock or consuming `Idempotency-Key`.

---

## Analysis

### 1. Resolving the Four Blocking Conflicts Found in Goldfish Review

1. **Billing Owner & Terminology (`Precio 1` vs `Precio 2`):**
   - Because Caja (`JEWELRY_INTERNAL`) sells at List Price (`Precio 1`) while `RESELLER_POS` bills the reseller at `Precio 2`, `Precio 1 - Precio 2` is a **resale margin (`Margen de reventa`)**, not a commission debt owed by Cared (`CommerceService.checkout` continues billing `resellerPrice ?? unitPrice` for `RESELLER_POS` and Caja `settleSale` collects `totalAmount` = Precio 2).
   - Keeping route `/reseller/commissions` aligns with `docs/RESELLER_POS_AGENT_START.md` §6 while UI copy in `reseller-web` and admin views clearly labels it **Margen de reventa** (*"Diferencia entre Precio de Lista (Precio 1) y Tu Precio Revendedor (Precio 2); Cared cobra Precio 2 y no adeuda reembolso"*).

2. **`unitPrice` Field Collision (`CommerceSaleItem` & `ResellerCatalogItem`):**
   - `CommerceSaleItem.unitPrice` (`schema.prisma#L471`) and `ResellerCatalogItem.unitPrice` (`reseller-pos.openapi.yaml#L144`) already store the billed channel price (`Precio 2` on `RESELLER_POS`), enforced by existing specs and `lineTotal === unitPrice * quantity`.
   - Resolution: Leave `CommerceSaleItem.unitPrice`, `lineTotal`, and `CommerceSale.totalAmount` completely untouched. Add nullable columns on `CommerceSaleItem` (`publicUnitPrice`, `commissionUnitAmount`, `commissionAmount`) and additive fields on `CommerceSale` (`publicTotalAmount`, `commissionAmount`, `commissionStatus`, `commissionEarnedAt`). In `ResellerCatalogItem` / `ResellerInventoryItem`, preserve `unitPrice` (`Precio 2`) and add explicit `publicUnitPrice` (`Precio 1`) + `estimatedMargin` while co-versioning `reseller-pos.openapi.yaml`, `reseller-pos.contract.ts`, and `reseller-web/src/types.ts`.

3. **Credit-Settled Realization (`creditedAmount === 0` Gate) & Checkout Edge Cases:**
   - In `CommerceService.settleSale` (`L1229, L1255-L1263`), settling 100% via 30-day credit sets `CommerceSale.status = PAID` while `creditedAmount > 0`. Under our resolved rule:
     - Cash/card/transfer full settlement (`status === PAID && creditedAmount === 0` at `settleSale`) transitions `commissionStatus` to **`EARNED`** and stamps `commissionEarnedAt = now`.
     - Credit-backed settlement (`status === PAID && creditedAmount > 0`) transitions `commissionStatus` to **`PENDING_CREDIT`** (`commissionEarnedAt = null`). Inside `CreditService.recordObligationPayment` (`credit.service.ts#L1113-L1134`), inside the exact compare-and-swap update on `CommerceSale`, once `nextSaleCredited === 0` (and `commissionStatus === PENDING_CREDIT`), the update atomically promotes `commissionStatus = EARNED` and `commissionEarnedAt = now`.
   - Edge cases addressed in the design:
     - **Zero-total guard:** Reject `RESELLER_POS` checkout with `400 Bad Request` if computed `totalAmount <= 0`, preventing an unpaid `$0` order from becoming `PAID` inside `checkout()` and bypassing `settleSale()`.
     - **Credit-only `settleSale` `P2002` bug:** Fix `commerce.service.ts#L1425-L1439` so concurrent idempotent credit settlements also check `tx.creditObligation.findFirst` before rethrowing `P2002`.
     - **Partial settlements (`PARTIAL`):** Keep `commissionStatus = PENDING` while `status === PENDING_PAYMENT`; cancelled or expired unpaid orders move to `VOIDED` (`$0` earned).

4. **MySQL 8 Migration Safety, Rollback & No-Backfill Policy:**
   - Additive DDL only (verified by a Jest migration test forbidding `DROP`, `UPDATE`, `DELETE`, `INSERT`).
   - New `CommerceSaleItem` columns are `NULL` (`DECIMAL(10, 2) NULL`); `CommerceSale` adds `publicTotalAmount DECIMAL(12, 2) NULL`, `commissionAmount DECIMAL(12, 2) NULL`, `commissionStatus` enum (`NONE | PENDING | PENDING_CREDIT | EARNED | VOIDED`, default `NONE`), and `commissionEarnedAt DATETIME(3) NULL`.
   - `NONE` cleanly separates pre-MVP 3 historical rows and `JEWELRY_INTERNAL` sales from post-MVP 3 `RESELLER_POS` sales (`PENDING` -> `PENDING_CREDIT` -> `EARNED` | `VOIDED`), with safe container rollback (`DEFAULT NONE` / nullable fields avoid MySQL `1364`).
   - Short-named MySQL composite indexes under 64 chars (`CommerceSale_channel_comm_earned_idx`, `CommerceSale_reseller_comm_earned_idx`) prevent full table scans on `paidAt`/`commissionEarnedAt` range queries.

### 2. Quote Change-Detection & Role/Currency Safeguards

- **Single Pure Pricing Kernel + `quoteFingerprint`:**
  - Extract a pure, shared evaluation function inside `CommerceModule` (`evaluateResellerQuoteLines`) using integer-cent rounding (`Math.max(0, publicCents - resellerCents)` per unit, multiplied by `quantity`, enforcing single-currency per cart).
  - `POST /reseller/quotes` (`@HttpCode(HttpStatus.OK)`, stateless, zero DB writes to `model Quote`, never touching `InventoryReservation`) releases or discounts expired holds (`expiresAt <= now`) so quoted availability reflects real inventory without blocking buyers.
  - `POST /reseller/quotes` returns per-line `publicUnitPrice`, `resellerUnitPrice`, `unitMargin`, `lineMargin`, `availableQuantity`, `isAvailable`, `reservesInventory: false`, `evaluatedAt`, and a deterministic SHA-256 **`quoteFingerprint`** over `[{ productId, publicUnitPriceCents, resellerUnitPriceCents, currency, quantity }]` + availability guard.
  - `POST /reseller/sales` accepts optional `expectedQuoteFingerprint`: inside `checkout()`'s `prisma.$transaction`, if `expectedQuoteFingerprint` differs from live prices or stock is short, fail before creating `CommerceSale` or reserving stock with a structured **`409 Conflict`** item diff (`code: 'QUOTE_DRIFT' | 'INSUFFICIENT_STOCK'`) so `Idempotency-Key` stays clean and `reseller-web` refreshes the cart.
- **Cashier (`Role.VENDEDOR`) Blinding & Multi-Currency Reporting:**
  - Filter out `publicUnitPrice`, `publicTotalAmount`, `commissionUnitAmount`, `commissionAmount`, `commissionStatus`, and `commissionEarnedAt` from `CommerceService.toSaleResponse` whenever `actor.role === Role.VENDEDOR` (`PosSales.tsx` renders margin data only for `TENANT_ADMIN` / `SYSTEM_ADMIN`).
  - `GET /reseller/commissions` requires `salesChannel = SalesChannel.RESELLER_POS`, forces `resellerId = req.user.id` when `Role.REVENDEDOR` (ignoring/rejecting `?resellerId=`), validates `from`/`to` (inclusive end-of-day), `currency`, `status`, `resellerId` (admin only), and returns **`totalsByCurrency`** via SQL `groupBy` alongside paginated detail rows (`page`, `limit <= 100`).
  - Strip `unitCost` and `wholesalePrice` from all `/reseller/*` endpoints, and record frozen split snapshots in `CommerceAuditLog` (`SALE_RESERVED`, `SALE_SETTLED`, `SALE_CANCELLED`).

---

## Goals vs. Non-Goals

* **In-Scope Goals:**
  * Enforce channel pricing separation (`JEWELRY_INTERNAL` = Lista / Precio 1; `RESELLER_POS` = Revendedor / Precio 2) with immutable per-line retail and spread margin snapshots at checkout.
  * Trigger `EARNED` margin recognition strictly once `CommerceSale.status === PAID` **and** `creditedAmount === 0` (covering cash/transfer/card at `settleSale` and final credit repayment at `CreditService.recordObligationPayment`).
  * Hide all reseller margin/commission fields from `Role.VENDEDOR` across both API serializers and `web/src/pages/PosSales.tsx`.
  * Provide single-kernel pricing across `GET /reseller/catalog`, `POST /reseller/quotes` (`200 OK`, no stock reservation, SHA-256 `quoteFingerprint` drift detection on `POST /reseller/sales`), and `checkout()`, plus client-safe ("Modo cliente") quote display in `reseller-web`.
  * Implement currency-grouped, paginated, indexed `GET /reseller/commissions` for `REVENDEDOR` (self) and admins (`TENANT_ADMIN` / `SYSTEM_ADMIN`), updating OpenAPI + TypeScript contracts together.

* **Out-of-Scope Non-Goals:**
  * Payout disbursement batches, cash-back deductions in Caja, or offsetting `CreditObligation` debt with resale margin.
  * Configurable percentage/category commission tables (fixed `Precio 1 - Precio 2` spread rule applies; `discountAmount` remains `0` on `RESELLER_POS`).
  * Exposing reseller margin data to `Role.VENDEDOR` cashiers or storing persisted rows in workshop `model Quote` (`OrderType.QUOTE`).
  * Post-`PAID` full/partial returns and clawbacks (deferred to MVP 4, enabled cleanly by additive state boundaries).

---

## Alternatives Weighed

1. **Rejected — Treating `Precio 1 - Precio 2` as Caja-collected commission at `status = PAID` regardless of credit:**
   * *Reason:* Rejected by author decisions #1 and #2. Caja sells internal orders at List Price (`Precio 1`) while resellers buy at `Precio 2`, and credit sales carry unpaid 30-day risk until `CreditObligation` is paid in full (`creditedAmount === 0`).
2. **Rejected — Omitting `POST /reseller/quotes` or leaving quote-to-sale drift silent:**
   * *Reason:* Rejected by author decision #3. Resellers need `POST /reseller/quotes` with explicit `quoteFingerprint` price/stock change detection prior to reserving inventory in `POST /reseller/sales`.
3. **Rejected — Exposing margin breakdown inside Caja's settlement drawer for `Role.VENDEDOR`:**
   * *Reason:* Rejected by author decision #4. Keeps cashiers focused on collecting `totalAmount` without exposing reseller profit margins or causing accidental Caja deductions.
4. **Rejected — Overwriting `CommerceSaleItem.unitPrice` or backfilling historical sales via Prisma migration DML:**
   * *Reason:* Breaks existing `unitPrice * quantity === lineTotal`, Caja balances, container rollback, and repository additive-only migration tests.

---

## Key Decisions & Staging for Next Steps

All 4 core architectural decisions are resolved for `/egm:egm-draft`:

1. **Pricing & Cash Owner:** `JEWELRY_INTERNAL` bills `Precio 1` (Lista); `RESELLER_POS` bills `Precio 2` (`unitPrice` unchanged on `CommerceSaleItem`). Frozen `Precio 1 - Precio 2` is tracked informatively as **Margen de reventa** (`publicUnitPrice`, `commissionUnitAmount`, `commissionAmount`).
2. **Earning Trigger:** `commissionStatus` transitions `PENDING` -> (`PENDING_CREDIT` if `creditedAmount > 0`) -> **`EARNED`** strictly when `CommerceSale.status === 'PAID' && creditedAmount === 0` (either inside `settleSale` or upon final repayment in `CreditService.recordObligationPayment`).
3. **Quote Change Detection:** Stateless `POST /reseller/quotes` (`200 OK`, no `InventoryReservation`) shares one pure integer-cent pricing kernel with `GET /reseller/catalog` and `checkout()`, returning `quoteFingerprint` verified on `POST /reseller/sales` (`409` item diff on drift).
4. **Strict Role Blinding:** `Role.VENDEDOR` receives no margin/commission data in `CommerceService.toSaleResponse` or `PosSales.tsx`; only `REVENDEDOR` (self-only) and `TENANT_ADMIN` / `SYSTEM_ADMIN` can inspect commissions and `GET /reseller/commissions`.
