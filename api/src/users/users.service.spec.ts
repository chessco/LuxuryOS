import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ClientType, Role } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService Unit Tests', () => {
  let service: UsersService;

  const mockPrisma: any = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    client: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('automatically creates a RESELLER client profile when creating a REVENDEDOR user with no matching client', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-rev-1',
      email: 'araceli@cared.mx',
      username: 'araceli.ruiz',
      name: 'Araceli Ruiz',
      role: Role.REVENDEDOR,
      jewelerPercentage: 100,
      createdAt: new Date(),
    });
    mockPrisma.client.findFirst.mockResolvedValue(null);
    mockPrisma.client.create.mockResolvedValue({
      id: 'client-rev-1',
      tenantId: 'tenant-1',
      name: 'ARACELI RUIZ',
      type: ClientType.RESELLER,
      resellerUserId: 'user-rev-1',
    });

    const created = await service.create(
      'tenant-1',
      {
        email: 'araceli@cared.mx',
        username: 'araceli.ruiz',
        name: 'Araceli Ruiz',
        password: 'Password123',
        role: Role.REVENDEDOR,
      },
      { id: 'admin-1', role: Role.TENANT_ADMIN },
    );

    expect(created.id).toBe('user-rev-1');
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.client.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        name: 'ARACELI RUIZ',
        email: 'araceli@cared.mx',
        type: ClientType.RESELLER,
        resellerUserId: 'user-rev-1',
      },
    });
  });

  it('keeps User and Client provisioning inside the same transaction', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-rev-rollback',
      email: 'rollback@cared.mx',
      username: 'rollback.rev',
      name: 'Rollback Rev',
      role: Role.REVENDEDOR,
      isActive: true,
      jewelerPercentage: 100,
      createdAt: new Date(),
    });
    mockPrisma.client.findFirst.mockResolvedValue(null);
    mockPrisma.client.create.mockRejectedValue(new Error('client create failed'));

    await expect(
      service.create(
        'tenant-1',
        {
          email: 'rollback@cared.mx',
          username: 'rollback.rev',
          name: 'Rollback Rev',
          password: 'Password123',
          role: Role.REVENDEDOR,
        },
        { id: 'admin-1', role: Role.TENANT_ADMIN },
      ),
    ).rejects.toThrow('client create failed');

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.create).toHaveBeenCalled();
    expect(mockPrisma.client.create).toHaveBeenCalled();
  });

  it('links an existing unlinked Client matching the REVENDEDOR email and upgrades it to RESELLER', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-rev-2',
      email: 'sofia@cared.mx',
      username: 'sofia.rev',
      name: 'Sofía Mendoza',
      role: Role.REVENDEDOR,
      jewelerPercentage: 100,
      createdAt: new Date(),
    });
    mockPrisma.client.findFirst.mockResolvedValue({ id: 'existing-client-99' });
    mockPrisma.client.update.mockResolvedValue({ id: 'existing-client-99' });

    await service.create(
      'tenant-1',
      {
        email: 'sofia@cared.mx',
        username: 'sofia.rev',
        name: 'Sofía Mendoza',
        password: 'Password123',
        role: Role.REVENDEDOR,
      },
      { id: 'admin-1', role: Role.TENANT_ADMIN },
    );

    expect(mockPrisma.client.update).toHaveBeenCalledWith({
      where: { id: 'existing-client-99' },
      data: {
        type: ClientType.RESELLER,
        resellerUserId: 'user-rev-2',
      },
    });
    expect(mockPrisma.client.create).not.toHaveBeenCalled();
  });

  it('does not touch Client records when creating internal staff roles (VENDEDOR, JOYERO, TENANT_ADMIN)', async () => {
    for (const staffRole of [Role.VENDEDOR, Role.JOYERO, Role.TENANT_ADMIN]) {
      jest.clearAllMocks();
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: `user-${staffRole}`,
        email: `${staffRole.toLowerCase()}@cared.mx`,
        username: null,
        name: staffRole,
        role: staffRole,
        jewelerPercentage: 100,
        createdAt: new Date(),
      });

      await service.create(
        'tenant-1',
        {
          email: `${staffRole.toLowerCase()}@cared.mx`,
          name: staffRole,
          password: 'Password123',
          role: staffRole,
        },
        { id: 'admin-1', role: Role.TENANT_ADMIN },
      );

      expect(mockPrisma.client.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.client.create).not.toHaveBeenCalled();
      expect(mockPrisma.client.update).not.toHaveBeenCalled();
    }
  });

  it('forbids TENANT_ADMIN from creating or promoting users to SYSTEM_ADMIN', async () => {
    await expect(
      service.create(
        'tenant-1',
        {
          email: 'fake.sys@cared.mx',
          name: 'Fake Sys',
          password: 'Password123',
          role: Role.SYSTEM_ADMIN,
        },
        { id: 'admin-1', role: Role.TENANT_ADMIN },
      ),
    ).rejects.toThrow(ForbiddenException);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u-staff',
      tenantId: 'tenant-1',
      role: Role.VENDEDOR,
    });

    await expect(
      service.update(
        'tenant-1',
        'u-staff',
        { role: Role.SYSTEM_ADMIN },
        { id: 'admin-1', role: Role.TENANT_ADMIN },
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
