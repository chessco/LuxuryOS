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
        }
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
        it('should generate orderCode without leading zeros (e.g. FAB-1 instead of FAB-000001)', async () => {
            mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-123' });
            mockPrisma.order.count.mockResolvedValue(0); // Sequence number = 1
            mockPrisma.order.create.mockImplementation(({ data }) => Promise.resolve({ id: 'order-1', ...data }));

            const dto: any = {
                type: 'MANUFACTURE',
                pieceType: 'ANILLO',
                value: 1000,
                clientId: 'client-123',
            };

            const result: any = await service.createOrder('tenant-1', dto, 'user-1');

            expect(result).toBeDefined();
            expect(result.specifications.orderCode).toBe('FAB-1');
            expect(mockPrisma.order.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        specifications: expect.objectContaining({
                            orderCode: 'FAB-1'
                        })
                    })
                })
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
                specifications: { orderCode: 'FAB-000014' }
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
                    specifications: { orderCode: 'FAB-14' }
                }
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
                specifications: {}
            };

            mockPrisma.order.findFirst.mockResolvedValue(mockDbOrder);
            mockPrisma.order.update.mockImplementation(({ data }) => Promise.resolve({ ...mockDbOrder, ...data }));

            const updatePayload = {
                promisedAt: '2026-10-15T12:00:00.000Z'
            };

            await service.updateOrder('tenant-1', 'uuid-123', updatePayload, { role: 'ADMIN' });

            expect(mockPrisma.order.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'uuid-123' },
                    data: expect.objectContaining({
                        promisedAt: new Date('2026-10-15T12:00:00.000Z')
                    })
                })
            );
        });
    });
});
