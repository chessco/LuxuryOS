import { ResellerPosService } from './reseller-pos.service';
import { Role } from '@prisma/client';

describe('ResellerPosService', () => {
  const prisma = {
    commerceProduct: {
      findMany: jest.fn(),
    },
    inventoryReservation: { findMany: jest.fn() },
    commerceSale: { groupBy: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  } as any;

  const service = new ResellerPosService(prisma);

  beforeEach(() => {
    prisma.commerceProduct.findMany.mockReset();
    prisma.inventoryReservation.findMany.mockReset();
    prisma.commerceSale.groupBy.mockReset();
    prisma.commerceSale.count.mockReset();
    prisma.commerceSale.findMany.mockReset();
  });

  it('quotes live prices without writes and ignores expired unpaid holds', async () => {
    prisma.commerceProduct.findMany.mockResolvedValue([{
      id: 'p1', sku: 'P1', name: 'Pieza', currency: 'MXN', unitPrice: '200', resellerPrice: '150', stockOnHand: 3, reservedQuantity: 2,
    }]);
    prisma.inventoryReservation.findMany.mockResolvedValue([{ productId: 'p1', quantity: 1 }]);
    const quote = await service.calculateQuote('tenant-1', [{ productId: 'p1', quantity: 2 }]);
    expect(quote).toMatchObject({ totalAmount: 300, publicTotalAmount: 400, estimatedMargin: 100, allItemsAvailable: true, reservesInventory: false });
    expect(quote.lines[0]).toMatchObject({ availableQuantity: 2, commissionAmount: 100 });
    expect(prisma.inventoryReservation.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-1', status: 'ACTIVE' }) }));
  });

  it('limits margin reports to own reseller and excludes internal sales', async () => {
    prisma.commerceSale.groupBy.mockResolvedValue([{ currency: 'MXN', commissionStatus: 'EARNED', _sum: { commissionAmount: '50.00' }, _count: { _all: 1 } }]);
    prisma.commerceSale.count.mockResolvedValue(1);
    prisma.commerceSale.findMany.mockResolvedValue([{ id: 'sale-1', resellerId: 'seller-1', currency: 'MXN', createdAt: new Date(), commissionAmount: '50', commissionStatus: 'EARNED', commissionEarnedAt: new Date(), totalAmount: '150', publicTotalAmount: '200' }]);
    const report = await service.listCommissions({ id: 'seller-1', tenantId: 'tenant-1', role: Role.REVENDEDOR }, { status: 'EARNED' });
    expect(report.totalsByCurrency.MXN.EARNED).toBe(50);
    expect(prisma.commerceSale.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-1', salesChannel: 'RESELLER_POS', resellerId: 'seller-1' }) }));
    await expect(service.listCommissions({ id: 'seller-1', tenantId: 'tenant-1', role: Role.REVENDEDOR }, { resellerId: 'seller-2' })).rejects.toThrow();
  });

  it('returns only the sellable catalog for the requesting tenant', async () => {
    prisma.commerceProduct.findMany.mockResolvedValue([
      {
        id: 'product-1',
        sku: 'RNG-001',
        name: 'Anillo',
        description: null,
        category: 'Joyería',
        imageUrl: null,
        unitPrice: { toString: () => '1250.50' },
        resellerPrice: { toString: () => '1100.00' },
        currency: 'MXN',
        stockOnHand: 4,
        reservedQuantity: 1,
      },
      {
        id: 'product-2',
        sku: 'WCH-001',
        name: 'Reloj',
        description: 'Edición limitada',
        category: 'Relojería',
        imageUrl: 'https://example.test/watch.jpg',
        unitPrice: { toString: () => '8000' },
        currency: 'MXN',
        stockOnHand: 1,
        reservedQuantity: 3,
      },
    ]);

    await expect(service.getCatalog('tenant-1')).resolves.toEqual({
      items: [
        {
          id: 'product-1',
          sku: 'RNG-001',
          name: 'Anillo',
          description: null,
          category: 'Joyería',
          imageUrl: null,
          unitPrice: 1100,
          publicUnitPrice: 1250.5,
          estimatedMargin: 150.5,
          currency: 'MXN',
          availableQuantity: 3,
        },
        {
          id: 'product-2',
          sku: 'WCH-001',
          name: 'Reloj',
          description: 'Edición limitada',
          category: 'Relojería',
          imageUrl: 'https://example.test/watch.jpg',
          unitPrice: 8000,
          publicUnitPrice: 8000,
          estimatedMargin: 0,
          currency: 'MXN',
          availableQuantity: 0,
        },
      ],
    });

    expect(prisma.commerceProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          status: 'ACTIVE',
          availableToResellers: true,
        },
      }),
    );

    expect(prisma.commerceProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ name: 'asc' }, { sku: 'asc' }] }),
    );
  });

  it('returns tenant-scoped inventory with availability states and aggregate quantities', async () => {
    prisma.commerceProduct.findMany.mockResolvedValue([
      {
        id: 'product-1', sku: 'RNG-001', name: 'Anillo', category: 'Joyería', imageUrl: null,
        unitPrice: { toString: () => '1250.50' }, currency: 'MXN', stockOnHand: 10, reservedQuantity: 2,
      },
      {
        id: 'product-2', sku: 'RNG-002', name: 'Aretes', category: 'Joyería', imageUrl: null,
        unitPrice: { toString: () => '500' }, currency: 'MXN', stockOnHand: 2, reservedQuantity: 1,
      },
      {
        id: 'product-3', sku: 'RNG-003', name: 'Dije', category: null, imageUrl: null,
        unitPrice: { toString: () => '750' }, currency: 'MXN', stockOnHand: 4, reservedQuantity: 4,
      },
      {
        id: 'product-4', sku: 'RNG-004', name: 'Pulsera', category: null, imageUrl: null,
        unitPrice: { toString: () => '900' }, currency: 'MXN', stockOnHand: 0, reservedQuantity: 0,
      },
    ]);

    await expect(service.getInventory('tenant-1')).resolves.toEqual({
      items: [
        expect.objectContaining({ sku: 'RNG-001', stockOnHand: 10, reservedQuantity: 2, availableQuantity: 8, availabilityStatus: 'AVAILABLE' }),
        expect.objectContaining({ sku: 'RNG-002', stockOnHand: 2, reservedQuantity: 1, availableQuantity: 1, availabilityStatus: 'LOW_STOCK' }),
        expect.objectContaining({ sku: 'RNG-003', stockOnHand: 4, reservedQuantity: 4, availableQuantity: 0, availabilityStatus: 'RESERVED' }),
        expect.objectContaining({ sku: 'RNG-004', stockOnHand: 0, reservedQuantity: 0, availableQuantity: 0, availabilityStatus: 'OUT_OF_STOCK' }),
      ],
      summary: {
        productCount: 4,
        stockOnHandQuantity: 16,
        reservedQuantity: 7,
        availableQuantity: 9,
        lowStockCount: 1,
        outOfStockCount: 1,
      },
    });

    expect(prisma.commerceProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1', status: 'ACTIVE', availableToResellers: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }, { sku: 'asc' }],
      }),
    );
  });

  it('creates a reseller profile with the fixed sales channel', async () => {
    await expect(
      service.getProfile({
        id: 'user-1',
        name: 'María',
        tenantId: 'tenant-1',
        role: 'REVENDEDOR',
      }),
    ).resolves.toEqual({
      id: 'user-1',
      name: 'María',
      tenantId: 'tenant-1',
      role: 'REVENDEDOR',
      salesChannel: 'RESELLER_POS',
    });
  });

});
