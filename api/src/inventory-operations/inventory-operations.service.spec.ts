import { ForbiddenException } from '@nestjs/common';
import { InventoryOperationsService } from './inventory-operations.service';

describe('InventoryOperationsService', () => {
  const tx = {
    supplier: { findFirst: jest.fn() },
    commerceProduct: { findMany: jest.fn(), update: jest.fn() },
    inventoryEntry: { create: jest.fn(), findUniqueOrThrow: jest.fn() },
    inventoryMovement: { create: jest.fn() },
  } as any;
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    supplier: { findMany: jest.fn(), create: jest.fn() },
  } as any;
  const service = new InventoryOperationsService(prisma);
  const admin = { id: 'admin-1', tenantId: 'tenant-1', role: 'TENANT_ADMIN' as const };

  beforeEach(() => jest.clearAllMocks());

  it('rejects inventory operations from a non-admin user', async () => {
    await expect(service.suppliers({ id: 'user-1', tenantId: 'tenant-1', role: 'TENANT_USER' as any })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a master-detail entry, increments stock, and records traceability', async () => {
    tx.supplier.findFirst.mockResolvedValue({ id: 'supplier-1', tenantId: 'tenant-1' });
    tx.commerceProduct.findMany.mockResolvedValue([{ id: 'product-1', tenantId: 'tenant-1', sku: 'RNG-001', name: 'Anillo' }]);
    tx.inventoryEntry.create.mockResolvedValue({ id: 'entry-1', currency: 'MXN' });
    tx.inventoryEntry.findUniqueOrThrow.mockResolvedValue({ id: 'entry-1', items: [{ productId: 'product-1', quantity: 2 }] });

    await expect(service.createEntry(admin, {
      supplierId: 'supplier-1', type: 'INITIAL_STOCK' as any, currency: 'mxn', comments: 'Ingreso inicial',
      items: [{ productId: 'product-1', quantity: 2, unitCost: 1250 }],
    })).resolves.toMatchObject({ id: 'entry-1' });

    expect(tx.supplier.findFirst).toHaveBeenCalledWith({ where: { id: 'supplier-1', tenantId: 'tenant-1' } });
    expect(tx.inventoryEntry.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', supplierId: 'supplier-1', currency: 'MXN', createdById: 'admin-1' }),
    }));
    expect(tx.commerceProduct.update).toHaveBeenCalledWith({ where: { id: 'product-1' }, data: { stockOnHand: { increment: 2 } } });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', productId: 'product-1', entryId: 'entry-1', type: 'INITIAL_STOCK', quantityDelta: 2, createdById: 'admin-1' }),
    }));
  });
});
