import { OrderType, Prisma } from '@prisma/client';

const ORDER_PREFIX: Record<OrderType, string> = {
  STANDARD: 'PED',
  REPAIR: 'REP',
  MANUFACTURE: 'FAB',
  DESIGN: 'DIS',
  LASER: 'LAS',
  LAYAWAY: 'APT',
  QUOTE: 'COT',
};

/**
 * Reserves the next immutable order number atomically.
 * Deleting or cancelling an order never decrements this counter.
 */
export async function allocateOrderCode(
  tx: Prisma.TransactionClient,
  tenantId: string,
  type: OrderType,
): Promise<string> {
  const sequence = await tx.orderNumberSequence.upsert({
    where: { tenantId_type: { tenantId, type } },
    create: { tenantId, type, currentValue: 1 },
    update: { currentValue: { increment: 1 } },
    select: { currentValue: true },
  });

  return `${ORDER_PREFIX[type]}-${sequence.currentValue}`;
}
