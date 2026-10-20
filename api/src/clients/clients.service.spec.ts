import { Test, TestingModule } from '@nestjs/testing';
import { ClientsService } from './clients.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ClientsService Unit Tests', () => {
  let service: ClientsService;

  const mockPrisma = {
    client: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
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
});
