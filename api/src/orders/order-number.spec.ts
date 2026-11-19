import { OrderType } from '@prisma/client';
import { allocateOrderCode } from './order-number';

describe('allocateOrderCode', () => {
  it('increments a persistent tenant/type counter instead of counting active orders', async () => {
    const tx: any = {
      orderNumberSequence: {
        upsert: jest.fn().mockResolvedValue({ currentValue: 69 }),
      },
    };

    await expect(allocateOrderCode(tx, 'tenant-1', OrderType.REPAIR)).resolves.toBe('REP-69');
    expect(tx.orderNumberSequence.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId_type: { tenantId: 'tenant-1', type: OrderType.REPAIR } },
      update: { currentValue: { increment: 1 } },
    }));
  });
});
