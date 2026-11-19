# Orders Blueprint (`api/src/orders`)

## System Overview
Owns workshop and store orders (`REPAIR`, `MANUFACTURE`, `DESIGN`, `LASER`, `LAYAWAY`, `STANDARD`): Kanban board grouping, creation validation, immutable sequential folio allocation, soft deletion audit, QR tracking token generation/verification, payment settlement, and WhatsApp lifecycle notifications.

## Local Interface & Invariants
- [`orders.module.ts`](./orders.module.ts): `OrdersModule` wires `OrdersController`, `PublicOrdersController`, `OrdersService`, order strategies, `NotificationService`, and `SettingsService`.
- [`orders.controller.ts`](./orders.controller.ts): `OrdersController` (`@Controller('kanban')`, guarded by `JwtAuthGuard`) exposes board, CRUD, workflow, photo upload, QR delivery/settlement/return, design completion, jeweler assignment, `GET /kanban/deleted-orders` (admin-only), `DELETE /kanban/orders/:id` (admin-only), `POST /kanban/orders/:id/send-whatsapp`, and `POST /kanban/orders/:id/resend-creation-whatsapp`.
- [`public-orders.controller.ts`](./public-orders.controller.ts): `PublicOrdersController` (`@Controller('public/orders')`) exposes rate-limited public tracking endpoints `GET /public/orders/track/:id/check` and `POST /public/orders/track/:id/verify` using strong identifiers (36-char UUID or 16+ char `trackToken`).
- [`orders.service.ts`](./orders.service.ts): `OrdersService` implements core business rules, board queries, status transitions, payment handling, soft deletes, and WhatsApp notification rendering.
- [`order-number.ts`](./order-number.ts): `allocateOrderCode(tx, tenantId, type)` atomically allocates immutable folios (`PED`, `REP`, `FAB`, `DIS`, `LAS`, `APT`, `COT`) via Prisma `OrderNumberSequence`.
- [`tracking.util.ts`](./tracking.util.ts): `generateTrackToken(orderId)` and `generateHmacToken(orderId)` produce deterministic tracking tokens signed with `TRACKING_SECRET`.

## Subdirectories & System Boundaries
- **DTOs**: [`./dto/README.md`](./dto/README.md) — Input validation contracts (`CreateOrderDto`, `CreateOrderNoteDto`).
- **Strategies**: [`./strategies/README.md`](./strategies/README.md) — `OrderStrategyFactory` and status lifecycle strategies per `OrderType`.

## Global Invariants
- **Immutable folio allocation**: `allocateOrderCode` increments `OrderNumberSequence` transactionally per `(tenantId, type)`; soft-deleting an order never decrements or recycles its `orderCode`.
- **Soft deletion (`deleteOrder` / `getDeletedOrders`)**: Deletion requires admin role and non-empty `reason`, records `deletedAt`, `deletedById`, and `deletionReason` (max 500 chars) on `Order`, and clears `queueTicket.orderId` inside a transaction; standard list/board/lookup queries filter `deletedAt: null`.
- **Order creation validation (`OrdersService.createOrder`)**:
  - `OrderType.QUOTE` is rejected from `OrdersService.createOrder`.
  - Client must belong to the tenant and have a valid 10+ digit phone (`assertClientInTenant(..., requirePhone = true)`).
  - Promised delivery date (`promisedAt`, `dueDate`, or `specifications.promisedDate`) is mandatory.
  - Workshop types `REPAIR`, `MANUFACTURE`, and `LASER` require non-empty `assignedTo`/`assignedJeweler` (enforced server-side, independent of UI validation); `DESIGN` assigns designer separately.
  - Workshop jobs require `size` and `thickness` (order-level and per piece item).
  - Every piece requires a non-empty `imageUrl` photo, and item arrays require `jewelerLaborCost`.
  - When `'leftGold' in specifications`, `leftGold` must be boolean, and `leftGold === true` requires non-empty `leftGoldItems[]` with `karats` and `grams > 0`.
- **QR & WhatsApp payload**: `sendOrderWhatsApp` encodes the tracking URL (`trackingUrl`) for public customer tracking, while `NotificationService` -> `PitayaCoreWhatsAppProvider` extracts any image/QR URL from message body into media payload fields.
- **Permission invariants**: `JOYERO` cannot create orders (`POST /kanban/orders`); physical customer delivery via status move requires QR scan (`viaQrDelivery`) or admin role; `DISENADOR` cannot mark orders ready/delivered.
- **Revolving credit payment**: a payment with method `REVOLVING_CREDIT` is accepted only for an order whose client is `RESELLER` and is linked to a reseller user with an active MXN credit line. It atomically records the order payment, a 30-day revolving obligation, cupo consumption, and ledger/audit entries. These payments are immutable through the regular payment edit/delete endpoints.
- **Credit notes**: administrators can reduce an open credit obligation with an immutable reasoned note. The note reduces the obligation balance and releases the same amount from a revolving facility; it is recorded separately from a cash payment in the credit ledger and audit trail.

## Global Side Effects
- Transactional Prisma writes to `Order`, `OrderNumberSequence`, `Payment`, `OrderNote`, and `QueueTicket`.
- Disk writes on photo upload (`savePhotoFile`).
- External WhatsApp API requests via `NotificationService`.

## System Verification
- Run: `npm --prefix api test -- src/orders/orders.service.spec.ts src/orders/orders.sequence.spec.ts src/orders/order-number.spec.ts src/orders/order-notes.service.spec.ts src/orders/order-deletion.migration.spec.ts`
