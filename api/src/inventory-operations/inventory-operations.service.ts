import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryEntryType, InventoryMovementType, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Actor = { id?: string; sub?: string; tenantId?: string; role?: Role };
type EntryItem = { productId: string; quantity: number; unitCost: number; comments?: string };

@Injectable()
export class InventoryOperationsService {
  constructor(private readonly prisma: PrismaService) {}
  private actor(actor: Actor) {
    const id = actor.id || actor.sub;
    if (!id || !actor.tenantId || ![Role.TENANT_ADMIN, Role.SYSTEM_ADMIN].includes(actor.role!)) throw new ForbiddenException('Sólo administradores pueden registrar entradas de inventario');
    return { id, tenantId: actor.tenantId };
  }
  async suppliers(actor: Actor) {
    const { tenantId } = this.actor(actor);
    return this.prisma.supplier.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }
  async createSupplier(actor: Actor, input: { name: string; phone?: string; email?: string; notes?: string }) {
    const { tenantId } = this.actor(actor); const name = String(input.name || '').trim();
    if (!name) throw new BadRequestException('El proveedor es obligatorio');
    return this.prisma.supplier.create({ data: { tenantId, name, phone: input.phone?.trim() || null, email: input.email?.trim() || null, notes: input.notes?.trim() || null } });
  }
  async createEntry(actor: Actor, input: { supplierId: string; type: InventoryEntryType; currency?: string; comments?: string; items: EntryItem[] }) {
    const { id, tenantId } = this.actor(actor);
    if (!Object.values(InventoryEntryType).includes(input.type) || !Array.isArray(input.items) || !input.items.length) throw new BadRequestException('Tipo y detalle de entrada son obligatorios');
    return this.prisma.$transaction(async tx => {
      const supplier = await tx.supplier.findFirst({ where: { id: input.supplierId, tenantId } });
      if (!supplier) throw new NotFoundException('Proveedor no encontrado');
      const productIds = input.items.map(item => item.productId);
      const products = await tx.commerceProduct.findMany({ where: { id: { in: productIds }, tenantId } });
      if (products.length !== new Set(productIds).size) throw new NotFoundException('Un artículo no pertenece al inventario');
      const byId = new Map(products.map(product => [product.id, product]));
      const normalized = input.items.map(item => {
        const quantity = Number(item.quantity), unitCost = Number(item.unitCost), product = byId.get(item.productId)!;
        if (!Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(unitCost) || unitCost < 0) throw new BadRequestException('Cantidad o costo inválido');
        return { product, quantity, unitCost, lineTotal: quantity * unitCost, comments: item.comments?.trim() || null };
      });
      const entry = await tx.inventoryEntry.create({ data: { tenantId, supplierId: supplier.id, type: input.type, currency: (input.currency || 'MXN').toUpperCase(), comments: input.comments?.trim() || null, totalCost: new Prisma.Decimal(normalized.reduce((total, item) => total + item.lineTotal, 0)), createdById: id, items: { create: normalized.map(item => ({ productId: item.product.id, skuSnapshot: item.product.sku, nameSnapshot: item.product.name, quantity: item.quantity, unitCost: new Prisma.Decimal(item.unitCost), lineTotal: new Prisma.Decimal(item.lineTotal) })) } } });
      for (const item of normalized) {
        await tx.commerceProduct.update({ where: { id: item.product.id }, data: { stockOnHand: { increment: item.quantity } } });
        await tx.inventoryMovement.create({ data: { tenantId, productId: item.product.id, entryId: entry.id, type: input.type === InventoryEntryType.INITIAL_STOCK ? InventoryMovementType.INITIAL_STOCK : InventoryMovementType.ENTRY, quantityDelta: item.quantity, unitCost: new Prisma.Decimal(item.unitCost), currency: entry.currency, comments: item.comments, createdById: id } });
      }
      return tx.inventoryEntry.findUniqueOrThrow({ where: { id: entry.id }, include: { supplier: true, items: true } });
    });
  }
}
