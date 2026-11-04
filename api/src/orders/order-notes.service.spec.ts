import { OrdersService } from './orders.service';

describe('OrdersService order notes', () => {
  it('appends a note without updating existing order notes', async () => {
    const prisma: any = {
      order: { findFirst: jest.fn().mockResolvedValue({ id: 'order-1' }) },
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'user-1', name: 'Laura' }) },
      orderNote: { create: jest.fn().mockResolvedValue({ id: 'note-1', content: 'Nueva indicación' }) },
    };
    const service = new OrdersService(prisma, {} as any, {} as any, {} as any);
    const result = await service.addNote('tenant-1', 'order-1', 'user-1', ' Nueva indicación ');
    expect(result.content).toBe('Nueva indicación');
    expect(prisma.orderNote.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ content: 'Nueva indicación' }) }));
    expect(prisma.order.update).toBeUndefined();
  });
});
