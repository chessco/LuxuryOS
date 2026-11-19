# Commerce & Credit DTOs (`api/src/commerce/dto`)

## Overview
Validated request payload contracts (`class-validator` + `class-transformer`) shared across internal POS, inventory movements, sales checkout/settlement, and dual credit facilities.

## Interface
- [`commerce-product.dto.ts`](./commerce-product.dto.ts):
  - `CreateProductDto`: `sku` (`@MaxLength(80)`), `name` (`@MaxLength(191)`), `unitPrice` (`@Min(0)`), optional `description`, `category`, `imageUrl` (`@MaxLength(5_000_000)`), `unitCost`, `resellerPrice`, `wholesalePrice`, `currency` (`^[A-Za-z]{3}$`), `stockOnHand`, `availableToResellers`, `status` (`CommerceProductStatus`).
  - `UpdateProductDto`: partial update counterpart for `PATCH /commerce/products/:id`.
  - `RecordProductMovementDto`: `type` (`'ENTRY' | 'EXIT' | 'ADJUSTMENT'`), integer `quantityDelta`, optional `unitCost` and `comments`.
- [`commerce-sale.dto.ts`](./commerce-sale.dto.ts):
  - `SaleCartItemDto`: `productId`, integer `quantity >= 1`.
  - `SalePaymentDto`: `amount >= 0.01`, `method` (`@MaxLength(50)`), optional `reference`.
  - `CreateSaleDto`: non-empty `items[]`, optional `clientId`, `customerName`, `customerPhone`, `notes`, `payments[]`, `creditDrawdowns[]`, `allowOverdueOverride`.
  - `SettleSaleDto`: optional `payments[]`, `creditDrawdowns[]`, `clientId`, `allowOverdueOverride`, `notes`.
  - `CancelSaleDto`: optional `reason` (`@MaxLength(500)`).
- [`commerce-credit.dto.ts`](./commerce-credit.dto.ts):
  - `CreditDrawdownDto`: `facilityType` (`CreditFacilityType`: `REVOLVING` | `NON_REVOLVING`), `amount >= 0.01`, optional `title`, `termDays` (`1..365`), `notes`.
  - `UpsertCreditAccountDto`: `subjectType` (`CreditSubjectType`), `resellerId` / `clientId`, `revolvingLimit >= 0`, optional `defaultTermDays` (`1..365`), `status` (`CreditAccountStatus`), `notes`.
  - `RecordCreditPaymentDto`: `amount >= 0.01`, `method`, optional `reference`, `notes`.
  - `CreateCreditNoteDto`: administrative adjustment with `amount >= 0.01`, mandatory `reason`, optional `notes`; it cannot exceed the open obligation balance.

## Invariants
- String trimming and numeric coercion (`@Transform(trimIfString)`, `@Type(() => Number)`) normalize payloads before service checks.
- Monetary inputs are bounded to 2 decimal places (`@IsNumber({ maxDecimalPlaces: 2 })`), and credit payment/drawdown amounts must be strictly positive (`>= 0.01`).

## Side Effects
- None (pure validation DTO schemas).

## Verification
- Run: `npm --prefix api run build`
