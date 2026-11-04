import { BadRequestException } from '@nestjs/common';
import { OrderType, QuoteStatus } from '@prisma/client';
import { QuotesService } from './quotes.service';

describe('QuotesService', () => {
  const prisma: any = {
    client: { findFirst: jest.fn() },
    quote: { count: jest.fn(), create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
    order: { count: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  };
  const notifications: any = { sendCustomMessage: jest.fn() };
  const strategies: any = { getStrategy: jest.fn() };
  let service: QuotesService;

  beforeEach(() => { jest.clearAllMocks(); service = new QuotesService(prisma, notifications, strategies); });

  it('creates a DRAFT quote without sending WhatsApp', async () => {
    prisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
    prisma.quote.count.mockResolvedValue(0);
    prisma.quote.create.mockImplementation(({ data }: any) => Promise.resolve({ ...data, status: QuoteStatus.DRAFT }));
    const result: any = await service.create('tenant-1', 'user-1', { clientId: 'client-1', pieceType: 'Anillo', totalAmount: 1200 });
    expect(result.quoteCode).toBe('COT-1');
    expect(result.publicToken.length).toBeGreaterThanOrEqual(40);
    expect(notifications.sendCustomMessage).not.toHaveBeenCalled();
  });

  it('keeps public authorization idempotent', async () => {
    prisma.quote.findUnique.mockResolvedValue({ id: 'q1', publicToken: 'token', status: QuoteStatus.AUTHORIZED });
    jest.spyOn(service, 'publicGet').mockResolvedValue({ status: QuoteStatus.AUTHORIZED } as any);
    await expect(service.authorize('token')).resolves.toEqual({ status: QuoteStatus.AUTHORIZED });
    expect(prisma.quote.updateMany).not.toHaveBeenCalled();
  });

  it('does not expose internal notes or raw specifications publicly', async () => {
    prisma.quote.findUnique.mockResolvedValue({ id: 'q1', quoteCode: 'COT-1', status: QuoteStatus.SENT, client: { name: 'Cliente' }, pieceType: 'Anillo', notes: 'nota interna', specifications: { margin: 999 }, totalAmount: 100, validUntil: null, createdAt: new Date(), authorizedAt: null });
    const result: any = await service.publicGet('token');
    expect(result.notes).toBeUndefined();
    expect(result.specifications).toBeUndefined();
    expect(result.totalAmount).toBe(100);
  });

  it('rejects conversion into QUOTE', async () => {
    await expect(service.convert('tenant-1', 'q1', { targetType: OrderType.QUOTE })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('preserves commercial piece data when converting into an order', async () => {
    const quote: any = { id: 'q1', tenantId: 'tenant-1', clientId: 'client-1', quoteCode: 'COT-1', status: QuoteStatus.AUTHORIZED, convertedOrder: null, pieceType: 'Anillo', notes: 'Detalle', totalAmount: 2500, materialCost: 900, laborCost: 1600, specifications: { metal: 'Oro', karats: '14K', size: '7', thickness: '2 mm', weight: '3 g', itemCode: 'ANI-01', imageUrl: '/uploads/anillo.png' } };
    prisma.quote.findFirst.mockResolvedValue(quote);
    prisma.quote.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.count.mockResolvedValue(4);
    prisma.order.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'order-1', specifications: data.specifications }));
    prisma.$transaction.mockImplementation((callback: any) => callback({ quote: prisma.quote, order: prisma.order }));
    strategies.getStrategy.mockReturnValue({ getInitialStatus: () => 'RECEIVED' });

    await service.convert('tenant-1', 'q1', { targetType: OrderType.REPAIR }, 'user-1');

    expect(prisma.order.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ metal: 'Oro', karats: '14K', size: '7', thickness: '2 mm', weight: '3 g', itemCode: 'ANI-01', imageUrl: '/uploads/anillo.png' }) }));
  });
});
