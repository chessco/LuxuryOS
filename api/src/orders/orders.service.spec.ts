import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStrategyFactory } from './strategies/order-strategy.factory';
import { NotificationService } from '../queue/notification.service';
import { SettingsService } from '../settings/settings.service';

describe('OrdersService Unit Tests', () => {
  let service: OrdersService;

  const mockPrisma = {
    order: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    client: {
      findFirst: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  const mockStrategyFactory = {
    getStrategy: jest.fn(),
  };

  const mockNotificationService = {
    sendNotification: jest.fn(),
  };

  const mockSettingsService = {
    getSettings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrderStrategyFactory, useValue: mockStrategyFactory },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should reject orders without a promised delivery date', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-123' });

      const dto: any = {
        type: 'MANUFACTURE',
        pieceType: 'ANILLO',
        value: 1000,
        clientId: 'client-123',
      };

      await expect(
        service.createOrder('tenant-1', dto, 'user-1'),
      ).rejects.toThrow('La fecha compromiso de entrega es obligatoria');
      expect(mockPrisma.order.create).not.toHaveBeenCalled();
    });

    it('should generate orderCode without leading zeros (e.g. FAB-1 instead of FAB-000001)', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-123' });
      mockPrisma.order.count.mockResolvedValue(0); // Sequence number = 1
      mockPrisma.order.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'order-1', ...data }),
      );

      const dto: any = {
        type: 'MANUFACTURE',
        pieceType: 'ANILLO',
        value: 1000,
        clientId: 'client-123',
        promisedAt: '2026-12-01T00:00:00.000Z',
        size: '7',
        thickness: '2mm',
      };

      const result: any = await service.createOrder('tenant-1', dto, 'user-1');

      expect(result).toBeDefined();
      expect(result.specifications.orderCode).toBe('FAB-1');
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            size: '7',
            thickness: '2mm',
            specifications: expect.objectContaining({
              orderCode: 'FAB-1',
            }),
          }),
        }),
      );
    });

    it('RF-01: should reject workshop orders without medida', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-123' });

      const dto: any = {
        type: 'REPAIR',
        pieceType: 'ANILLO',
        value: 500,
        clientId: 'client-123',
        promisedAt: '2026-12-01T00:00:00.000Z',
        thickness: '2mm',
        // size missing
      };

      await expect(
        service.createOrder('tenant-1', dto, 'user-1'),
      ).rejects.toThrow('La medida es obligatoria.');
    });

    it('RF-01: should reject workshop orders with only whitespace in medida', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-123' });

      const dto: any = {
        type: 'REPAIR',
        pieceType: 'ANILLO',
        value: 500,
        clientId: 'client-123',
        promisedAt: '2026-12-01T00:00:00.000Z',
        size: '   ',
        thickness: '2mm',
      };

      await expect(
        service.createOrder('tenant-1', dto, 'user-1'),
      ).rejects.toThrow('La medida es obligatoria.');
    });

    it('RF-01: should reject workshop orders without grosor', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-123' });

      const dto: any = {
        type: 'REPAIR',
        pieceType: 'CADENA',
        value: 500,
        clientId: 'client-123',
        promisedAt: '2026-12-01T00:00:00.000Z',
        size: '18cm',
        // thickness missing
      };

      await expect(
        service.createOrder('tenant-1', dto, 'user-1'),
      ).rejects.toThrow('El grosor es obligatorio.');
    });

    it('RF-01: should reject workshop orders with only whitespace in grosor', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-123' });

      const dto: any = {
        type: 'REPAIR',
        pieceType: 'CADENA',
        value: 500,
        clientId: 'client-123',
        promisedAt: '2026-12-01T00:00:00.000Z',
        size: '18cm',
        thickness: '   ',
      };

      await expect(
        service.createOrder('tenant-1', dto, 'user-1'),
      ).rejects.toThrow('El grosor es obligatorio.');
    });

    it('RF-01: should allow creating non-workshop orders (e.g. STANDARD) without size/thickness', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-123' });
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'order-std', ...data }),
      );

      const dto: any = {
        type: 'STANDARD',
        pieceType: 'RELOJ',
        value: 3000,
        clientId: 'client-123',
        promisedAt: '2026-12-01T00:00:00.000Z',
      };

      const result = await service.createOrder('tenant-1', dto, 'user-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('order-std');
    });

    it('RF-02: should persist photo and add to envelopeImages upon creation', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-123' });
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'order-photo-1', ...data }),
      );

      const dto: any = {
        type: 'REPAIR',
        pieceType: 'ANILLO',
        value: 800,
        clientId: 'client-123',
        promisedAt: '2026-12-01T00:00:00.000Z',
        size: '7',
        thickness: '2mm',
        imageUrl: 'https://example.com/photo.jpg',
      };

      const result: any = await service.createOrder('tenant-1', dto, 'user-1');
      expect(result).toBeDefined();
      expect(result.imageUrl).toBe('https://example.com/photo.jpg');
      expect(result.specifications.envelopeImages).toContain(
        'https://example.com/photo.jpg',
      );
    });
  });

  describe('getOrder', () => {
    it('should fetch order by id and enrich with sequenceNumber and clean orderCode', async () => {
      const mockDbOrder = {
        id: 'uuid-fab-14',
        tenantId: 'tenant-1',
        type: 'MANUFACTURE',
        createdAt: new Date('2026-09-17T19:56:00.000Z'),
        specifications: { orderCode: 'FAB-000014' },
      };

      mockPrisma.order.findFirst.mockResolvedValue(mockDbOrder);
      mockPrisma.order.count.mockResolvedValue(14); // 14th manufacture order

      const result: any = await service.getOrder('tenant-1', 'uuid-fab-14');

      expect(result).not.toBeNull();
      expect(result?.sequenceNumber).toBe(14);
      expect(result?.orderCode).toBe('FAB-14');
      expect(result?.specifications?.orderCode).toBe('FAB-14');
    });

    it('should fallback to code matching if UUID lookup yields null', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      const mockAllOrders = [
        {
          id: 'uuid-fab-14',
          tenantId: 'tenant-1',
          type: 'MANUFACTURE',
          createdAt: new Date('2026-09-17T19:56:00.000Z'),
          specifications: { orderCode: 'FAB-14' },
        },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockAllOrders);
      mockPrisma.order.count.mockResolvedValue(14);

      const result: any = await service.getOrder('tenant-1', 'FAB-14');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('uuid-fab-14');
      expect(result?.orderCode).toBe('FAB-14');
    });
  });

  describe('updateOrder', () => {
    it('should update promisedAt delivery date when provided in payload', async () => {
      const mockDbOrder = {
        id: 'uuid-123',
        tenantId: 'tenant-1',
        status: 'RECEIVED',
        value: 1000,
        laborCost: 500,
        materialCost: 500,
        specifications: {},
      };

      mockPrisma.order.findFirst.mockResolvedValue(mockDbOrder);
      mockPrisma.order.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...mockDbOrder, ...data }),
      );

      const updatePayload = {
        promisedAt: '2026-10-15T12:00:00.000Z',
      };

      await service.updateOrder('tenant-1', 'uuid-123', updatePayload, {
        role: 'ADMIN',
      });

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'uuid-123' },
          data: expect.objectContaining({
            promisedAt: new Date('2026-10-15T12:00:00.000Z'),
          }),
        }),
      );
    });

    it('RF-08: should charge labor + material when editing an order', async () => {
      const mockDbOrder = {
        id: 'uuid-124',
        tenantId: 'tenant-1',
        status: 'RECEIVED',
        value: 650,
        totalAmount: 650,
        paidAmount: 0,
        laborCost: 650,
        materialCost: 0,
        specifications: {},
      };

      mockPrisma.order.findFirst.mockResolvedValue(mockDbOrder);
      mockPrisma.order.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...mockDbOrder, ...data }),
      );

      await service.updateOrder(
        'tenant-1',
        'uuid-124',
        { laborCost: 650, materialCost: 200, value: 650 },
        { role: 'ADMIN' },
      );

      const { data } = mockPrisma.order.update.mock.calls[0][0];
      expect(Number(data.totalAmount)).toBe(850);
      expect(Number(data.balance)).toBe(850);
      expect(data.materialCost).toBe(200);
    });

    it('RF-08: should total labor + material of every piece when the order has per-piece costs', async () => {
      const mockDbOrder = {
        id: 'uuid-125',
        tenantId: 'tenant-1',
        status: 'RECEIVED',
        value: 0,
        totalAmount: 0,
        paidAmount: 0,
        laborCost: 0,
        materialCost: 0,
        specifications: {},
      };

      mockPrisma.order.findFirst.mockResolvedValue(mockDbOrder);
      mockPrisma.order.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...mockDbOrder, ...data }),
      );

      await service.updateOrder(
        'tenant-1',
        'uuid-125',
        {
          specifications: {
            items: [
              { item: 'CADENA', laborCost: 500, materialCost: 300 },
              { item: 'ANILLO', laborCost: '200', materialCost: '100' },
            ],
          },
        },
        { role: 'ADMIN' },
      );

      const { data } = mockPrisma.order.update.mock.calls[0][0];
      expect(data.laborCost).toBe(700);
      expect(data.materialCost).toBe(400);
      expect(data.value).toBe(700);
      expect(data.cost).toBe(400);
      expect(Number(data.totalAmount)).toBe(1100);
      expect(Number(data.balance)).toBe(1100);
    });
  });

  describe('RF-01: deliverOrderViaQr', () => {
    it('should successfully deliver an order that is ready and paid in full', async () => {
      const mockOrder = {
        id: 'ord-del-1',
        tenantId: 'tenant-1',
        type: 'REPAIR',
        status: 'REPAIR_COMPLETED',
        totalAmount: 1000,
        paidAmount: 1000,
        balance: 0,
        specifications: { orderCode: 'REP-10' },
      };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...mockOrder, ...data }),
      );

      const result = await service.deliverOrderViaQr('tenant-1', 'ord-del-1', {
        id: 'u-mostrador',
        name: 'Vendedor Mostrador',
        role: 'VENDEDOR',
      });

      const specs = result.specifications as any;
      expect(result.status).toBe('DELIVERED');
      expect(result.deliveredAt).toBeDefined();
      expect(specs.deliveredByName).toBe('Vendedor Mostrador');
      expect(specs.deliveryMethod).toBe('QR_SCAN');
    });

    it('should reject delivery if order has a pending balance', async () => {
      const mockOrder = {
        id: 'ord-del-2',
        tenantId: 'tenant-1',
        type: 'REPAIR',
        status: 'REPAIR_COMPLETED',
        totalAmount: 1000,
        paidAmount: 400,
        balance: 600,
        specifications: { orderCode: 'REP-11' },
      };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      await expect(
        service.deliverOrderViaQr('tenant-1', 'ord-del-2', {
          id: 'u-mostrador',
          role: 'VENDEDOR',
        }),
      ).rejects.toThrow('saldo pendiente');
    });

    it('should reject delivery if order is still in production', async () => {
      const mockOrder = {
        id: 'ord-del-3',
        tenantId: 'tenant-1',
        type: 'REPAIR',
        status: 'IN_REPAIR',
        totalAmount: 1000,
        paidAmount: 1000,
        balance: 0,
        specifications: { orderCode: 'REP-12' },
      };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      await expect(
        service.deliverOrderViaQr('tenant-1', 'ord-del-3', {
          id: 'u-mostrador',
          role: 'VENDEDOR',
        }),
      ).rejects.toThrow('pendiente de producción');
    });
  });

  describe('RF-02: returnOrderToClientViaQr', () => {
    it('should register physical return to client when joyero marked returned', async () => {
      const mockOrder = {
        id: 'ord-ret-1',
        tenantId: 'tenant-1',
        type: 'REPAIR',
        status: 'RETURNED',
        specifications: {
          orderCode: 'REP-20',
          isReturned: true,
          returnReason: 'No hay refacción disponible',
        },
      };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...mockOrder, ...data }),
      );

      const result = await service.returnOrderToClientViaQr(
        'tenant-1',
        'ord-ret-1',
        { id: 'u-1', name: 'Mostrador 1', role: 'VENDEDOR' },
        'Cliente recoge sobre sin realizar trabajo',
      );

      const specs = result.specifications as any;
      expect(result.status).toBe('RETURNED');
      expect(specs.isReturnedToClient).toBe(true);
      expect(specs.isReturnedNotDone).toBe(true);
      expect(specs.returnReason).toBe(
        'Cliente recoge sobre sin realizar trabajo',
      );
      expect(specs.returnedToClientByName).toBe('Mostrador 1');
    });

    it('should reject physical return if joyero has not marked as returned or cancelled', async () => {
      const mockOrder = {
        id: 'ord-ret-2',
        tenantId: 'tenant-1',
        type: 'REPAIR',
        status: 'IN_REPAIR',
        specifications: { orderCode: 'REP-21' },
      };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      await expect(
        service.returnOrderToClientViaQr(
          'tenant-1',
          'ord-ret-2',
          { id: 'u-1', role: 'VENDEDOR' },
          'Devolucion cliente',
        ),
      ).rejects.toThrow('Cancelado');
    });
  });

  describe('RF-05 & RF-06: Design flow and restrictions', () => {
    it('should complete design and record designer data', async () => {
      const mockOrder = {
        id: 'ord-dis-1',
        tenantId: 'tenant-1',
        type: 'DESIGN',
        status: 'RECEIVED',
        specifications: { orderCode: 'DIS-1', requiresDesign: true },
      };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...mockOrder, ...data }),
      );

      const result = await service.completeDesign(
        'tenant-1',
        'ord-dis-1',
        { id: 'u-dis', name: 'Diseñador CAD', role: 'DISENADOR' },
        { notes: 'Modelo 3D STL finalizado', images: ['https://example.com/render.png'] },
      );

      const specs = result.specifications as any;
      expect(specs.designCompleted).toBe(true);
      expect(specs.designNotes).toBe('Modelo 3D STL finalizado');
      expect(specs.designCompletedByName).toBe('Diseñador CAD');
    });


    it('should prevent assigning to joyero if design is not completed', async () => {
      const mockOrder = {
        id: 'ord-dis-2',
        tenantId: 'tenant-1',
        type: 'DESIGN',
        status: 'RECEIVED',
        specifications: { orderCode: 'DIS-2', requiresDesign: true, designCompleted: false },
      };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      await expect(
        service.assignJewelerAfterDesign(
          'tenant-1',
          'ord-dis-2',
          { id: 'u-dis', role: 'DISENADOR' },
          'Joyero Pedro',
        ),
      ).rejects.toThrow('completado');
    });

    it('should reject designer attempting to mark order as completed or delivered', async () => {
      const mockOrder = {
        id: 'ord-dis-3',
        tenantId: 'tenant-1',
        type: 'REPAIR',
        status: 'IN_REPAIR',
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.moveOrder('ord-dis-3', 'tenant-1', 'REPAIR_COMPLETED', {
          id: 'u-dis',
          role: 'DISENADOR',
          email: 'diseno@cared.mx',
        }),
      ).rejects.toThrow('Diseñador no tiene permitido');
    });
  });

  describe('RF-03: settleAndDeliverOrderViaQr (Cobro y entrega en un solo escaneo QR)', () => {
    it('should settle pending balance and deliver in a single transaction', async () => {
      const mockOrder = {
        id: 'ord-settle-1',
        tenantId: 'tenant-1',
        type: 'REPAIR',
        status: 'REPAIR_COMPLETED',
        totalAmount: 2500,
        paidAmount: 1000,
        balance: 1500,
        specifications: { orderCode: 'REP-125' },
      };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-1', amount: 1500 });
      mockPrisma.order.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...mockOrder, ...data }),
      );

      const result: any = await service.settleAndDeliverOrderViaQr(
        'tenant-1',
        'ord-settle-1',
        { id: 'u-mostrador', name: 'Mostrador Fabiola', role: 'VENDEDOR' },
        { paymentMethod: 'Tarjeta', reference: 'POS-0992' },
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'ord-settle-1',
            method: 'Tarjeta',
            reference: 'POS-0992',
            recordedBy: 'Mostrador Fabiola',
          }),
        }),
      );
      expect(result.status).toBe('DELIVERED');
      expect(result.balance).toBe(0);
      expect(result.paidAmount).toBe(2500);
      expect(result.paymentStatus).toBe('PAGADO');
      expect(result.deliveredAt).toBeDefined();
      expect(result.specifications.deliveredByName).toBe('Mostrador Fabiola');
      expect(result.specifications.deliveryMethod).toBe('QR_SCAN_SETTLE');
    });

    it('should deliver already paid order ($0 balance) without registering duplicate payment', async () => {
      const mockOrder = {
        id: 'ord-settle-paid',
        tenantId: 'tenant-1',
        type: 'REPAIR',
        status: 'REPAIR_COMPLETED',
        totalAmount: 1800,
        paidAmount: 1800,
        balance: 0,
        specifications: { orderCode: 'REP-126' },
      };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...mockOrder, ...data }),
      );

      const result: any = await service.settleAndDeliverOrderViaQr(
        'tenant-1',
        'ord-settle-paid',
        { id: 'u-mostrador', name: 'Mostrador Fabiola', role: 'VENDEDOR' },
      );

      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
      expect(result.status).toBe('DELIVERED');
      expect(result.balance).toBe(0);
      expect(result.deliveredAt).toBeDefined();
    });

    it('should reject delivery if order is already delivered (idempotency)', async () => {
      const mockOrder = {
        id: 'ord-already-del',
        tenantId: 'tenant-1',
        type: 'REPAIR',
        status: 'DELIVERED',
        deliveredAt: new Date(),
        totalAmount: 1000,
        paidAmount: 1000,
        balance: 0,
      };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      await expect(
        service.settleAndDeliverOrderViaQr('tenant-1', 'ord-already-del', {
          id: 'u-mostrador',
          role: 'VENDEDOR',
        }),
      ).rejects.toThrow('Esta orden ya fue entregada anteriormente.');
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('should reject delivery if order is still in production', async () => {
      const mockOrder = {
        id: 'ord-in-prod',
        tenantId: 'tenant-1',
        type: 'REPAIR',
        status: 'IN_REPAIR',
        totalAmount: 1000,
        paidAmount: 500,
        balance: 500,
      };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      await expect(
        service.settleAndDeliverOrderViaQr('tenant-1', 'ord-in-prod', {
          id: 'u-mostrador',
          role: 'VENDEDOR',
        }),
      ).rejects.toThrow('pendiente de producción');
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('should reject delivery if order is cancelled or returned', async () => {
      const mockOrder = {
        id: 'ord-cancelled',
        tenantId: 'tenant-1',
        type: 'REPAIR',
        status: 'CANCELLED',
        totalAmount: 1000,
        paidAmount: 0,
        balance: 1000,
      };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      await expect(
        service.settleAndDeliverOrderViaQr('tenant-1', 'ord-cancelled', {
          id: 'u-mostrador',
          role: 'VENDEDOR',
        }),
      ).rejects.toThrow('cancelada o devuelta');
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('should reject delivery if order belongs to another tenant', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.settleAndDeliverOrderViaQr('tenant-other', 'ord-settle-1', {
          id: 'u-mostrador',
          role: 'VENDEDOR',
        }),
      ).rejects.toThrow('Orden no encontrada');
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });
  });
});

