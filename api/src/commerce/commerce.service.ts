import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommercePaymentStatus, CommerceProductStatus, CommerceSaleStatus, InventoryReservationStatus, Prisma, Role, SalesChannel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Actor = { id?: string; sub?: string; tenantId?: string; role?: Role };
type CartItem = { productId: string; quantity: number };
type PaymentInput = { amount: number; method: string; reference?: string };
type CheckoutInput = { items: CartItem[]; customerName?: string; customerPhone?: string; payments?: PaymentInput[]; notes?: string };

@Injectable()
export class CommerceService {
  constructor(private readonly prisma: PrismaService) {}

  private actor(actor: Actor, channel: SalesChannel) {
    const id = actor?.id || actor?.sub;
    if (!id || !actor?.tenantId || !actor?.role) throw new ForbiddenException('Sesión comercial inválida');
    const allowed: Role[] = channel === SalesChannel.JEWELRY_INTERNAL
      ? [Role.VENDEDOR, Role.TENANT_ADMIN, Role.SYSTEM_ADMIN]
      : [Role.REVENDEDOR, Role.TENANT_ADMIN, Role.SYSTEM_ADMIN];
    if (!allowed.includes(actor.role)) throw new ForbiddenException('No autorizado para este canal');
    return { id, tenantId: actor.tenantId, role: actor.role };
  }

  private cart(items: CartItem[]) {
    if (!Array.isArray(items) || !items.length) throw new BadRequestException('El carrito no puede estar vacío');
    const merged = new Map<string, number>();
    for (const item of items) {
      const id = String(item?.productId || '').trim();
      const quantity = Number(item?.quantity);
      if (!id || !Number.isInteger(quantity) || quantity < 1) throw new BadRequestException('Artículo o cantidad inválidos');
      merged.set(id, (merged.get(id) || 0) + quantity);
    }
    return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
  }

  async catalog(actor: Actor, channel: SalesChannel) {
    const { tenantId } = this.actor(actor, channel);
    return this.prisma.commerceProduct.findMany({
      where: { tenantId, status: CommerceProductStatus.ACTIVE, ...(channel === SalesChannel.RESELLER_POS ? { availableToResellers: true } : {}) },
      orderBy: [{ name: 'asc' }, { sku: 'asc' }],
      select: { id: true, sku: true, name: true, description: true, category: true, imageUrl: true, unitPrice: true, currency: true, stockOnHand: true, reservedQuantity: true },
    });
  }

  async checkout(actor: Actor, channel: SalesChannel, input: CheckoutInput, idempotencyKey?: string) {
    const session = this.actor(actor, channel);
    const key = String(idempotencyKey || '').trim();
    if (!key) throw new BadRequestException('Idempotency-Key es obligatorio');
    const items = this.cart(input.items);
    const payments = Array.isArray(input.payments) ? input.payments : [];
    if (channel === SalesChannel.RESELLER_POS && payments.length) throw new ForbiddenException('Cared es responsable de procesar los pagos de revendedores');
    for (const payment of payments) {
      if (!Number.isFinite(Number(payment.amount)) || Number(payment.amount) <= 0 || !String(payment.method || '').trim()) throw new BadRequestException('Pago inválido');
    }

    return this.prisma.$transaction(async (tx) => {
      const prior = await tx.commerceSale.findFirst({ where: { tenantId: session.tenantId, idempotencyKey: key }, include: { items: true, payments: true } });
      if (prior) {
        if (channel === SalesChannel.RESELLER_POS && prior.resellerId !== session.id) throw new ForbiddenException('La llave pertenece a otro revendedor');
        return prior;
      }
      const products = await tx.commerceProduct.findMany({ where: { id: { in: items.map(i => i.productId) }, tenantId: session.tenantId, status: CommerceProductStatus.ACTIVE, ...(channel === SalesChannel.RESELLER_POS ? { availableToResellers: true } : {}) } });
      if (products.length !== items.length) throw new NotFoundException('Uno o más artículos no están disponibles');
      const productById = new Map(products.map(product => [product.id, product]));
      let subtotal = 0;
      const lines = items.map(item => {
        const product = productById.get(item.productId)!;
        subtotal += Number(product.unitPrice) * item.quantity;
        return { product, quantity: item.quantity, unitPrice: Number(product.unitPrice) };
      });
      subtotal = Math.round(subtotal * 100) / 100;
      const paid = Math.round(payments.reduce((sum, payment) => sum + Number(payment.amount), 0) * 100) / 100;
      if (paid > subtotal) throw new BadRequestException('El pago no puede exceder el total');
      const fullyPaid = paid === subtotal;
      const sale = await tx.commerceSale.create({ data: {
        tenantId: session.tenantId, resellerId: session.id, salesChannel: channel,
        status: fullyPaid ? CommerceSaleStatus.PAID : CommerceSaleStatus.PENDING_PAYMENT,
        paymentStatus: fullyPaid ? CommercePaymentStatus.PAID : paid > 0 ? CommercePaymentStatus.PARTIAL : CommercePaymentStatus.PENDING,
        currency: lines[0]?.product.currency || 'MXN', customerName: input.customerName?.trim() || null, customerPhone: input.customerPhone?.trim() || null,
        subtotalAmount: new Prisma.Decimal(subtotal), totalAmount: new Prisma.Decimal(subtotal), paidAmount: new Prisma.Decimal(paid), notes: input.notes?.trim() || null, idempotencyKey: key, paidAt: fullyPaid ? new Date() : null,
        items: { create: lines.map(line => ({ productId: line.product.id, skuSnapshot: line.product.sku, nameSnapshot: line.product.name, unitPrice: new Prisma.Decimal(line.unitPrice), quantity: line.quantity, lineTotal: new Prisma.Decimal(line.unitPrice * line.quantity) })) },
      }});
      for (const line of lines) {
        const product = line.product;
        const available = product.stockOnHand - product.reservedQuantity;
        if (available < line.quantity) throw new ConflictException(`Stock insuficiente para ${product.sku}`);
        const update = await tx.commerceProduct.updateMany({ where: { id: product.id, tenantId: session.tenantId, stockOnHand: product.stockOnHand, reservedQuantity: product.reservedQuantity, status: CommerceProductStatus.ACTIVE }, data: fullyPaid ? { stockOnHand: product.stockOnHand - line.quantity } : { reservedQuantity: product.reservedQuantity + line.quantity } });
        if (update.count !== 1) throw new ConflictException('El inventario cambió; vuelve a intentar');
        await tx.inventoryReservation.create({ data: { tenantId: session.tenantId, productId: product.id, resellerId: session.id, saleId: sale.id, quantity: line.quantity, status: fullyPaid ? InventoryReservationStatus.CONSUMED : InventoryReservationStatus.ACTIVE, expiresAt: fullyPaid ? new Date() : new Date(Date.now() + 30 * 60_000) } });
      }
      for (const payment of payments) await tx.commercePayment.create({ data: { saleId: sale.id, amount: new Prisma.Decimal(payment.amount), method: payment.method.trim(), reference: payment.reference?.trim(), status: CommercePaymentStatus.PAID, recordedById: session.id } });
      await tx.commerceAuditLog.create({ data: { tenantId: session.tenantId, actorId: session.id, entityType: 'SALE', entityId: sale.id, action: fullyPaid ? 'SALE_PAID' : 'SALE_RESERVED', payload: { channel, subtotal, paid } } });
      return tx.commerceSale.findUniqueOrThrow({ where: { id: sale.id }, include: { items: true, payments: true, reservations: true } });
    });
  }
}
