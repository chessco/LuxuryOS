import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ClientType, Role } from '@prisma/client';
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
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
    it('should preserve clients that have orders to maintain audit history', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.order.findMany.mockResolvedValue([{ id: 'ord-1' }, { id: 'ord-2' }]);
      await expect(service.delete('tenant-1', 'client-1')).rejects.toThrow(
        'No se puede eliminar un cliente con órdenes',
      );
      expect(mockPrisma.client.findFirst).toHaveBeenCalledWith({
        where: { id: 'client-1', tenantId: 'tenant-1' },
        select: { id: true, resellerUserId: true },
      });
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { clientId: 'client-1', tenantId: 'tenant-1' },
        select: { id: true },
      });
      expect(mockPrisma.order.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.client.delete).not.toHaveBeenCalled();
    });

    it('should throw error if client does not exist when deleting', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);

      await expect(service.delete('tenant-1', 'client-unknown')).rejects.toThrow(
        'Cliente no encontrado en este taller.',
      );
    });
  });

  describe('reseller client type and portal provisioning', () => {
    const adminUser = {
      id: 'admin-1',
      tenantId: 'tenant-1',
      role: Role.TENANT_ADMIN,
      email: 'admin@cared.mx',
    };

    const sellerUser = {
      id: 'seller-1',
      tenantId: 'tenant-1',
      role: Role.VENDEDOR,
      email: 'vendedor@cared.mx',
    };

    it('creates a RESELLER client with portalAccess enabled, provisions User REVENDEDOR and links resellerUserId', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-res-1',
        tenantId: 'tenant-1',
        name: 'ARACELI RUIZ',
        username: 'araceli.ruiz',
        email: 'araceli@cared.mx',
        role: Role.REVENDEDOR,
      });
      mockPrisma.client.create.mockResolvedValue({
        id: 'client-res-1',
        tenantId: 'tenant-1',
        name: 'ARACELI RUIZ',
        email: 'araceli@cared.mx',
        phone: '6441002030',
        location: 'Cd Obregon, Sonora',
        type: ClientType.RESELLER,
        tags: ['Mayorista'],
        resellerUserId: 'user-res-1',
        resellerUser: {
          id: 'user-res-1',
          username: 'araceli.ruiz',
          email: 'araceli@cared.mx',
          name: 'ARACELI RUIZ',
          role: Role.REVENDEDOR,
        },
      });

      const created = await service.create(
        'tenant-1',
        {
          name: 'Araceli Ruiz',
          email: 'araceli@cared.mx',
          phone: '6441002030',
          location: 'Cd Obregon, Sonora',
          type: 'RESELLER',
          tags: ['Mayorista'],
          portalAccess: {
            enable: true,
            username: 'Araceli.Ruiz',
            password: 'Secret1234',
          },
        },
        adminUser,
      );

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'ARACELI RUIZ',
          username: 'araceli.ruiz',
          email: 'araceli@cared.mx',
          role: Role.REVENDEDOR,
          isActive: true,
          passwordHash: expect.any(String),
        }),
      });
      expect(mockPrisma.client.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          type: ClientType.RESELLER,
          tags: ['Mayorista'],
          resellerUserId: 'user-res-1',
        }),
        include: expect.any(Object),
      });
      expect(created.type).toBe(ClientType.RESELLER);
      expect(created.status).toBe('Revendedor');
      expect(created.portalAccess).toEqual({
        enabled: true,
        userId: 'user-res-1',
        username: 'araceli.ruiz',
        email: 'araceli@cared.mx',
        role: Role.REVENDEDOR,
      });
    });

    it('blocks non-admin user from enabling reseller portal access on create or update', async () => {
      await expect(
        service.create(
          'tenant-1',
          {
            name: 'Revendedor Bloqueado',
            type: 'RESELLER',
            portalAccess: {
              enable: true,
              username: 'rev.bloqueado',
              password: 'Password123',
            },
          },
          sellerUser,
        ),
      ).rejects.toThrow(ForbiddenException);

      mockPrisma.client.findFirst.mockResolvedValue({
        id: 'client-2',
        tenantId: 'tenant-1',
        name: 'CLIENTE DOS',
        email: 'dos@cared.mx',
        type: ClientType.RETAIL,
        resellerUserId: 'user-linked',
        resellerUser: {
          id: 'user-linked',
          username: 'araceli.nuevo',
          email: 'araceli@cared.mx',
          name: 'ARACELI RUIZ',
          role: Role.REVENDEDOR,
          isActive: false,
        },
      });

      await expect(
        service.update(
          'tenant-1',
          'client-2',
          {
            type: 'RESELLER',
            portalAccess: {
              enable: true,
              username: 'rev.dos',
              password: 'Password123',
            },
          },
          sellerUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('preserves legacy RETAIL client creation when type, tags, and portalAccess are omitted', async () => {
      mockPrisma.client.create.mockResolvedValue({
        id: 'client-legacy-1',
        tenantId: 'tenant-1',
        name: 'SOFÍA VILLALOBOS',
        phone: '6441234567',
        email: null,
        location: 'Cd Obregon, Sonora',
        type: ClientType.RETAIL,
        tags: null,
        resellerUserId: null,
        resellerUser: null,
      });

      const created = await service.create(
        'tenant-1',
        {
          name: 'Sofía Villalobos',
          phone: '6441234567',
          location: 'Cd Obregon, Sonora',
        },
        sellerUser,
      );

      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(created.type).toBe(ClientType.RETAIL);
      expect(created.status).toBe('Active');
      expect(created.portalAccess.enabled).toBe(false);
    });

    it('allows seller to update contact info on a RESELLER client without losing portal link', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({
        id: 'client-res-9',
        tenantId: 'tenant-1',
        name: 'ARACELI RUIZ',
        email: 'araceli@cared.mx',
        type: ClientType.RESELLER,
        resellerUserId: 'user-res-9',
        resellerUser: {
          id: 'user-res-9',
          username: 'araceli.ruiz',
          email: 'araceli@cared.mx',
          name: 'ARACELI RUIZ',
          role: Role.REVENDEDOR,
        },
      });
      mockPrisma.client.update.mockResolvedValue({
        id: 'client-res-9',
        tenantId: 'tenant-1',
        name: 'ARACELI RUIZ',
        email: 'araceli@cared.mx',
        phone: '6449998877',
        location: 'Hermosillo, Sonora',
        type: ClientType.RESELLER,
        tags: ['VIP'],
        resellerUserId: 'user-res-9',
        resellerUser: {
          id: 'user-res-9',
          username: 'araceli.ruiz',
          email: 'araceli@cared.mx',
          name: 'ARACELI RUIZ',
          role: Role.REVENDEDOR,
        },
      });

      const updated = await service.update(
        'tenant-1',
        'client-res-9',
        { phone: '6449998877', location: 'Hermosillo, Sonora' },
        sellerUser,
      );

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(updated.portalAccess).toEqual(
        expect.objectContaining({ enabled: true, userId: 'user-res-9' }),
      );
    });

    it('hides financial totals in findAll for VENDEDOR while exposing client types and portal status', async () => {
      mockPrisma.client.findMany.mockResolvedValue([
        {
          id: 'c-1',
          tenantId: 'tenant-1',
          name: 'ARACELI RUIZ',
          type: ClientType.RESELLER,
          tags: ['Mayorista'],
          orders: [
            {
              id: 'o-1',
              totalAmount: 5000,
              paidAmount: 5000,
              value: 5000,
              status: 'DELIVERED',
              stage: 'ENTREGADO_POSTVENTA',
              createdAt: new Date('2026-11-10'),
            },
          ],
          resellerUser: {
            id: 'u-1',
            username: 'araceli.ruiz',
            email: 'araceli@cared.mx',
            name: 'ARACELI RUIZ',
            role: Role.REVENDEDOR,
          },
        },
      ]);

      const sellerView = await service.findAll('tenant-1', sellerUser);
      expect(sellerView[0].totalSpent).toBeNull();
      expect(sellerView[0].totalSpentNumber).toBeNull();
      expect(sellerView[0].status).toBe('Revendedor');
      expect(sellerView[0].portalAccess.username).toBe('araceli.ruiz');

      const adminView = await service.findAll('tenant-1', adminUser);
      expect(adminView[0].totalSpentNumber).toBe(5000);
      expect(adminView[0].totalSpent).toContain('5,000');
    });

    it('reuses an unlinked REVENDEDOR user in the same tenant without duplicating accounts', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'existing-rev-user',
          tenantId: 'tenant-1',
          role: Role.REVENDEDOR,
          username: 'carlos.rev',
          email: 'carlos@cared.mx',
          clientProfile: null,
        },
      ]);
      mockPrisma.user.update.mockResolvedValue({ id: 'existing-rev-user' });
      mockPrisma.client.create.mockResolvedValue({
        id: 'client-c-1',
        tenantId: 'tenant-1',
        name: 'CARLOS',
        email: 'carlos@cared.mx',
        type: ClientType.RESELLER,
        resellerUserId: 'existing-rev-user',
        resellerUser: {
          id: 'existing-rev-user',
          username: 'carlos.rev',
          email: 'carlos@cared.mx',
          name: 'CARLOS',
          role: Role.REVENDEDOR,
        },
      });

      const res = await service.create(
        'tenant-1',
        {
          name: 'Carlos',
          email: 'carlos@cared.mx',
          type: 'RESELLER',
          portalAccess: { enable: true, username: 'carlos.rev' },
        },
        adminUser,
      );

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'existing-rev-user' },
        data: {
          name: 'CARLOS',
          username: 'carlos.rev',
          email: 'carlos@cared.mx',
          isActive: true,
        },
      });
      expect(res.portalAccess.userId).toBe('existing-rev-user');
    });

    it('rejects conflicting username or email (ConflictException) and invalid portal credentials (BadRequestException)', async () => {
      // Username already belongs to an admin user
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'admin-existing',
          tenantId: 'tenant-1',
          role: Role.TENANT_ADMIN,
          username: 'admin',
          email: 'admin@cared.mx',
          clientProfile: null,
        },
      ]);

      await expect(
        service.create(
          'tenant-1',
          {
            name: 'Conflicto User',
            type: 'RESELLER',
            portalAccess: { enable: true, username: 'admin', password: 'Password123' },
          },
          adminUser,
        ),
      ).rejects.toThrow(ConflictException);

      // Invalid username format (< 3 chars / invalid chars)
      await expect(
        service.create(
          'tenant-1',
          {
            name: 'Invalid Username',
            type: 'RESELLER',
            portalAccess: { enable: true, username: 'a!', password: 'Password123' },
          },
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);

      // Missing initial password on fresh reseller user
      mockPrisma.user.findMany.mockResolvedValue([]);
      await expect(
        service.create(
          'tenant-1',
          {
            name: 'Missing Password',
            type: 'RESELLER',
            portalAccess: { enable: true, username: 'nuevo.rev' },
          },
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows updating linked reseller username without overwriting passwordHash and disables portal cleanly', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({
        id: 'client-linked',
        tenantId: 'tenant-1',
        name: 'ARACELI RUIZ',
        email: 'araceli@cared.mx',
        type: ClientType.RESELLER,
        resellerUserId: 'user-linked',
      });
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({ id: 'user-linked' });
      mockPrisma.client.update.mockResolvedValue({
        id: 'client-linked',
        tenantId: 'tenant-1',
        name: 'ARACELI RUIZ',
        email: 'araceli@cared.mx',
        type: ClientType.RESELLER,
        resellerUserId: 'user-linked',
        resellerUser: {
          id: 'user-linked',
          username: 'araceli.nuevo',
          email: 'araceli@cared.mx',
          name: 'ARACELI RUIZ',
          role: Role.REVENDEDOR,
          isActive: true,
        },
      });

      await service.update(
        'tenant-1',
        'client-linked',
        {
          type: 'RESELLER',
          portalAccess: { enable: true, username: 'araceli.nuevo' },
        },
        adminUser,
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-linked' },
        data: {
          name: 'ARACELI RUIZ',
          username: 'araceli.nuevo',
          email: 'araceli@cared.mx',
          role: Role.REVENDEDOR,
          isActive: true,
        },
      });
      expect(
        mockPrisma.user.update.mock.calls[0][0].data.passwordHash,
      ).toBeUndefined();

      // Now disable portal access without deleting client
      mockPrisma.client.update.mockResolvedValue({
        id: 'client-linked',
        tenantId: 'tenant-1',
        name: 'ARACELI RUIZ',
        email: 'araceli@cared.mx',
        type: ClientType.RESELLER,
        resellerUserId: 'user-linked',
        resellerUser: {
          id: 'user-linked',
          username: 'araceli.nuevo',
          email: 'araceli@cared.mx',
          name: 'ARACELI RUIZ',
          role: Role.REVENDEDOR,
          isActive: false,
        },
      });

      const disabled = await service.update(
        'tenant-1',
        'client-linked',
        { type: 'RESELLER', portalAccess: { enable: false } },
        adminUser,
      );

      expect(mockPrisma.client.update).toHaveBeenLastCalledWith({
        where: { id: 'client-linked', tenantId: 'tenant-1' },
        data: expect.objectContaining({ resellerUserId: 'user-linked' }),
        include: expect.any(Object),
      });
      expect(mockPrisma.user.update).toHaveBeenLastCalledWith({
        where: { id: 'user-linked', tenantId: 'tenant-1' },
        data: { isActive: false },
      });
      expect(disabled.portalAccess.enabled).toBe(false);
    });

    it('deactivates linked portal access when a reseller is changed to another client type', async () => {
      const existing = {
        id: 'client-linked',
        tenantId: 'tenant-1',
        name: 'ARACELI RUIZ',
        email: 'araceli@cared.mx',
        type: ClientType.RESELLER,
        resellerUserId: 'user-linked',
      };
      mockPrisma.client.findFirst.mockResolvedValue(existing);

      await expect(
        service.update('tenant-1', 'client-linked', { type: ClientType.RETAIL }, sellerUser),
      ).rejects.toThrow(ForbiddenException);

      mockPrisma.client.findFirst.mockResolvedValue(existing);
      mockPrisma.user.update.mockResolvedValue({ id: 'user-linked', isActive: false });
      mockPrisma.client.update.mockResolvedValue({
        ...existing,
        type: ClientType.RETAIL,
        resellerUser: { id: 'user-linked', isActive: false },
      });

      await service.update(
        'tenant-1',
        'client-linked',
        { type: ClientType.RETAIL },
        adminUser,
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-linked', tenantId: 'tenant-1' },
        data: { isActive: false },
      });
    });
  });
});
