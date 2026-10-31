import { Test, TestingModule } from '@nestjs/testing';
import { ClientsService } from './clients.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ClientsService Unit Tests', () => {
  let service: ClientsService;

  const mockPrisma: any = {
    client: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    payment: {
      deleteMany: jest.fn(),
    },
    queueTicket: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    jest.clearAllMocks();
  });

  describe('getHistory', () => {
    it('should return client orders history isolated by tenant', async () => {
      const mockClientWithOrders = {
        id: 'client-1',
        tenantId: 'tenant-1',
        name: 'CARLOS LOPEZ',
        email: 'carlos@example.com',
        phone: '6621234567',
        orders: [
          {
            id: 'ord-1',
            type: 'REPAIR',
            pieceType: 'ANILLO ORO',
            metal: 'ORO 14K',
            status: 'DELIVERED',
            stage: 'ENTREGADO_POSTVENTA',
            totalAmount: 1500,
            paidAmount: 1500,
            balance: 0,
            specifications: {
              orderCode: 'REP-1',
              assignedTo: 'Joyero Uno',
            },
            createdAt: new Date('2026-01-10'),
            deliveredAt: new Date('2026-01-15'),
            payments: [],
            createdBy: { id: 'u-1', name: 'Admin', email: 'admin@cared.mx' },
          },
        ],
      };

      mockPrisma.client.findFirst.mockResolvedValue(mockClientWithOrders);

      const result = await service.getHistory('tenant-1', 'client-1');

      expect(result).toBeDefined();
      expect(result.client.name).toBe('CARLOS LOPEZ');
      expect(result.orders.length).toBe(1);
      expect(result.orders[0].orderCode).toBe('REP-1');
      expect(result.orders[0].jeweler).toBe('Joyero Uno');
      expect(mockPrisma.client.findFirst).toHaveBeenCalledWith({
        where: { id: 'client-1', tenantId: 'tenant-1' },
        include: expect.any(Object),
      });
    });

    it('should throw an exception if client not found in tenant', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);

      await expect(service.getHistory('tenant-1', 'client-unknown')).rejects.toThrow(
        'Cliente no encontrado',
      );
    });
  });

  describe('delete', () => {
    it('should delete a client and its associated orders, payments, and tickets', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.order.findMany.mockResolvedValue([{ id: 'ord-1' }, { id: 'ord-2' }]);
      mockPrisma.payment.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.queueTicket.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.client.delete.mockResolvedValue({ id: 'client-1' });

      const result = await service.delete('tenant-1', 'client-1');

      expect(result).toEqual({ id: 'client-1' });
      expect(mockPrisma.client.findFirst).toHaveBeenCalledWith({
        where: { id: 'client-1', tenantId: 'tenant-1' },
        select: { id: true },
      });
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { clientId: 'client-1', tenantId: 'tenant-1' },
        select: { id: true },
      });
      expect(mockPrisma.payment.deleteMany).toHaveBeenCalledWith({
        where: { orderId: { in: ['ord-1', 'ord-2'] } },
      });
      expect(mockPrisma.queueTicket.updateMany).toHaveBeenCalledWith({
        where: { orderId: { in: ['ord-1', 'ord-2'] } },
        data: { orderId: null },
      });
      expect(mockPrisma.order.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['ord-1', 'ord-2'] }, tenantId: 'tenant-1' },
      });
      expect(mockPrisma.client.delete).toHaveBeenCalledWith({
        where: { id: 'client-1' },
      });
    });

    it('should throw error if client does not exist when deleting', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);

      await expect(service.delete('tenant-1', 'client-unknown')).rejects.toThrow(
        'Cliente no encontrado en este taller.',
      );
    });
  });
});
