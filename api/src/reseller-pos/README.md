# Reseller POS Domain (`api/src/reseller-pos`)

## Overview
Isolated backend entrypoint and read/checkout facades for **Revendedores** (`SalesChannel.RESELLER_POS`), exposing only reseller-permitted catalog, inventory, credit view, and self-scoped sales operations while delegating transactional inventory and credit guarantees to `CommerceService`.

## Interface
- [`reseller-pos.module.ts`](./reseller-pos.module.ts): `ResellerPosModule` imports `CommerceModule` and registers `ResellerPosController` and `ResellerPosService`.
- [`reseller-pos.controller.ts`](./reseller-pos.controller.ts): `ResellerPosController` (`/reseller`, guarded by `JwtAuthGuard` + `RolesGuard`, roles `REVENDEDOR | TENANT_ADMIN | SYSTEM_ADMIN`):
  - `GET /reseller/profile` -> `resellerPosService.getProfile`
  - `GET /reseller/catalog` -> `resellerPosService.getCatalog`
  - `POST /reseller/catalog` (`TENANT_ADMIN | SYSTEM_ADMIN` only) -> `commerceService.createProduct`
  - `GET /reseller/inventory` -> `resellerPosService.getInventory`
  - `GET /reseller/credit` -> `commerceService.getResellerCredit`
  - `POST /reseller/quotes` -> stateless live price and availability preview, no inventory reservation.
  - `GET /reseller/commissions` -> tenant and reseller scoped margin report; cashier role is excluded.
  - `GET /reseller/sales`, `GET /reseller/sales/:id`, `POST /reseller/sales`, `POST /reseller/sales/:id/cancel` -> delegated to `commerceService` with `SalesChannel.RESELLER_POS` and `scopeToReseller: true`.
- [`reseller-pos.service.ts`](./reseller-pos.service.ts): `ResellerPosService` maps active tenant products flagged `availableToResellers: true` into explicit response shapes (`availableQuantity`, `resellerPrice ?? unitPrice`, availability buckets `AVAILABLE | LOW_STOCK | RESERVED | OUT_OF_STOCK`).
- [`reseller-pos.contract.ts`](./reseller-pos.contract.ts): TypeScript response contracts synchronized with [`docs/contracts/reseller-pos.openapi.yaml`](../../../docs/contracts/reseller-pos.openapi.yaml).

## Invariants
- **Auth-layer boundary (`JwtAuthGuard`)**: Authenticated users with role `Role.REVENDEDOR` are blocked (`ForbiddenException`) from any route outside `/reseller` or `/reseller/*`.
- **Tenant & reseller ownership**: Queries scope strictly by `req.user.tenantId`, and `REVENDEDOR` sales read/cancel paths enforce `scopeToReseller: true` (`resellerId === req.user.id`).
- **Channel write isolation**: Reseller catalog creation (`POST /reseller/catalog`) requires admin roles and routes through `CommerceService.createProduct` to maintain auditable inventory entries; resellers cannot settle payments or grant credit directly.
- **No direct Prisma model leakage**: Controllers return serialized contract DTOs (`ResellerProfileResponse`, `ResellerCatalogResponse`, `ResellerInventoryResponse`) matching `reseller-pos.openapi.yaml`.

## Side Effects
- Read queries against `CommerceProduct` via `PrismaService`.
- Transactional inventory reservations, sales records, and cancellations delegated to `CommerceService`.

## Verification
- Run: `npm --prefix api run test:reseller`
