# Orders DTOs (`api/src/orders/dto`)

## Overview
Request payload contracts validated with `class-validator` for creating orders and appending internal/client order notes.

## Interface
- [`create-order.dto.ts`](./create-order.dto.ts):
  - `CreateOrderDto`:
    - Required: `clientId: string`, `pieceType: string`, `value: number` (`@Min(0)`), `totalAmount: number` (`@Min(0)`), `cost: number` (`@Min(0)`).
    - Classification & workflow: `type?: OrderType`, `status?: OrderStatus`, `priority?: Priority`.
    - Technical jewelry specs: `metal?`, `color?`, `karats?`, `weight?`, `size?`, `thickness?`, `itemCode?`, `notes?`, `imageUrl?`, `laborCost?`, `materialCost?`, `promisedAt?`, `dueDate?`.
    - Advance payment: `advancePayment?: { amount: number; method?: string; reference?: string }`, `advanceAmount?`, `advanceMethod?`, `advanceReference?`.
    - Polymorphic metadata: `specifications?: any` (carries multi-piece `items[]`, `assignedTo`/`assignedJeweler`, `leftGold`, `leftGoldItems`, `promisedDate`, etc.).
- [`create-order-note.dto.ts`](./create-order-note.dto.ts):
  - `CreateOrderNoteDto`: `content: string` (`@IsString() @IsNotEmpty() @MaxLength(10000)`).

## Invariants
- Financial amounts `value`, `totalAmount`, `cost`, and `advanceAmount` cannot be negative (`@Min(0)`).
- Order notes are bounded to `10000` characters.

## Side Effects
- None (pure DTO schemas enforced by NestJS validation pipe).

## Verification
- Run: `npm --prefix api run build`
