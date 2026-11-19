# Order Workflow Strategies (`api/src/orders/strategies`)

## Overview
Strategy pattern encapsulating initial status selection, state transitions, and delivery eligibility checks per `OrderType`.

## Interface
- [`order-strategy.interface.ts`](./order-strategy.interface.ts): `OrderStrategy` (`validateStatusTransition`, `getNextStatus`, `canDeliver`, `getInitialStatus`).
- [`order-strategy.factory.ts`](./order-strategy.factory.ts): `OrderStrategyFactory.getStrategy(type: OrderType)`.
- [`repair.strategy.ts`](./repair.strategy.ts): `RepairStrategy` — used for `OrderType.REPAIR`, `OrderType.DESIGN`, and `OrderType.LASER` (`getInitialStatus() -> OrderStatus.RECEIVED`).
- [`manufacture.strategy.ts`](./manufacture.strategy.ts): `ManufactureStrategy` — used for `OrderType.MANUFACTURE` (`getInitialStatus() -> OrderStatus.RECEIVED`, `canDeliver` requires `READY_FOR_PICKUP`).
- [`layaway.strategy.ts`](./layaway.strategy.ts): `LayawayStrategy` — used for `OrderType.LAYAWAY` (`getInitialStatus() -> OrderStatus.LAYAWAY_OPEN`, `canDeliver` checks `order.balance.toNumber() <= 0`).
- [`standard.strategy.ts`](./standard.strategy.ts): `StandardStrategy` — default strategy (`getInitialStatus() -> OrderStatus.DRAFT`, stage progression via `OrderStage`, `canDeliver` checks `LISTO_ENTREGA` or `ENTREGADO_POSTVENTA`).

## Invariants
- `OrderStrategyFactory.getStrategy(OrderType.QUOTE)` throws `BadRequestException`: quotes use an independent workflow and must not enter operative order strategies.
- `REPAIR`, `DESIGN`, and `LASER` share `RepairStrategy` for base `OrderStatus` lifecycle while workshop jeweler assignment rules are enforced in `OrdersService`.

## Side Effects
- None directly (pure domain policy objects).

## Verification
- Run: `npm --prefix api test -- src/orders/orders.service.spec.ts`
