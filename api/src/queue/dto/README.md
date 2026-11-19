# Queue DTOs (`api/src/queue/dto`)

## Overview
Data Transfer Objects validated by `class-validator` for the queue ticketing endpoints in `QueueController`.

## Interface
- [`create-queue-ticket.dto.ts`](./create-queue-ticket.dto.ts):
  - `CreateQueueTicketDto`:
    - `kind: QueueTicketKind` (required `@IsEnum(QueueTicketKind)`)
    - `customerName: string` (required `@IsNotEmpty() @IsString()`)
    - `customerPhone?: string` (optional `@IsString()`)
    - `customerEmail?: string` (optional `@IsEmail()`)
    - `recommendationIds?: string[]` (optional `@IsArray()`)

## Invariants
- `kind` must belong to the Prisma `QueueTicketKind` enum (`REPAIR`, `SALE`, `PICKUP`).
- `customerName` must be non-empty on ticket creation.

## Side Effects
- None (pure validation DTO definitions).

## Verification
- Run: `npm --prefix api run build`
