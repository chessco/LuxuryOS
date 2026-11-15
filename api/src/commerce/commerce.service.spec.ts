import 'reflect-metadata';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  CommercePaymentStatus,
  CommerceProductStatus,
  CommerceSaleStatus,
  CreditFacilityType,
  CreditSubjectType,
  InventoryMovementType,
  InventoryReservationStatus,
  Role,
  SalesChannel,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CommerceService } from './commerce.service';
import { CreateProductDto, RecordProductMovementDto, UpdateProductDto } from './dto/commerce-product.dto';
import { InternalPosController } from './internal-pos.controller';
import { ROLES_KEY } from '../auth/roles.decorator';

describe('CommerceService Inventory CRUD', () => {
  const tx = {
    commerceProduct: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      delete: jest.fn(),
    },
    inventoryMovement: {
      create: jest.fn(),
    },
    commerceAuditLog: {
      create: jest.fn(),
    },
  } as any;

  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    commerceProduct: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    inventoryMovement: {
      findMany: jest.fn(),
    },
  } as any;

  const service = new CommerceService(prisma);
  const admin = { id: 'admin-1', tenantId: 'tenant-1', role: 'TENANT_ADMIN' as const };
  const seller = { id: 'seller-1', tenantId: 'tenant-1', role: 'VENDEDOR' as const };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
  });

  it('rejects inventory CRUD for non-admin roles', async () => {
    await expect(service.listProducts(seller)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.createProduct(seller, { sku: 'RNG-1', name: 'Anillo', unitPrice: 100 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.updateProduct(seller, 'p1', { name: 'Otro' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.deleteProduct(seller, 'p1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists tenant products with computed availability and history flags', async () => {
    prisma.commerceProduct.findMany.mockResolvedValue([
      {
        id: 'p1',
        sku: 'RNG-DIA-001',
        name: 'Anillo Diamante Solitario',
        description: 'Platino',
        category: 'Joyería',
        imageUrl: null,
        unitCost: { toString: () => '85000.00' },
        unitPrice: { toString: () => '150000.00' },
        resellerPrice: { toString: () => '135000.00' },
        wholesalePrice: null,
        currency: 'MXN',
        stockOnHand: 3,
        reservedQuantity: 1,
        availableToResellers: true,
        status: CommerceProductStatus.ACTIVE,
        createdAt: new Date('2026-11-11T00:00:00Z'),
        updatedAt: new Date('2026-11-11T00:00:00Z'),
        _count: { saleItems: 1, reservations: 0, inventoryEntryItems: 0, inventoryMovements: 0 },
      },
    ]);

    const result = await service.listProducts(admin);
    expect(prisma.commerceProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: 'p1',
        unitCost: 85000,
        unitPrice: 150000,
        resellerPrice: 135000,
        wholesalePrice: null,
        availableQuantity: 2,
        hasHistory: true,
      }),
    ]);
  });

  it('creates a product, normalizes SKU and currency, and logs audit', async () => {
    tx.commerceProduct.create.mockResolvedValue({
      id: 'p1',
      sku: 'RNG-001',
      name: 'Anillo Oro',
      description: null,
      category: 'Joyería',
      imageUrl: null,
      unitCost: 1400,
      unitPrice: 2500,
      resellerPrice: 2200,
      wholesalePrice: 1950,
      currency: 'MXN',
      stockOnHand: 4,
      reservedQuantity: 0,
      availableToResellers: true,
      status: CommerceProductStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { saleItems: 0, reservations: 0, inventoryEntryItems: 0, inventoryMovements: 0 },
    });

    const created = await service.createProduct(admin, {
      sku: ' rng-001 ',
      name: ' Anillo Oro ',
      category: 'Joyería',
      unitCost: 1400,
      unitPrice: 2500,
      resellerPrice: 2200,
      wholesalePrice: 1950,
      currency: 'mxn',
      stockOnHand: 4,
      availableToResellers: true,
    });

    expect(tx.commerceProduct.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          sku: 'RNG-001',
          name: 'Anillo Oro',
          currency: 'MXN',
          stockOnHand: 4,
        }),
      }),
    );
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: InventoryMovementType.INITIAL_STOCK,
          quantityDelta: 4,
          balanceAfter: 4,
        }),
      }),
    );
    expect(created.unitCost).toBe(1400);
    expect(created.resellerPrice).toBe(2200);
    expect(created.wholesalePrice).toBe(1950);
    expect(tx.commerceAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'PRODUCT_CREATED', entityId: 'p1' }),
      }),
    );
    expect(created.hasHistory).toBe(false);
  });

  it('maps duplicate SKU errors to ConflictException', async () => {
    tx.commerceProduct.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.createProduct(admin, { sku: 'RNG-001', name: 'Anillo', unitPrice: 100 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects unsafe SVG data URLs on create/update', async () => {
    await expect(
      service.createProduct(admin, {
        sku: 'RNG-SVG',
        name: 'Anillo',
        unitPrice: 100,
        imageUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects direct stockOnHand edits on updateProduct and archiving reserved stock', async () => {
    prisma.commerceProduct.findFirst.mockResolvedValue({
      id: 'p1',
      sku: 'RNG-001',
      reservedQuantity: 2,
      stockOnHand: 3,
    });

    await expect(service.updateProduct(admin, 'p1', { stockOnHand: 1 } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.updateProduct(admin, 'p1', { status: CommerceProductStatus.ARCHIVED }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws NotFoundException when updating a product outside tenant', async () => {
    prisma.commerceProduct.findFirst.mockResolvedValue(null);
    await expect(service.updateProduct(admin, 'missing', { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('archives instead of deleting when a product has historical movements or sales', async () => {
    prisma.commerceProduct.findFirst.mockResolvedValue({
      id: 'p1',
      sku: 'RNG-001',
      name: 'Anillo',
      reservedQuantity: 0,
      _count: { saleItems: 1, reservations: 0, inventoryEntryItems: 0, inventoryMovements: 0 },
    });
    tx.commerceProduct.update.mockResolvedValue({
      id: 'p1',
      sku: 'RNG-001',
      name: 'Anillo',
      description: null,
      category: null,
      imageUrl: null,
      unitPrice: 100,
      currency: 'MXN',
      stockOnHand: 0,
      reservedQuantity: 0,
      availableToResellers: false,
      status: CommerceProductStatus.ARCHIVED,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { saleItems: 1, reservations: 0, inventoryEntryItems: 0, inventoryMovements: 0 },
    });

    const result = await service.deleteProduct(admin, 'p1');
    expect(result).toMatchObject({ deleted: false, archived: true });
    expect(tx.commerceProduct.delete).not.toHaveBeenCalled();
    expect(tx.commerceAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'PRODUCT_ARCHIVED' }) }),
    );
  });

  it('physically deletes an unused product and logs PRODUCT_DELETED', async () => {
    prisma.commerceProduct.findFirst.mockResolvedValue({
      id: 'p2',
      sku: 'RNG-002',
      name: 'Dije',
      reservedQuantity: 0,
      _count: { saleItems: 0, reservations: 0, inventoryEntryItems: 0, inventoryMovements: 0 },
    });

    const result = await service.deleteProduct(admin, 'p2');
    expect(result).toEqual({
      deleted: true,
      archived: false,
      message: 'Artículo eliminado del inventario.',
      id: 'p2',
    });
    expect(tx.commerceProduct.delete).toHaveBeenCalledWith({ where: { id: 'p2' } });
  });

  it('blocks deleting a product with active reservations', async () => {
    prisma.commerceProduct.findFirst.mockResolvedValue({
      id: 'p3',
      sku: 'RNG-003',
      reservedQuantity: 1,
      _count: { saleItems: 0, reservations: 1, inventoryEntryItems: 0, inventoryMovements: 0 },
    });

    await expect(service.deleteProduct(admin, 'p3')).rejects.toBeInstanceOf(ConflictException);
  });

  it('builds kardex summary and records daily entry, exit, and adjustment movements', async () => {
    const productRow = {
      id: 'p1',
      sku: 'RNG-001',
      name: 'Anillo',
      description: null,
      category: 'Joyería',
      imageUrl: null,
      unitPrice: 1000,
      resellerPrice: 900,
      wholesalePrice: 800,
      currency: 'MXN',
      stockOnHand: 5,
      reservedQuantity: 1,
      availableToResellers: true,
      status: CommerceProductStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { saleItems: 0, reservations: 0, inventoryEntryItems: 0, inventoryMovements: 3 },
    };

    prisma.commerceProduct.findFirst.mockResolvedValue(productRow);
    prisma.inventoryMovement.findMany.mockResolvedValue([
      {
        id: 'm3',
        type: InventoryMovementType.ADJUSTMENT,
        quantityDelta: -1,
        balanceAfter: 5,
        unitCost: null,
        currency: 'MXN',
        comments: 'Merma',
        entryId: null,
        saleId: null,
        createdAt: new Date('2026-11-11T12:00:00Z'),
        entry: null,
        sale: null,
        createdBy: { name: 'Admin', email: 'admin@cared.mx' },
      },
      {
        id: 'm2',
        type: InventoryMovementType.EXIT,
        quantityDelta: -2,
        balanceAfter: 6,
        unitCost: null,
        currency: 'MXN',
        comments: 'Venta',
        entryId: null,
        saleId: 'sale-1',
        createdAt: new Date('2026-11-11T11:00:00Z'),
        entry: null,
        sale: { id: 'sale-1', salesChannel: 'JEWELRY_INTERNAL', customerName: 'Cliente' },
        createdBy: { name: 'Admin', email: 'admin@cared.mx' },
      },
      {
        id: 'm1',
        type: InventoryMovementType.ENTRY,
        quantityDelta: 8,
        balanceAfter: 8,
        unitCost: 500,
        currency: 'MXN',
        comments: 'Compra',
        entryId: 'entry-1',
        saleId: null,
        createdAt: new Date('2026-11-11T10:00:00Z'),
        entry: { id: 'entry-1', type: 'ENTRY', supplier: { name: 'Proveedor' } },
        sale: null,
        createdBy: { name: 'Admin', email: 'admin@cared.mx' },
      },
    ]);

    const kardex = await service.getProductKardex(admin, 'p1');
    expect(kardex.summary).toEqual({
      totalIn: 8,
      totalOut: 2,
      netAdjustments: -1,
      movementCount: 3,
      calculatedStock: 5,
    });
    expect(kardex.movements[0]).toMatchObject({ id: 'm3', balanceAfter: 5, createdByName: 'Admin' });
    expect(kardex.movements[2]).toMatchObject({ id: 'm1', supplierName: 'Proveedor', unitCost: 500 });

    tx.commerceProduct.findFirst.mockResolvedValue(productRow);
    await expect(
      service.recordProductMovement(admin, 'p1', { type: 'EXIT', quantityDelta: -5, comments: 'Exceso' }),
    ).rejects.toBeInstanceOf(ConflictException);

    tx.commerceProduct.updateMany.mockResolvedValue({ count: 1 });
    tx.inventoryMovement.create.mockResolvedValue({
      id: 'm4',
      type: InventoryMovementType.EXIT,
      quantityDelta: -2,
      balanceAfter: 3,
      unitCost: null,
      currency: 'MXN',
      comments: 'Salida mostrador',
      entryId: null,
      saleId: null,
      createdAt: new Date(),
    });
    tx.commerceProduct.findFirstOrThrow.mockResolvedValue({ ...productRow, stockOnHand: 3 });

    const recorded = await service.recordProductMovement(admin, 'p1', {
      type: 'EXIT',
      quantityDelta: 2,
      comments: 'Salida mostrador',
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: InventoryMovementType.EXIT,
          quantityDelta: -2,
          balanceAfter: 3,
        }),
      }),
    );
    expect(recorded.product.stockOnHand).toBe(3);
  });
});

describe('Commerce Product DTOs & Controller', () => {
  it('validates CreateProductDto and preserves false booleans', async () => {
    const dto = plainToInstance(CreateProductDto, {
      sku: '  rng-10  ',
      name: '  Aretes  ',
      unitPrice: '450.5',
      stockOnHand: '2',
      availableToResellers: false,
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.sku).toBe('rng-10');
    expect(dto.name).toBe('Aretes');
    expect(dto.availableToResellers).toBe(false);

    const invalid = plainToInstance(CreateProductDto, {
      sku: '   ',
      name: '',
      unitPrice: -5,
      stockOnHand: 1.5,
    });
    const errors = await validate(invalid);
    expect(errors.map((e) => e.property)).toEqual(
      expect.arrayContaining(['sku', 'name', 'unitPrice', 'stockOnHand']),
    );
  });

  it('validates partial UpdateProductDto and preserves null optional prices', async () => {
    const dto = plainToInstance(UpdateProductDto, {
      unitCost: '',
      unitPrice: 999.99,
      resellerPrice: null,
      wholesalePrice: '',
      status: CommerceProductStatus.INACTIVE,
      availableToResellers: 'false',
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.availableToResellers).toBe(false);
    expect(dto.unitCost).toBeNull();
    expect(dto.resellerPrice).toBeNull();
    expect(dto.wholesalePrice).toBeNull();
  });

  it('delegates controller CRUD and kardex routes to CommerceService', async () => {
    const mockService = {
      listProducts: jest.fn(),
      getProduct: jest.fn(),
      getProductKardex: jest.fn(),
      recordProductMovement: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      settleSale: jest.fn(),
    } as any;
    const controller = new InternalPosController(mockService);
    const req = { user: { id: 'admin-1', tenantId: 'tenant-1', role: 'TENANT_ADMIN' } };

    controller.listProducts(req, CommerceProductStatus.ACTIVE);
    expect(mockService.listProducts).toHaveBeenCalledWith(req.user, CommerceProductStatus.ACTIVE);

    controller.getProduct(req, 'p1');
    expect(mockService.getProduct).toHaveBeenCalledWith(req.user, 'p1');

    controller.getProductKardex(req, 'p1', InventoryMovementType.ENTRY);
    expect(mockService.getProductKardex).toHaveBeenCalledWith(req.user, 'p1', InventoryMovementType.ENTRY);

    const moveBody = { type: 'ADJUSTMENT', quantityDelta: -3, comments: 'Conteo' };
    controller.recordProductMovement(req, 'p1', moveBody as any);
    expect(mockService.recordProductMovement).toHaveBeenCalledWith(req.user, 'p1', moveBody);

    const createBody = { sku: 'A-1', name: 'Item', unitPrice: 10 };
    controller.createProduct(req, createBody as any);
    expect(mockService.createProduct).toHaveBeenCalledWith(req.user, createBody);

    const updateBody = { name: 'Item 2' };
    controller.updateProduct(req, 'p1', updateBody as any);
    expect(mockService.updateProduct).toHaveBeenCalledWith(req.user, 'p1', updateBody);

    controller.deleteProduct(req, 'p1');
    expect(mockService.deleteProduct).toHaveBeenCalledWith(req.user, 'p1');

    const settleBody = { payments: [{ amount: 100, method: 'Efectivo' }] };
    controller.settleSale(req, 'sale-1', settleBody, 'settle-key-1');
    expect(mockService.settleSale).toHaveBeenCalledWith(
      req.user,
      'sale-1',
      settleBody,
      'settle-key-1',
    );

    const dto = plainToInstance(RecordProductMovementDto, moveBody);
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantityDelta).toBe(-3);
  });

  it('restricts internal sale cancellation metadata to administrators', () => {
    expect(Reflect.getMetadata(ROLES_KEY, InternalPosController.prototype.cancelSale)).toEqual([
      Role.TENANT_ADMIN,
      Role.SYSTEM_ADMIN,
    ]);
  });
});

describe('CommerceService Omnichannel OMS & Handoff', () => {
  const tx = {
    commerceProduct: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    commerceSale: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    commercePayment: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    client: {
      findFirst: jest.fn(),
    },
    inventoryReservation: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    inventoryMovement: {
      create: jest.fn(),
    },
    commerceAuditLog: {
      create: jest.fn(),
    },
  } as any;

  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    commerceSale: {
      findFirst: jest.fn(),
    },
    commercePayment: {
      findFirst: jest.fn(),
    },
  } as any;

  let service: CommerceService;
  const resellerActor = { id: 'reseller-1', tenantId: 'tenant-1', role: Role.REVENDEDOR };
  const cashierActor = { id: 'cashier-1', tenantId: 'tenant-1', role: Role.VENDEDOR };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    tx.inventoryReservation.findMany.mockResolvedValue([]);
    tx.inventoryReservation.count.mockResolvedValue(0);
    tx.commercePayment.findFirst.mockResolvedValue(null);
    tx.client.findFirst.mockResolvedValue(null);
    prisma.commerceSale.findFirst.mockResolvedValue(null);
    prisma.commercePayment.findFirst.mockResolvedValue(null);
    service = new CommerceService(prisma);
  });

  it('reserves stock on RESELLER_POS checkout using resellerPrice without immediate payment and generates handoffCode', async () => {
    tx.commerceSale.findFirst.mockResolvedValue(null);
    tx.commerceProduct.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        sku: 'RNG-001',
        name: 'Anillo Solitario',
        currency: 'MXN',
        unitPrice: 150000,
        resellerPrice: 120000,
        stockOnHand: 3,
        reservedQuantity: 1,
      },
    ]);
    tx.client.findFirst.mockResolvedValue({ id: 'client-1' });
    tx.commerceSale.create.mockResolvedValue({ id: '12345678-aaaa-bbbb-cccc-111111111111', currency: 'MXN' });
    tx.commerceProduct.updateMany.mockResolvedValue({ count: 1 });
    tx.commerceSale.findUniqueOrThrow.mockResolvedValue({
      id: '12345678-aaaa-bbbb-cccc-111111111111',
      resellerId: 'reseller-1',
      reseller: { name: 'Ana Revendedora', email: 'ana@cared.mx' },
      salesChannel: SalesChannel.RESELLER_POS,
      status: CommerceSaleStatus.PENDING_PAYMENT,
      paymentStatus: CommercePaymentStatus.PENDING,
      currency: 'MXN',
      customerName: 'Sofía Pérez',
      customerPhone: '5512345678',
      subtotalAmount: 240000,
      discountAmount: 0,
      totalAmount: 240000,
      paidAmount: 0,
      notes: 'Entrega hoy',
      cancellationReason: null,
      paidAt: null,
      cancelledAt: null,
      createdAt: new Date('2026-01-01T12:00:00Z'),
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          skuSnapshot: 'RNG-001',
          nameSnapshot: 'Anillo Solitario',
          quantity: 2,
          unitPrice: 120000,
          lineTotal: 240000,
        },
      ],
      payments: [],
      reservations: [
        {
          id: 'res-1',
          productId: 'prod-1',
          quantity: 2,
          status: InventoryReservationStatus.ACTIVE,
          expiresAt: new Date('2026-01-01T12:30:00Z'),
        },
      ],
    });

    const result = await service.checkout(
      resellerActor,
      SalesChannel.RESELLER_POS,
      {
        items: [{ productId: 'prod-1', quantity: 2 }],
        clientId: 'client-1',
        customerName: 'Sofía Pérez',
        customerPhone: '5512345678',
        notes: 'Entrega hoy',
      },
      'idem-reseller-1',
    );

    expect(tx.commerceProduct.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { reservedQuantity: 3 },
      }),
    );
    expect(tx.inventoryReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: InventoryReservationStatus.ACTIVE,
          quantity: 2,
        }),
      }),
    );
    expect(tx.client.findFirst).toHaveBeenCalledWith({
      where: { id: 'client-1', tenantId: 'tenant-1' },
      select: { id: true },
    });
    expect(tx.commerceSale.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ clientId: 'client-1' }) }),
    );
    expect(result.handoffCode).toBe('ORD-12345678');
    expect(result.totalAmount).toBe(240000);
    expect(result.balanceDue).toBe(240000);
  });

  it('rejects a client that does not belong to the sale tenant', async () => {
    tx.commerceSale.findFirst.mockResolvedValue(null);
    tx.client.findFirst.mockResolvedValue(null);

    await expect(
      service.checkout(
        resellerActor,
        SalesChannel.RESELLER_POS,
        { items: [{ productId: 'prod-1', quantity: 1 }], clientId: 'foreign-client' },
        'idem-foreign-client',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(tx.commerceProduct.findMany).not.toHaveBeenCalled();
    expect(tx.commerceSale.create).not.toHaveBeenCalled();
  });

  it('rejects a checkout that mixes product currencies', async () => {
    tx.commerceSale.findFirst.mockResolvedValue(null);
    tx.commerceProduct.findMany.mockResolvedValue([
      { id: 'prod-mxn', sku: 'MXN-1', name: 'Anillo', currency: 'MXN', unitPrice: 100, stockOnHand: 2, reservedQuantity: 0 },
      { id: 'prod-usd', sku: 'USD-1', name: 'Reloj', currency: 'USD', unitPrice: 20, stockOnHand: 2, reservedQuantity: 0 },
    ]);

    await expect(
      service.checkout(
        cashierActor,
        SalesChannel.JEWELRY_INTERNAL,
        { items: [{ productId: 'prod-mxn', quantity: 1 }, { productId: 'prod-usd', quantity: 1 }] },
        'idem-mixed-currency',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.commerceSale.create).not.toHaveBeenCalled();
  });

  it('creates internal partial-payment reservations without an automatic expiration', async () => {
    tx.commerceSale.findFirst.mockResolvedValue(null);
    tx.commerceProduct.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        sku: 'RNG-001',
        name: 'Anillo',
        currency: 'MXN',
        unitPrice: 100,
        resellerPrice: 90,
        stockOnHand: 2,
        reservedQuantity: 0,
      },
    ]);
    tx.commerceSale.create.mockResolvedValue({ id: 'partial0-0000-0000-0000-000000000000', currency: 'MXN' });
    tx.commerceProduct.updateMany.mockResolvedValue({ count: 1 });
    tx.commerceSale.findUniqueOrThrow.mockResolvedValue({
      id: 'partial0-0000-0000-0000-000000000000',
      resellerId: 'cashier-1',
      reseller: { name: 'Caja', email: 'caja@cared.mx' },
      salesChannel: SalesChannel.JEWELRY_INTERNAL,
      status: CommerceSaleStatus.PENDING_PAYMENT,
      paymentStatus: CommercePaymentStatus.PARTIAL,
      currency: 'MXN',
      subtotalAmount: 100,
      discountAmount: 0,
      totalAmount: 100,
      paidAmount: 25,
      createdAt: new Date(),
      items: [],
      payments: [],
      reservations: [],
    });

    await service.checkout(
      cashierActor,
      SalesChannel.JEWELRY_INTERNAL,
      {
        items: [{ productId: 'prod-1', quantity: 1 }],
        payments: [{ amount: 25, method: 'Efectivo' }],
      },
      'idem-internal-partial',
    );

    expect(tx.inventoryReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: InventoryReservationStatus.ACTIVE,
          expiresAt: null,
        }),
      }),
    );
  });

  it('rejects RESELLER_POS checkout attempts that include payments and returns idempotent replays directly', async () => {
    await expect(
      service.checkout(
        resellerActor,
        SalesChannel.RESELLER_POS,
        {
          items: [{ productId: 'prod-1', quantity: 1 }],
          payments: [{ amount: 100, method: 'Efectivo' }],
        },
        'idem-forbidden-pay',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    tx.commerceSale.findFirst.mockResolvedValue({
      id: 'abcdef12-0000-0000-0000-000000000000',
      resellerId: 'reseller-1',
      reseller: { name: 'Ana Revendedora', email: 'ana@cared.mx' },
      salesChannel: SalesChannel.RESELLER_POS,
      status: CommerceSaleStatus.PENDING_PAYMENT,
      paymentStatus: CommercePaymentStatus.PENDING,
      currency: 'MXN',
      subtotalAmount: 100,
      discountAmount: 0,
      totalAmount: 100,
      paidAmount: 0,
      createdAt: new Date(),
      items: [],
      payments: [],
      reservations: [],
    });

    const replay = await service.checkout(
      resellerActor,
      SalesChannel.RESELLER_POS,
      { items: [{ productId: 'prod-1', quantity: 1 }] },
      'idem-replay',
    );
    expect(tx.commerceSale.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          salesChannel: SalesChannel.RESELLER_POS,
          resellerId: 'reseller-1',
          idempotencyKey: 'idem-replay',
        },
      }),
    );
    expect(replay.handoffCode).toBe('ORD-ABCDEF12');
    expect(tx.commerceSale.create).not.toHaveBeenCalled();
  });

  it('does not let a VENDEDOR bypass the controller to cancel an internal sale', async () => {
    await expect(
      service.cancelSale(cashierActor, 'sale-1', { reason: 'No autorizado' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('keeps reseller detail lookups inside the RESELLER_POS channel', async () => {
    tx.commerceSale.findFirst.mockResolvedValue(null);

    await expect(service.getSale(resellerActor, 'sale-1', true)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(tx.commerceSale.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'sale-1',
          tenantId: 'tenant-1',
          salesChannel: SalesChannel.RESELLER_POS,
        },
      }),
    );
  });

  it('returns the scoped replay when concurrent checkout hits the idempotency unique key', async () => {
    const replay = {
      id: 'race1234-0000-0000-0000-000000000000',
      resellerId: 'reseller-1',
      reseller: { name: 'Ana', email: 'ana@cared.mx' },
      salesChannel: SalesChannel.RESELLER_POS,
      status: CommerceSaleStatus.PENDING_PAYMENT,
      paymentStatus: CommercePaymentStatus.PENDING,
      currency: 'MXN',
      subtotalAmount: 100,
      discountAmount: 0,
      totalAmount: 100,
      paidAmount: 0,
      createdAt: new Date(),
      items: [],
      payments: [],
      reservations: [],
    };
    prisma.$transaction.mockRejectedValueOnce({ code: 'P2002' });
    prisma.commerceSale.findFirst.mockResolvedValue(replay);

    const result = await service.checkout(
      resellerActor,
      SalesChannel.RESELLER_POS,
      { items: [{ productId: 'prod-1', quantity: 1 }] },
      'idem-race',
    );

    expect(prisma.commerceSale.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          salesChannel: SalesChannel.RESELLER_POS,
          resellerId: 'reseller-1',
          idempotencyKey: 'idem-race',
        },
      }),
    );
    expect(result.id).toBe(replay.id);
  });

  it('releases expired reservations lazily and scopes listSales for REVENDEDOR', async () => {
    tx.inventoryReservation.findMany.mockResolvedValue([
      { id: 'res-exp-1', productId: 'prod-1', saleId: 'sale-exp-1', quantity: 2 },
    ]);
    tx.inventoryReservation.updateMany.mockResolvedValue({ count: 1 });
    tx.commerceProduct.findFirst.mockResolvedValue({ id: 'prod-1', reservedQuantity: 3 });
    tx.commerceProduct.updateMany.mockResolvedValue({ count: 1 });
    tx.commerceSale.updateMany.mockResolvedValue({ count: 1 });
    tx.commerceSale.findMany.mockResolvedValue([]);

    await service.listSales(resellerActor, { scopeToReseller: true });

    expect(tx.inventoryReservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          status: InventoryReservationStatus.ACTIVE,
          sale: {
            is: expect.objectContaining({
              salesChannel: SalesChannel.RESELLER_POS,
              resellerId: 'reseller-1',
              paidAmount: 0,
            }),
          },
        }),
      }),
    );
    expect(tx.inventoryReservation.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'res-exp-1',
        status: InventoryReservationStatus.ACTIVE,
        expiresAt: expect.objectContaining({ lte: expect.any(Date) }),
        sale: { is: expect.objectContaining({ paidAmount: 0 }) },
      }),
      data: { status: InventoryReservationStatus.EXPIRED },
    });
    expect(tx.commerceProduct.updateMany).toHaveBeenCalledWith({
      where: { id: 'prod-1', tenantId: 'tenant-1', reservedQuantity: 3 },
      data: { reservedQuantity: 1 },
    });
    expect(tx.commerceSale.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'sale-exp-1', status: CommerceSaleStatus.PENDING_PAYMENT }),
        data: { status: CommerceSaleStatus.EXPIRED },
      }),
    );
    expect(tx.commerceSale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-1', resellerId: 'reseller-1' }),
      }),
    );
  });

  it('filters sales in Prisma before applying the result limit', async () => {
    tx.commerceSale.findMany.mockResolvedValue([]);

    await service.listSales(cashierActor, { q: 'ORD-abc12345' });

    expect(tx.commerceSale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          OR: expect.arrayContaining([
            { id: { contains: 'abc12345' } },
            { customerName: { contains: 'ORD-abc12345' } },
          ]),
        }),
        take: 100,
      }),
    );
  });

  it('filters legacy timed reservations by unpaid pending sale before expiration', async () => {
    tx.commerceSale.findMany.mockResolvedValue([]);

    await service.listSales(resellerActor, { scopeToReseller: true });

    expect(tx.inventoryReservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          expiresAt: expect.objectContaining({ lte: expect.any(Date), not: null }),
          sale: {
            is: expect.objectContaining({
              paidAmount: 0,
              status: CommerceSaleStatus.PENDING_PAYMENT,
            }),
          },
        }),
      }),
    );
    expect(tx.inventoryReservation.updateMany).not.toHaveBeenCalled();
    expect(tx.commerceProduct.update).not.toHaveBeenCalled();
  });

  it('settles a PENDING_PAYMENT sale in Cared POS, consumes reservation, decrements stock and writes Kardex EXIT', async () => {
    const baseSale = {
      id: 'sale1234-0000-0000-0000-000000000000',
      resellerId: 'reseller-1',
      reseller: { name: 'Ana Revendedora', email: 'ana@cared.mx' },
      salesChannel: SalesChannel.RESELLER_POS,
      status: CommerceSaleStatus.PENDING_PAYMENT,
      paymentStatus: CommercePaymentStatus.PENDING,
      currency: 'MXN',
      subtotalAmount: 120000,
      discountAmount: 0,
      totalAmount: 120000,
      paidAmount: 0,
      notes: null,
      createdAt: new Date(),
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          skuSnapshot: 'RNG-001',
          nameSnapshot: 'Anillo',
          quantity: 2,
          unitPrice: 60000,
          lineTotal: 120000,
        },
      ],
      payments: [],
      reservations: [
        {
          id: 'res-1',
          productId: 'prod-1',
          quantity: 2,
          status: InventoryReservationStatus.ACTIVE,
          expiresAt: new Date(Date.now() + 100000),
        },
      ],
    };
    tx.commerceSale.findFirst.mockResolvedValue(baseSale);
    tx.commerceSale.updateMany.mockResolvedValue({ count: 1 });
    tx.inventoryReservation.updateMany.mockResolvedValue({ count: 1 });
    tx.commerceProduct.findFirst.mockResolvedValue({
      id: 'prod-1',
      sku: 'RNG-001',
      stockOnHand: 5,
      reservedQuantity: 2,
    });
    tx.commerceProduct.updateMany.mockResolvedValue({ count: 1 });
    tx.commerceSale.findUniqueOrThrow.mockResolvedValue({
      ...baseSale,
      status: CommerceSaleStatus.PAID,
      paymentStatus: CommercePaymentStatus.PAID,
      paidAmount: 120000,
      paidAt: new Date(),
    });

    const settled = await service.settleSale(
      cashierActor,
      baseSale.id,
      { payments: [{ amount: 120000, method: 'Tarjeta', reference: 'TP-99' }] },
      'settle-paid-1',
    );

    expect(tx.inventoryReservation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: InventoryReservationStatus.CONSUMED },
      }),
    );
    expect(tx.commerceProduct.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { stockOnHand: 3, reservedQuantity: 0 },
      }),
    );
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: InventoryMovementType.EXIT,
        quantityDelta: -2,
        balanceAfter: 3,
      }),
    });
    expect(tx.commercePayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ idempotencyKey: 'settle-paid-1' }),
      }),
    );
    expect(settled.status).toBe(CommerceSaleStatus.PAID);
    expect(settled.balanceDue).toBe(0);
  });

  it('requires settlement idempotency and replays without recording another payment', async () => {
    await expect(
      service.settleSale(cashierActor, 'sale-1', {
        payments: [{ amount: 100, method: 'Efectivo' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const paidSale = {
      id: 'settled1-0000-0000-0000-000000000000',
      resellerId: 'reseller-1',
      reseller: { name: 'Ana', email: 'ana@cared.mx' },
      salesChannel: SalesChannel.RESELLER_POS,
      status: CommerceSaleStatus.PAID,
      paymentStatus: CommercePaymentStatus.PAID,
      currency: 'MXN',
      subtotalAmount: 100,
      discountAmount: 0,
      totalAmount: 100,
      paidAmount: 100,
      createdAt: new Date(),
      items: [],
      payments: [],
      reservations: [],
    };
    tx.commercePayment.findFirst.mockResolvedValue({ id: 'pay-1' });
    tx.commerceSale.findFirst.mockResolvedValue(paidSale);

    const replay = await service.settleSale(
      cashierActor,
      paidSale.id,
      { payments: [{ amount: 100, method: 'Efectivo' }] },
      'settle-replay-1',
    );

    expect(tx.commercePayment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          saleId: paidSale.id,
          idempotencyKey: 'settle-replay-1',
          sale: { tenantId: 'tenant-1' },
        },
      }),
    );
    expect(tx.commercePayment.create).not.toHaveBeenCalled();
    expect(replay.id).toBe(paidSale.id);
  });

  it('recovers a concurrent settlement idempotency race from the persisted payment', async () => {
    const paidSale = {
      id: 'settled2-0000-0000-0000-000000000000',
      resellerId: 'reseller-1',
      reseller: { name: 'Ana', email: 'ana@cared.mx' },
      salesChannel: SalesChannel.RESELLER_POS,
      status: CommerceSaleStatus.PAID,
      paymentStatus: CommercePaymentStatus.PAID,
      currency: 'MXN',
      subtotalAmount: 100,
      discountAmount: 0,
      totalAmount: 100,
      paidAmount: 100,
      createdAt: new Date(),
      items: [],
      payments: [],
      reservations: [],
    };
    prisma.$transaction.mockRejectedValueOnce({ code: 'P2002' });
    prisma.commercePayment.findFirst.mockResolvedValue({ id: 'pay-race-1' });
    prisma.commerceSale.findFirst.mockResolvedValue(paidSale);

    const replay = await service.settleSale(
      cashierActor,
      paidSale.id,
      { payments: [{ amount: 100, method: 'Tarjeta' }] },
      'settle-race-1',
    );

    expect(prisma.commercePayment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          saleId: paidSale.id,
          idempotencyKey: 'settle-race-1',
        }),
      }),
    );
    expect(replay.id).toBe(paidSale.id);
  });

  it('protects active reservations from TTL expiration after a partial payment', async () => {
    const partiallyPaidSale = {
      id: 'partial1-0000-0000-0000-000000000000',
      resellerId: 'reseller-1',
      reseller: { name: 'Ana Revendedora', email: 'ana@cared.mx' },
      salesChannel: SalesChannel.RESELLER_POS,
      status: CommerceSaleStatus.PENDING_PAYMENT,
      paymentStatus: CommercePaymentStatus.PENDING,
      currency: 'MXN',
      subtotalAmount: 500,
      discountAmount: 0,
      totalAmount: 500,
      paidAmount: 0,
      notes: null,
      createdAt: new Date(),
      items: [],
      payments: [],
      reservations: [
        {
          id: 'res-partial-1',
          productId: 'prod-1',
          quantity: 1,
          status: InventoryReservationStatus.ACTIVE,
          expiresAt: new Date(Date.now() + 60_000),
        },
      ],
    };
    tx.commerceSale.findFirst.mockResolvedValue(partiallyPaidSale);
    tx.commerceSale.findUniqueOrThrow.mockResolvedValue({
      ...partiallyPaidSale,
      paymentStatus: CommercePaymentStatus.PARTIAL,
      paidAmount: 100,
      reservations: [{ ...partiallyPaidSale.reservations[0], expiresAt: null }],
    });

    tx.commerceSale.updateMany.mockResolvedValue({ count: 1 });
    tx.inventoryReservation.updateMany.mockResolvedValue({ count: 1 });

    await service.settleSale(
      cashierActor,
      partiallyPaidSale.id,
      { payments: [{ amount: 100, method: 'Efectivo' }] },
      'settle-partial-1',
    );

    expect(tx.inventoryReservation.updateMany).toHaveBeenCalledWith({
      where: {
        saleId: partiallyPaidSale.id,
        status: InventoryReservationStatus.ACTIVE,
      },
      data: { expiresAt: null },
    });
    expect(tx.commerceSale.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: partiallyPaidSale.id,
          status: CommerceSaleStatus.PENDING_PAYMENT,
          paidAmount: partiallyPaidSale.paidAmount,
        }),
        data: expect.objectContaining({ paymentStatus: CommercePaymentStatus.PARTIAL }),
      }),
    );
  });

  it('rejects concurrent partial payment writes instead of losing the stored balance', async () => {
    const sale = {
      id: 'partial2-0000-0000-0000-000000000000',
      resellerId: 'reseller-1',
      reseller: { name: 'Ana', email: 'ana@cared.mx' },
      salesChannel: SalesChannel.RESELLER_POS,
      status: CommerceSaleStatus.PENDING_PAYMENT,
      paymentStatus: CommercePaymentStatus.PARTIAL,
      currency: 'MXN',
      subtotalAmount: 500,
      discountAmount: 0,
      totalAmount: 500,
      paidAmount: 100,
      notes: null,
      createdAt: new Date(),
      items: [],
      payments: [],
      reservations: [{ id: 'res-partial-2', productId: 'prod-1', quantity: 1, status: InventoryReservationStatus.ACTIVE, expiresAt: null }],
    };
    tx.commerceSale.findFirst.mockResolvedValue(sale);
    tx.commerceSale.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.settleSale(
        cashierActor,
        sale.id,
        { payments: [{ amount: 50, method: 'Efectivo' }] },
        'settle-partial-race',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tx.commerceSale.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: sale.id,
          status: CommerceSaleStatus.PENDING_PAYMENT,
          paidAmount: sale.paidAmount,
        }),
      }),
    );
    expect(tx.inventoryReservation.updateMany).not.toHaveBeenCalled();
  });

  it('rolls back settlement when an active reservation loses the consume race', async () => {
    const sale = {
      id: 'consume1-0000-0000-0000-000000000000',
      resellerId: 'reseller-1',
      reseller: { name: 'Ana', email: 'ana@cared.mx' },
      salesChannel: SalesChannel.RESELLER_POS,
      status: CommerceSaleStatus.PENDING_PAYMENT,
      paymentStatus: CommercePaymentStatus.PENDING,
      currency: 'MXN',
      subtotalAmount: 100,
      discountAmount: 0,
      totalAmount: 100,
      paidAmount: 0,
      notes: null,
      createdAt: new Date(),
      items: [{ id: 'item-consume-1', productId: 'prod-1', skuSnapshot: 'A-1', nameSnapshot: 'Anillo', quantity: 1, unitPrice: 100, lineTotal: 100 }],
      payments: [],
      reservations: [{ id: 'res-consume-1', productId: 'prod-1', quantity: 1, status: InventoryReservationStatus.ACTIVE, expiresAt: null }],
    };
    tx.commerceSale.findFirst.mockResolvedValue(sale);
    tx.commerceSale.updateMany.mockResolvedValue({ count: 1 });
    tx.inventoryReservation.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.settleSale(
        cashierActor,
        sale.id,
        { payments: [{ amount: 100, method: 'Efectivo' }] },
        'settle-consume-race',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tx.commerceProduct.updateMany).not.toHaveBeenCalled();
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it('rejects settlement from REVENDEDOR or overpayments, and releases stock on cancelSale', async () => {
    await expect(
      service.settleSale(
        resellerActor,
        'sale-1',
        { payments: [{ amount: 100, method: 'Efectivo' }] },
        'settle-forbidden',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const pendingSale = {
      id: 'canc1234-0000-0000-0000-000000000000',
      resellerId: 'reseller-1',
      reseller: { name: 'Ana', email: 'ana@cared.mx' },
      salesChannel: SalesChannel.RESELLER_POS,
      status: CommerceSaleStatus.PENDING_PAYMENT,
      paymentStatus: CommercePaymentStatus.PENDING,
      currency: 'MXN',
      subtotalAmount: 500,
      discountAmount: 0,
      totalAmount: 500,
      paidAmount: 0,
      createdAt: new Date(),
      items: [],
      payments: [],
      reservations: [
        {
          id: 'res-cancel-1',
          productId: 'prod-1',
          quantity: 1,
          status: InventoryReservationStatus.ACTIVE,
          expiresAt: new Date(Date.now() + 60000),
        },
      ],
    };
    tx.commerceSale.findFirst.mockResolvedValue(pendingSale);

    await expect(
      service.settleSale(
        cashierActor,
        pendingSale.id,
        { payments: [{ amount: 600, method: 'Efectivo' }] },
        'settle-overpay',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    tx.inventoryReservation.updateMany.mockResolvedValue({ count: 1 });
    tx.commerceProduct.findFirst.mockResolvedValue({ id: 'prod-1', reservedQuantity: 2 });
    tx.commerceProduct.updateMany.mockResolvedValue({ count: 1 });
    tx.commerceSale.updateMany.mockResolvedValue({ count: 1 });
    tx.commerceSale.findUniqueOrThrow.mockResolvedValue({
      ...pendingSale,
      status: CommerceSaleStatus.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason: 'Cliente cambió de pieza',
    });

    const cancelled = await service.cancelSale(
      resellerActor,
      pendingSale.id,
      { reason: 'Cliente cambió de pieza' },
      true,
    );

    expect(tx.commerceSale.updateMany).toHaveBeenCalledWith({
      where: {
        id: pendingSale.id,
        tenantId: 'tenant-1',
        status: CommerceSaleStatus.PENDING_PAYMENT,
        paidAmount: 0,
        salesChannel: SalesChannel.RESELLER_POS,
        resellerId: 'reseller-1',
      },
      data: expect.objectContaining({
        status: CommerceSaleStatus.CANCELLED,
        cancellationReason: 'Cliente cambió de pieza',
      }),
    });
    expect(tx.commerceSale.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.inventoryReservation.updateMany.mock.invocationCallOrder[0],
    );

    expect(tx.inventoryReservation.updateMany).toHaveBeenCalledWith({
      where: { id: 'res-cancel-1', status: InventoryReservationStatus.ACTIVE },
      data: { status: InventoryReservationStatus.RELEASED },
    });
    expect(tx.commerceProduct.updateMany).toHaveBeenCalledWith({
      where: { id: 'prod-1', tenantId: 'tenant-1', reservedQuantity: 2 },
      data: { reservedQuantity: 1 },
    });
    expect(cancelled.status).toBe(CommerceSaleStatus.CANCELLED);
  });

  it('settles a reseller sale using cash + 30-day NON_REVOLVING credit drawdown, exits inventory and creates obligation', async () => {
    const creditMock = {
      formatObligationCode: jest.fn((id: string) => `CRD-${id.slice(0, 8).toUpperCase()}`),
      applySaleCreditDrawdownsInTx: jest.fn().mockResolvedValue([]),
      getResellerCredit: jest.fn(),
    };
    const creditAwareService = new CommerceService(prisma, creditMock as any);

    const sale = {
      id: 'cred1234-0000-0000-0000-000000000000',
      resellerId: 'reseller-1',
      reseller: { name: 'Ana Revendedora', email: 'ana@cared.mx' },
      salesChannel: SalesChannel.RESELLER_POS,
      status: CommerceSaleStatus.PENDING_PAYMENT,
      paymentStatus: CommercePaymentStatus.PENDING,
      currency: 'MXN',
      subtotalAmount: 3000,
      discountAmount: 0,
      totalAmount: 3000,
      paidAmount: 0,
      creditedAmount: 0,
      notes: null,
      createdAt: new Date(),
      items: [
        {
          id: 'item-c1',
          productId: 'prod-1',
          skuSnapshot: 'RNG-3K',
          nameSnapshot: 'Anillo Plata $3,000',
          quantity: 1,
          unitPrice: 3000,
          lineTotal: 3000,
        },
      ],
      payments: [],
      reservations: [
        {
          id: 'res-c1',
          productId: 'prod-1',
          quantity: 1,
          status: InventoryReservationStatus.ACTIVE,
          expiresAt: new Date(Date.now() + 60_000),
        },
      ],
      creditObligations: [],
    };
    tx.commerceSale.findFirst.mockResolvedValue(sale);
    tx.commerceSale.updateMany.mockResolvedValue({ count: 1 });
    tx.inventoryReservation.updateMany.mockResolvedValue({ count: 1 });
    tx.commerceProduct.findFirst.mockResolvedValue({
      id: 'prod-1',
      sku: 'RNG-3K',
      stockOnHand: 3,
      reservedQuantity: 1,
    });
    tx.commerceProduct.updateMany.mockResolvedValue({ count: 1 });
    tx.commerceSale.findUniqueOrThrow.mockResolvedValue({
      ...sale,
      status: CommerceSaleStatus.PAID,
      paymentStatus: CommercePaymentStatus.PAID,
      paidAmount: 500,
      creditedAmount: 2500,
      paidAt: new Date(),
      creditObligations: [
        {
          id: 'obli9999-0000',
          facilityType: CreditFacilityType.NON_REVOLVING,
          title: '1x Anillo Plata $3,000 · ORD-CRED1234',
          principalAmount: 2500,
          paidAmount: 0,
          balanceDue: 2500,
          dueAt: new Date(),
          status: 'OPEN',
        },
      ],
    });

    const settled = await creditAwareService.settleSale(
      cashierActor,
      sale.id,
      {
        payments: [{ amount: 500, method: 'Efectivo' }],
        creditDrawdowns: [{ facilityType: CreditFacilityType.NON_REVOLVING, amount: 2500 }],
      },
      'settle-credit-1',
    );

    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: InventoryMovementType.EXIT,
        quantityDelta: -1,
        balanceAfter: 2,
      }),
    });
    expect(creditMock.applySaleCreditDrawdownsInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        saleId: sale.id,
        subjectType: CreditSubjectType.RESELLER,
        resellerId: 'reseller-1',
        drawdowns: [
          expect.objectContaining({
            facilityType: CreditFacilityType.NON_REVOLVING,
            amount: 2500,
          }),
        ],
      }),
    );
    expect(settled.creditedAmount).toBe(2500);
    expect(settled.balanceDue).toBe(0);
    expect(settled.creditObligations).toHaveLength(1);
  });
});
