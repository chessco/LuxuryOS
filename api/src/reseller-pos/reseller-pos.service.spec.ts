import { ConflictException } from '@nestjs/common';
import { ResellerPosService } from './reseller-pos.service';

describe('ResellerPosService', () => {
  const prisma = {
    commerceProduct: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  } as any;

  const service = new ResellerPosService(prisma);

  beforeEach(() => {
    prisma.commerceProduct.findMany.mockReset();
    prisma.commerceProduct.create.mockReset();
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
          unitPrice: 1250.5,
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

  it('normalizes a tenant product before adding it to the reseller catalog', async () => {
    prisma.commerceProduct.create.mockResolvedValue({
      id: 'product-3',
      sku: 'RNG-003',
      name: 'Anillo de oro',
      description: null,
      category: null,
      imageUrl: null,
      unitPrice: { toString: () => '2500' },
      currency: 'USD',
      stockOnHand: 2,
      reservedQuantity: 0,
    });

    await expect(
      service.createCatalogProduct('tenant-1', {
        sku: ' rng-003 ',
        name: ' Anillo de oro ',
        unitPrice: 2500,
        currency: 'usd',
        stockOnHand: 2,
      }),
    ).resolves.toMatchObject({
      id: 'product-3',
      sku: 'RNG-003',
      name: 'Anillo de oro',
      currency: 'USD',
      availableQuantity: 2,
    });

    expect(prisma.commerceProduct.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          sku: 'RNG-003',
          name: 'Anillo de oro',
          currency: 'USD',
          stockOnHand: 2,
          availableToResellers: true,
        }),
      }),
    );
  });

  it('keeps an explicitly disabled product hidden from resellers after creation', async () => {
    prisma.commerceProduct.create.mockResolvedValue({
      id: 'product-4',
      sku: 'HID-001',
      name: 'Producto interno',
      description: null,
      category: null,
      imageUrl: null,
      unitPrice: { toString: () => '1' },
      currency: 'MXN',
      stockOnHand: 0,
      reservedQuantity: 0,
    });

    await service.createCatalogProduct('tenant-1', {
      sku: 'hid-001',
      name: 'Producto interno',
      unitPrice: 1,
      stockOnHand: 0,
      availableToResellers: false,
    });

    expect(prisma.commerceProduct.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          availableToResellers: false,
        }),
      }),
    );
  });

  it('maps a duplicate SKU inside the same tenant to a conflict without leaking Prisma details', async () => {
    prisma.commerceProduct.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.createCatalogProduct('tenant-1', {
        sku: 'RNG-001',
        name: 'Anillo',
        unitPrice: 1,
        stockOnHand: 0,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows unexpected persistence failures for the global error handler', async () => {
    const databaseError = new Error('connection lost');
    prisma.commerceProduct.create.mockRejectedValue(databaseError);

    await expect(
      service.createCatalogProduct('tenant-1', {
        sku: 'RNG-002',
        name: 'Anillo',
        unitPrice: 1,
        stockOnHand: 0,
      }),
    ).rejects.toBe(databaseError);
  });
});
