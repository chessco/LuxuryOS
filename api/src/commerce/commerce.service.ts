import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommercePaymentStatus, CommerceProductStatus, CommerceSaleStatus, InventoryMovementType, InventoryReservationStatus, Prisma, Role, SalesChannel } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, RecordProductMovementDto, UpdateProductDto } from './dto/commerce-product.dto';
import { CancelSaleDto, CreateSaleDto, SettleSaleDto } from './dto/commerce-sale.dto';

type Actor = { id?: string; sub?: string; tenantId?: string; role?: Role };
type CartItem = { productId: string; quantity: number };
type PaymentInput = { amount: number; method: string; reference?: string };
type CheckoutInput = CreateSaleDto | { items: CartItem[]; customerName?: string; customerPhone?: string; payments?: PaymentInput[]; notes?: string };

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

  private adminActor(actor: Actor) {
    const id = actor?.id || actor?.sub;
    if (!id || !actor?.tenantId || (actor.role !== Role.TENANT_ADMIN && actor.role !== Role.SYSTEM_ADMIN)) {
      throw new ForbiddenException('Sólo administradores pueden gestionar el inventario');
    }
    return { id, tenantId: actor.tenantId, role: actor.role };
  }

  private saveProductImage(tenantId: string, imageUrl?: string | null): string | null {
    const trimmed = String(imageUrl ?? '').trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('data:')) {
      const match = trimmed.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/i);
      if (!match) {
        throw new BadRequestException('Formato de imagen no válido. Usa JPG, PNG, WEBP o GIF.');
      }
      const mime = match[1].toLowerCase();
      const base64 = match[2].replace(/\s+/g, '');
      const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : mime.includes('gif') ? 'gif' : 'jpg';
      const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
      const tenantUploadsDir = path.join(uploadsDir, tenantId);
      if (!fs.existsSync(tenantUploadsDir)) {
        fs.mkdirSync(tenantUploadsDir, { recursive: true });
      }
      const filename = `product_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      fs.writeFileSync(path.join(tenantUploadsDir, filename), Buffer.from(base64, 'base64'));
      return `/uploads/${tenantId}/${filename}`;
    }
    if (trimmed.length > 10_000) {
      throw new BadRequestException('La URL de la imagen es demasiado larga');
    }
    return trimmed;
  }

  private parseOptionalDecimal(value: number | null | undefined, label: string): Prisma.Decimal | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      throw new BadRequestException(`${label} inválido`);
    }
    return new Prisma.Decimal(numeric);
  }

  private toAdminProduct(product: {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    category: string | null;
    imageUrl: string | null;
    unitCost?: Prisma.Decimal | number | string | null;
    unitPrice: Prisma.Decimal | number | string;
    resellerPrice?: Prisma.Decimal | number | string | null;
    wholesalePrice?: Prisma.Decimal | number | string | null;
    currency: string;
    stockOnHand: number;
    reservedQuantity: number;
    availableToResellers: boolean;
    status: CommerceProductStatus;
    createdAt: Date;
    updatedAt: Date;
    _count?: {
      saleItems: number;
      reservations: number;
      inventoryEntryItems: number;
      inventoryMovements: number;
    };
  }) {
    const counts = product._count;
    const hasHistory = Boolean(
      counts &&
        counts.saleItems + counts.reservations + counts.inventoryEntryItems + counts.inventoryMovements > 0,
    );
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      imageUrl: product.imageUrl,
      unitCost: product.unitCost != null ? Number(product.unitCost) : null,
      unitPrice: Number(product.unitPrice),
      resellerPrice: product.resellerPrice != null ? Number(product.resellerPrice) : null,
      wholesalePrice: product.wholesalePrice != null ? Number(product.wholesalePrice) : null,
      currency: product.currency,
      stockOnHand: product.stockOnHand,
      reservedQuantity: product.reservedQuantity,
      availableQuantity: Math.max(0, product.stockOnHand - product.reservedQuantity),
      availableToResellers: product.availableToResellers,
      status: product.status,
      hasHistory,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private readonly adminProductSelect = {
    id: true,
    sku: true,
    name: true,
    description: true,
    category: true,
    imageUrl: true,
    unitCost: true,
    unitPrice: true,
    resellerPrice: true,
    wholesalePrice: true,
    currency: true,
    stockOnHand: true,
    reservedQuantity: true,
    availableToResellers: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        saleItems: true,
        reservations: true,
        inventoryEntryItems: true,
        inventoryMovements: true,
      },
    },
  } as const;

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
    const products = await this.prisma.commerceProduct.findMany({
      where: { tenantId, status: CommerceProductStatus.ACTIVE, ...(channel === SalesChannel.RESELLER_POS ? { availableToResellers: true } : {}) },
      orderBy: [{ name: 'asc' }, { sku: 'asc' }],
      select: { id: true, sku: true, name: true, description: true, category: true, imageUrl: true, unitPrice: true, resellerPrice: true, wholesalePrice: true, currency: true, stockOnHand: true, reservedQuantity: true },
    });
    return products.map((product) => ({
      ...product,
      unitPrice: Number(product.unitPrice),
      resellerPrice: product.resellerPrice != null ? Number(product.resellerPrice) : null,
      wholesalePrice: product.wholesalePrice != null ? Number(product.wholesalePrice) : null,
      availableQuantity: Math.max(0, product.stockOnHand - product.reservedQuantity),
    }));
  }

  async listProducts(actor: Actor, status?: CommerceProductStatus) {
    const { tenantId } = this.adminActor(actor);
    const products = await this.prisma.commerceProduct.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      orderBy: [{ status: 'asc' }, { name: 'asc' }, { sku: 'asc' }],
      select: this.adminProductSelect,
    });
    return products.map((product) => this.toAdminProduct(product));
  }

  async getProduct(actor: Actor, id: string) {
    const { tenantId } = this.adminActor(actor);
    const product = await this.prisma.commerceProduct.findFirst({
      where: { id, tenantId },
      select: this.adminProductSelect,
    });
    if (!product) throw new NotFoundException('Artículo no encontrado');
    return this.toAdminProduct(product);
  }

  async createProduct(actor: Actor, input: CreateProductDto) {
    const session = this.adminActor(actor);
    const sku = String(input.sku || '').trim().toUpperCase();
    const name = String(input.name || '').trim();
    if (!sku || !name) throw new BadRequestException('SKU y nombre son obligatorios');
    const unitCost = this.parseOptionalDecimal(input.unitCost, 'Costo unitario') ?? null;
    const unitPrice = Number(input.unitPrice);
    const resellerPrice = this.parseOptionalDecimal(input.resellerPrice, 'Precio 2 (Revendedor)') ?? null;
    const wholesalePrice = this.parseOptionalDecimal(input.wholesalePrice, 'Precio 3 (Mayorista)') ?? null;
    const stockOnHand = input.stockOnHand === undefined ? 0 : Number(input.stockOnHand);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new BadRequestException('Precio 1 (Ventas) inválido');
    if (!Number.isInteger(stockOnHand) || stockOnHand < 0) throw new BadRequestException('Existencia inválida');
    const currency = (input.currency || 'MXN').trim().toUpperCase();
    const imageUrl = this.saveProductImage(session.tenantId, input.imageUrl);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const product = await tx.commerceProduct.create({
          data: {
            tenantId: session.tenantId,
            sku,
            name,
            description: input.description?.trim() || null,
            category: input.category?.trim() || null,
            imageUrl,
            unitCost,
            unitPrice: new Prisma.Decimal(unitPrice),
            resellerPrice,
            wholesalePrice,
            currency,
            stockOnHand,
            availableToResellers: input.availableToResellers ?? true,
            status: input.status ?? CommerceProductStatus.ACTIVE,
          },
          select: this.adminProductSelect,
        });
        if (stockOnHand > 0) {
          await tx.inventoryMovement.create({
            data: {
              tenantId: session.tenantId,
              productId: product.id,
              type: InventoryMovementType.INITIAL_STOCK,
              quantityDelta: stockOnHand,
              balanceAfter: stockOnHand,
              unitCost,
              currency,
              comments: 'Inventario inicial al registrar artículo',
              createdById: session.id,
            },
          });
        }
        await tx.commerceAuditLog.create({
          data: {
            tenantId: session.tenantId,
            actorId: session.id,
            entityType: 'PRODUCT',
            entityId: product.id,
            action: 'PRODUCT_CREATED',
            payload: {
              sku: product.sku,
              name: product.name,
              unitCost: unitCost !== null ? Number(unitCost) : null,
              unitPrice,
              resellerPrice: resellerPrice !== null ? Number(resellerPrice) : null,
              wholesalePrice: wholesalePrice !== null ? Number(wholesalePrice) : null,
              stockOnHand,
              status: product.status,
            },
          },
        });
        return product;
      });
      return this.toAdminProduct(created);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Ya existe un artículo con ese SKU en esta organización');
      }
      throw error;
    }
  }

  async updateProduct(actor: Actor, id: string, input: UpdateProductDto) {
    const session = this.adminActor(actor);
    const existing = await this.prisma.commerceProduct.findFirst({
      where: { id, tenantId: session.tenantId },
      select: this.adminProductSelect,
    });
    if (!existing) throw new NotFoundException('Artículo no encontrado');

    const data: Prisma.CommerceProductUpdateInput = {};
    if (input.sku !== undefined) {
      const sku = input.sku.trim().toUpperCase();
      if (!sku) throw new BadRequestException('El SKU no puede estar vacío');
      data.sku = sku;
    }
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new BadRequestException('El nombre no puede estar vacío');
      data.name = name;
    }
    if (input.description !== undefined) {
      data.description = input.description?.trim() || null;
    }
    if (input.category !== undefined) {
      data.category = input.category?.trim() || null;
    }
    if (input.imageUrl !== undefined) {
      data.imageUrl = this.saveProductImage(session.tenantId, input.imageUrl);
    }
    if (input.unitCost !== undefined) {
      data.unitCost = this.parseOptionalDecimal(input.unitCost, 'Costo unitario');
    }
    if (input.unitPrice !== undefined) {
      const unitPrice = Number(input.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new BadRequestException('Precio 1 (Ventas) inválido');
      data.unitPrice = new Prisma.Decimal(unitPrice);
    }
    if (input.resellerPrice !== undefined) {
      data.resellerPrice = this.parseOptionalDecimal(input.resellerPrice, 'Precio 2 (Revendedor)');
    }
    if (input.wholesalePrice !== undefined) {
      data.wholesalePrice = this.parseOptionalDecimal(input.wholesalePrice, 'Precio 3 (Mayorista)');
    }
    if ((input as { stockOnHand?: unknown }).stockOnHand !== undefined) {
      throw new BadRequestException(
        'La existencia se calcula desde el Kardex y no se edita directamente; registra una entrada, salida o ajuste.',
      );
    }
    if (input.currency !== undefined) {
      data.currency = input.currency.trim().toUpperCase();
    }
    if (input.availableToResellers !== undefined) {
      data.availableToResellers = input.availableToResellers;
    }
    if (input.status !== undefined) {
      if (input.status === CommerceProductStatus.ARCHIVED && existing.reservedQuantity > 0) {
        throw new ConflictException('No se puede archivar un artículo con unidades reservadas');
      }
      data.status = input.status;
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const product = await tx.commerceProduct.update({
          where: { id: existing.id },
          data,
          select: this.adminProductSelect,
        });
        await tx.commerceAuditLog.create({
          data: {
            tenantId: session.tenantId,
            actorId: session.id,
            entityType: 'PRODUCT',
            entityId: product.id,
            action: 'PRODUCT_UPDATED',
            payload: {
              sku: product.sku,
              name: product.name,
              unitCost: product.unitCost != null ? Number(product.unitCost) : null,
              unitPrice: Number(product.unitPrice),
              resellerPrice: product.resellerPrice != null ? Number(product.resellerPrice) : null,
              wholesalePrice: product.wholesalePrice != null ? Number(product.wholesalePrice) : null,
              stockOnHand: product.stockOnHand,
              status: product.status,
            },
          },
        });
        return product;
      });
      return this.toAdminProduct(updated);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Ya existe un artículo con ese SKU en esta organización');
      }
      throw error;
    }
  }

  async deleteProduct(actor: Actor, id: string) {
    const session = this.adminActor(actor);
    const existing = await this.prisma.commerceProduct.findFirst({
      where: { id, tenantId: session.tenantId },
      select: this.adminProductSelect,
    });
    if (!existing) throw new NotFoundException('Artículo no encontrado');
    if (existing.reservedQuantity > 0) {
      throw new ConflictException('No se puede eliminar un artículo con unidades reservadas');
    }

    const counts = existing._count;
    const hasHistory = Boolean(
      counts &&
        counts.saleItems + counts.reservations + counts.inventoryEntryItems + counts.inventoryMovements > 0,
    );

    if (hasHistory) {
      const archived = await this.prisma.$transaction(async (tx) => {
        const product = await tx.commerceProduct.update({
          where: { id: existing.id },
          data: {
            status: CommerceProductStatus.ARCHIVED,
            availableToResellers: false,
          },
          select: this.adminProductSelect,
        });
        await tx.commerceAuditLog.create({
          data: {
            tenantId: session.tenantId,
            actorId: session.id,
            entityType: 'PRODUCT',
            entityId: product.id,
            action: 'PRODUCT_ARCHIVED',
            payload: { sku: product.sku, reason: 'HAS_HISTORY' },
          },
        });
        return product;
      });
      return {
        deleted: false,
        archived: true,
        message: 'El artículo tiene historial de ventas o movimientos; se archivó para conservar la trazabilidad.',
        product: this.toAdminProduct(archived),
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.commerceProduct.delete({ where: { id: existing.id } });
      await tx.commerceAuditLog.create({
        data: {
          tenantId: session.tenantId,
          actorId: session.id,
          entityType: 'PRODUCT',
          entityId: existing.id,
          action: 'PRODUCT_DELETED',
          payload: { sku: existing.sku, name: existing.name },
        },
      });
    });

    return {
      deleted: true,
      archived: false,
      message: 'Artículo eliminado del inventario.',
      id: existing.id,
    };
  }

  async getProductKardex(actor: Actor, id: string, type?: InventoryMovementType) {
    const { tenantId } = this.adminActor(actor);
    const product = await this.prisma.commerceProduct.findFirst({
      where: { id, tenantId },
      select: this.adminProductSelect,
    });
    if (!product) throw new NotFoundException('Artículo no encontrado');

    const movements = await this.prisma.inventoryMovement.findMany({
      where: { tenantId, productId: product.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        type: true,
        quantityDelta: true,
        balanceAfter: true,
        unitCost: true,
        currency: true,
        comments: true,
        entryId: true,
        saleId: true,
        createdAt: true,
        entry: {
          select: {
            id: true,
            type: true,
            supplier: { select: { name: true } },
          },
        },
        sale: {
          select: {
            id: true,
            salesChannel: true,
            customerName: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const summary = movements.reduce(
      (totals, movement) => {
        totals.movementCount += 1;
        if (movement.type === InventoryMovementType.INITIAL_STOCK || movement.type === InventoryMovementType.ENTRY) {
          totals.totalIn += movement.quantityDelta;
        } else if (movement.type === InventoryMovementType.EXIT) {
          totals.totalOut += Math.abs(movement.quantityDelta);
        } else if (movement.type === InventoryMovementType.ADJUSTMENT) {
          totals.netAdjustments += movement.quantityDelta;
        }
        return totals;
      },
      { totalIn: 0, totalOut: 0, netAdjustments: 0, movementCount: 0 },
    );

    const filteredMovements = (type ? movements.filter((movement) => movement.type === type) : movements).map(
      (movement) => ({
        id: movement.id,
        type: movement.type,
        quantityDelta: movement.quantityDelta,
        balanceAfter: movement.balanceAfter ?? null,
        unitCost: movement.unitCost != null ? Number(movement.unitCost) : null,
        currency: movement.currency,
        comments: movement.comments,
        entryId: movement.entryId,
        saleId: movement.saleId,
        supplierName: movement.entry?.supplier?.name ?? null,
        customerName: movement.sale?.customerName ?? null,
        salesChannel: movement.sale?.salesChannel ?? null,
        createdByName: movement.createdBy?.name || movement.createdBy?.email || null,
        createdAt: movement.createdAt,
      }),
    );

    return {
      product: this.toAdminProduct(product),
      summary: {
        ...summary,
        calculatedStock: summary.totalIn - summary.totalOut + summary.netAdjustments,
      },
      movements: filteredMovements,
    };
  }

  async recordProductMovement(actor: Actor, id: string, input: RecordProductMovementDto) {
    const session = this.adminActor(actor);
    const rawDelta = Number(input.quantityDelta);
    if (!Number.isInteger(rawDelta) || rawDelta === 0) {
      throw new BadRequestException('La cantidad del movimiento debe ser un entero distinto de cero');
    }

    let delta: number;
    let movementType: InventoryMovementType;
    if (input.type === 'ENTRY') {
      if (rawDelta < 1) throw new BadRequestException('La cantidad de entrada debe ser mayor a 0');
      delta = rawDelta;
      movementType = InventoryMovementType.ENTRY;
    } else if (input.type === 'EXIT') {
      delta = -Math.abs(rawDelta);
      movementType = InventoryMovementType.EXIT;
    } else {
      delta = rawDelta;
      movementType = InventoryMovementType.ADJUSTMENT;
    }

    const unitCost = this.parseOptionalDecimal(input.unitCost, 'Costo unitario') ?? null;
    const comments = input.comments?.trim() || null;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.commerceProduct.findFirst({
        where: { id, tenantId: session.tenantId },
        select: this.adminProductSelect,
      });
      if (!product) throw new NotFoundException('Artículo no encontrado');

      const nextStock = product.stockOnHand + delta;
      if (nextStock < 0 || nextStock < product.reservedQuantity) {
        const available = Math.max(0, product.stockOnHand - product.reservedQuantity);
        throw new ConflictException(
          `Stock insuficiente para realizar el movimiento. Disponible actual: ${available}`,
        );
      }

      const update = await tx.commerceProduct.updateMany({
        where: {
          id: product.id,
          tenantId: session.tenantId,
          stockOnHand: product.stockOnHand,
          reservedQuantity: product.reservedQuantity,
        },
        data: { stockOnHand: nextStock },
      });
      if (update.count !== 1) {
        throw new ConflictException('El inventario cambió; vuelve a intentar');
      }

      const movement = await tx.inventoryMovement.create({
        data: {
          tenantId: session.tenantId,
          productId: product.id,
          type: movementType,
          quantityDelta: delta,
          balanceAfter: nextStock,
          unitCost,
          currency: product.currency,
          comments,
          createdById: session.id,
        },
      });

      await tx.commerceAuditLog.create({
        data: {
          tenantId: session.tenantId,
          actorId: session.id,
          entityType: 'PRODUCT',
          entityId: product.id,
          action: 'PRODUCT_MOVEMENT_RECORDED',
          payload: {
            movementId: movement.id,
            type: movementType,
            quantityDelta: delta,
            balanceAfter: nextStock,
            comments,
          },
        },
      });

      const updated = await tx.commerceProduct.findFirstOrThrow({
        where: { id: product.id, tenantId: session.tenantId },
        select: this.adminProductSelect,
      });

      return {
        movement: {
          id: movement.id,
          type: movement.type,
          quantityDelta: movement.quantityDelta,
          balanceAfter: movement.balanceAfter ?? nextStock,
          unitCost: movement.unitCost != null ? Number(movement.unitCost) : null,
          currency: movement.currency,
          comments: movement.comments,
          entryId: movement.entryId,
          saleId: movement.saleId,
          createdAt: movement.createdAt,
        },
        product: this.toAdminProduct(updated),
      };
    });
  }

  private readonly saleInclude = {
    reseller: { select: { id: true, name: true, email: true } },
    items: { orderBy: { createdAt: 'asc' as const } },
    payments: {
      orderBy: { recordedAt: 'asc' as const },
      include: { recordedBy: { select: { name: true, email: true } } },
    },
    reservations: { orderBy: { expiresAt: 'asc' as const } },
  };

  private formatHandoffCode(saleId: string) {
    return `ORD-${saleId.slice(0, 8).toUpperCase()}`;
  }

  private toSaleResponse(sale: any) {
    const subtotalAmount = Number(sale.subtotalAmount ?? 0);
    const discountAmount = Number(sale.discountAmount ?? 0);
    const totalAmount = Number(sale.totalAmount ?? 0);
    const paidAmount = Number(sale.paidAmount ?? 0);
    const activeReservations = Array.isArray(sale.reservations)
      ? sale.reservations.filter((r: any) => r.status === InventoryReservationStatus.ACTIVE)
      : [];
    const fallbackReservations = Array.isArray(sale.reservations) ? sale.reservations : [];
    const expiresAt = activeReservations[0]?.expiresAt ?? fallbackReservations[0]?.expiresAt ?? null;

    return {
      id: sale.id,
      handoffCode: this.formatHandoffCode(sale.id),
      tenantId: sale.tenantId,
      resellerId: sale.resellerId,
      resellerName: sale.reseller?.name || sale.reseller?.email || null,
      resellerEmail: sale.reseller?.email || null,
      salesChannel: sale.salesChannel,
      status: sale.status,
      paymentStatus: sale.paymentStatus,
      currency: sale.currency,
      customerName: sale.customerName ?? null,
      customerPhone: sale.customerPhone ?? null,
      subtotalAmount,
      discountAmount,
      totalAmount,
      paidAmount,
      balanceDue: Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100),
      notes: sale.notes ?? null,
      cancellationReason: sale.cancellationReason ?? null,
      expiresAt,
      paidAt: sale.paidAt ?? null,
      cancelledAt: sale.cancelledAt ?? null,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      items: Array.isArray(sale.items)
        ? sale.items.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            skuSnapshot: item.skuSnapshot,
            nameSnapshot: item.nameSnapshot,
            unitPrice: Number(item.unitPrice),
            quantity: item.quantity,
            lineTotal: Number(item.lineTotal),
            createdAt: item.createdAt,
          }))
        : [],
      payments: Array.isArray(sale.payments)
        ? sale.payments.map((payment: any) => ({
            id: payment.id,
            amount: Number(payment.amount),
            method: payment.method,
            reference: payment.reference ?? null,
            status: payment.status,
            recordedById: payment.recordedById ?? null,
            recordedByName: payment.recordedBy?.name || payment.recordedBy?.email || null,
            recordedAt: payment.recordedAt,
          }))
        : [],
      reservations: Array.isArray(sale.reservations)
        ? sale.reservations.map((reservation: any) => ({
            id: reservation.id,
            productId: reservation.productId,
            quantity: reservation.quantity,
            status: reservation.status,
            expiresAt: reservation.expiresAt,
          }))
        : [],
    };
  }

  private async releaseExpiredReservationsInTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    scope: {
      saleId?: string;
      salesChannel?: SalesChannel;
      resellerId?: string;
    } = {},
  ) {
    if (!tx.inventoryReservation?.findMany) return;
    const now = new Date();
    const unpaidPendingSale: Prisma.CommerceSaleWhereInput = {
      tenantId,
      status: CommerceSaleStatus.PENDING_PAYMENT,
      paidAmount: 0,
      ...(scope.salesChannel ? { salesChannel: scope.salesChannel } : {}),
      ...(scope.resellerId ? { resellerId: scope.resellerId } : {}),
    };
    const expired = await tx.inventoryReservation.findMany({
      where: {
        tenantId,
        status: InventoryReservationStatus.ACTIVE,
        expiresAt: { not: null, lte: now },
        ...(scope.saleId ? { saleId: scope.saleId } : {}),
        sale: { is: unpaidPendingSale },
      },
      select: { id: true, productId: true, saleId: true, quantity: true },
    });
    if (!expired.length) return;

    const expiredSaleIds = new Set<string>();
    for (const reservation of expired) {
      const claim = await tx.inventoryReservation.updateMany({
        where: {
          id: reservation.id,
          status: InventoryReservationStatus.ACTIVE,
          expiresAt: { not: null, lte: now },
          sale: { is: unpaidPendingSale },
        },
        data: { status: InventoryReservationStatus.EXPIRED },
      });
      if (claim.count !== 1) continue;

      const product = await tx.commerceProduct.findFirst({
        where: { id: reservation.productId, tenantId },
        select: { id: true, reservedQuantity: true },
      });
      if (product) {
        const decremented = await tx.commerceProduct.updateMany({
          where: {
            id: product.id,
            tenantId,
            reservedQuantity: product.reservedQuantity,
          },
          data: { reservedQuantity: Math.max(0, product.reservedQuantity - reservation.quantity) },
        });
        if (decremented.count !== 1) {
          throw new ConflictException('El inventario reservado cambió durante la expiración');
        }
      }
      if (reservation.saleId) expiredSaleIds.add(reservation.saleId);
    }

    for (const candidateSaleId of expiredSaleIds) {
      const remainingActive = await tx.inventoryReservation.count({
        where: { saleId: candidateSaleId, status: InventoryReservationStatus.ACTIVE },
      });
      if (remainingActive > 0) continue;

      const updatedSale = await tx.commerceSale.updateMany({
        where: {
          id: candidateSaleId,
          tenantId,
          status: CommerceSaleStatus.PENDING_PAYMENT,
          paidAmount: 0,
          ...(scope.salesChannel ? { salesChannel: scope.salesChannel } : {}),
          ...(scope.resellerId ? { resellerId: scope.resellerId } : {}),
        },
        data: { status: CommerceSaleStatus.EXPIRED },
      });
      if (updatedSale.count === 1) {
        await tx.commerceAuditLog.create({
          data: {
            tenantId,
            entityType: 'SALE',
            entityId: candidateSaleId,
            action: 'SALE_EXPIRED',
            payload: { reason: 'RESERVATION_TTL_EXPIRED' },
          },
        });
      }
    }
  }

  async checkout(actor: Actor, channel: SalesChannel, input: CheckoutInput, idempotencyKey?: string) {
    const session = this.actor(actor, channel);
    const key = String(idempotencyKey || '').trim();
    if (!key) throw new BadRequestException('Idempotency-Key es obligatorio');
    const replayWhere = {
      tenantId: session.tenantId,
      salesChannel: channel,
      resellerId: session.id,
      idempotencyKey: key,
    };
    const items = this.cart(input.items);
    const payments = Array.isArray(input.payments) ? input.payments : [];
    if (channel === SalesChannel.RESELLER_POS && payments.length) throw new ForbiddenException('Cared es responsable de procesar los pagos de revendedores');
    for (const payment of payments) {
      if (!Number.isFinite(Number(payment.amount)) || Number(payment.amount) <= 0 || !String(payment.method || '').trim()) throw new BadRequestException('Pago inválido');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const prior = await tx.commerceSale.findFirst({
          where: replayWhere,
          include: this.saleInclude,
        });
        if (prior) {
          return this.toSaleResponse(prior);
        }

        await this.releaseExpiredReservationsInTx(tx, session.tenantId, {
          salesChannel: channel,
          resellerId: session.id,
        });

        const products = await tx.commerceProduct.findMany({ where: { id: { in: items.map(i => i.productId) }, tenantId: session.tenantId, status: CommerceProductStatus.ACTIVE, ...(channel === SalesChannel.RESELLER_POS ? { availableToResellers: true } : {}) } });
        if (products.length !== items.length) throw new NotFoundException('Uno o más artículos no están disponibles');
        const productById = new Map(products.map(product => [product.id, product]));
        let subtotal = 0;
        const lines = items.map(item => {
          const product = productById.get(item.productId)!;
          const unitPrice = channel === SalesChannel.RESELLER_POS
            ? Number(product.resellerPrice ?? product.unitPrice)
            : Number(product.unitPrice);
          subtotal += unitPrice * item.quantity;
          return { product, quantity: item.quantity, unitPrice };
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
          if (fullyPaid) {
            await tx.inventoryMovement.create({
              data: {
                tenantId: session.tenantId,
                productId: product.id,
                saleId: sale.id,
                type: InventoryMovementType.EXIT,
                quantityDelta: -line.quantity,
                balanceAfter: product.stockOnHand - line.quantity,
                currency: sale.currency,
                comments: `Salida por venta (${channel}) · ${this.formatHandoffCode(sale.id)}`,
                createdById: session.id,
              },
            });
          }
          await tx.inventoryReservation.create({ data: { tenantId: session.tenantId, productId: product.id, resellerId: session.id, saleId: sale.id, quantity: line.quantity, status: fullyPaid ? InventoryReservationStatus.CONSUMED : InventoryReservationStatus.ACTIVE, expiresAt: fullyPaid || paid > 0 ? null : new Date(Date.now() + 30 * 60_000) } });
        }
        for (const payment of payments) await tx.commercePayment.create({ data: { saleId: sale.id, amount: new Prisma.Decimal(payment.amount), method: payment.method.trim(), reference: payment.reference?.trim(), status: CommercePaymentStatus.PAID, recordedById: session.id } });
        await tx.commerceAuditLog.create({ data: { tenantId: session.tenantId, actorId: session.id, entityType: 'SALE', entityId: sale.id, action: fullyPaid ? 'SALE_PAID' : 'SALE_RESERVED', payload: { channel, subtotal, paid } } });
        const created = await tx.commerceSale.findUniqueOrThrow({ where: { id: sale.id }, include: this.saleInclude });
        return this.toSaleResponse(created);
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const prior = await this.prisma.commerceSale.findFirst({
          where: replayWhere,
          include: this.saleInclude,
        });
        if (prior) return this.toSaleResponse(prior);
      }
      throw error;
    }
  }

  async listSales(
    actor: Actor,
    filters?: {
      channel?: SalesChannel;
      status?: CommerceSaleStatus;
      q?: string;
      scopeToReseller?: boolean;
    },
  ) {
    const channel = filters?.scopeToReseller ? SalesChannel.RESELLER_POS : SalesChannel.JEWELRY_INTERNAL;
    const session = this.actor(actor, channel);

    const sales = await this.prisma.$transaction(async (tx) => {
      await this.releaseExpiredReservationsInTx(tx, session.tenantId, {
        salesChannel:
          filters?.channel ??
          (filters?.scopeToReseller ? SalesChannel.RESELLER_POS : undefined),
        resellerId:
          filters?.scopeToReseller && session.role === Role.REVENDEDOR
            ? session.id
            : undefined,
      });

      const where: Prisma.CommerceSaleWhereInput = {
        tenantId: session.tenantId,
        ...(filters?.channel ? { salesChannel: filters.channel } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.scopeToReseller && session.role === Role.REVENDEDOR ? { resellerId: session.id } : {}),
      };

      return tx.commerceSale.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: this.saleInclude,
      });
    });

    const formatted = sales.map((sale) => this.toSaleResponse(sale));
    const needle = (filters?.q || '').trim().toLowerCase();
    if (!needle) return formatted;
    return formatted.filter((sale) => {
      const haystacks = [
        sale.id,
        sale.handoffCode,
        sale.customerName,
        sale.customerPhone,
        sale.resellerName,
        sale.resellerEmail,
        sale.notes,
        ...sale.items.flatMap((item: any) => [item.skuSnapshot, item.nameSnapshot]),
      ];
      return haystacks.some((value) => String(value || '').toLowerCase().includes(needle));
    });
  }

  async getSale(actor: Actor, saleId: string, scopeToReseller = false) {
    const session = this.actor(
      actor,
      scopeToReseller ? SalesChannel.RESELLER_POS : SalesChannel.JEWELRY_INTERNAL,
    );

    const sale = await this.prisma.$transaction(async (tx) => {
      await this.releaseExpiredReservationsInTx(tx, session.tenantId, {
        saleId,
        salesChannel: scopeToReseller ? SalesChannel.RESELLER_POS : undefined,
        resellerId:
          scopeToReseller && session.role === Role.REVENDEDOR ? session.id : undefined,
      });
      const found = await tx.commerceSale.findFirst({
        where: {
          id: saleId,
          tenantId: session.tenantId,
          ...(scopeToReseller ? { salesChannel: SalesChannel.RESELLER_POS } : {}),
        },
        include: this.saleInclude,
      });
      if (!found) throw new NotFoundException('Orden de venta no encontrada');
      if (scopeToReseller && session.role === Role.REVENDEDOR && found.resellerId !== session.id) {
        throw new ForbiddenException('No autorizado para ver esta orden de venta');
      }
      return found;
    });

    return this.toSaleResponse(sale);
  }

  async settleSale(
    actor: Actor,
    saleId: string,
    input: SettleSaleDto,
    idempotencyKey?: string,
  ) {
    const session = this.actor(actor, SalesChannel.JEWELRY_INTERNAL);
    const key = String(idempotencyKey || '').trim();
    if (!key) throw new BadRequestException('Idempotency-Key es obligatorio para registrar cobros');
    const payments = Array.isArray(input.payments) ? input.payments : [];
    if (!payments.length) {
      throw new BadRequestException('Debes registrar al menos un método de pago para cobrar la orden');
    }
    for (const payment of payments) {
      if (
        !Number.isFinite(Number(payment.amount)) ||
        Number(payment.amount) <= 0 ||
        !String(payment.method || '').trim()
      ) {
        throw new BadRequestException('Pago inválido: verifica monto y método de pago');
      }
    }

    const paymentReplayWhere = {
      saleId,
      idempotencyKey: key,
      sale: { tenantId: session.tenantId },
    };

    try {
      return await this.prisma.$transaction(async (tx) => {
        const replayPayment = await tx.commercePayment.findFirst({
          where: paymentReplayWhere,
          select: { id: true },
        });
        if (replayPayment) {
          const replaySale = await tx.commerceSale.findFirst({
            where: { id: saleId, tenantId: session.tenantId },
            include: this.saleInclude,
          });
          if (!replaySale) throw new NotFoundException('Orden de venta no encontrada');
          return this.toSaleResponse(replaySale);
        }

        await this.releaseExpiredReservationsInTx(tx, session.tenantId, { saleId });

        const sale = await tx.commerceSale.findFirst({
          where: { id: saleId, tenantId: session.tenantId },
          include: this.saleInclude,
        });
        if (!sale) throw new NotFoundException('Orden de venta no encontrada');
        if (sale.status === CommerceSaleStatus.PAID) {
          throw new ConflictException('Esta orden ya fue cobrada anteriormente');
        }
        if (sale.status !== CommerceSaleStatus.PENDING_PAYMENT) {
          throw new ConflictException('La orden ya no está vigente para cobro; genera una nueva orden');
        }

        const totalAmount = Math.round(Number(sale.totalAmount) * 100) / 100;
        const existingPaid = Math.round(Number(sale.paidAmount) * 100) / 100;
        const incomingPaid = Math.round(
          payments.reduce((sum, payment) => sum + Number(payment.amount), 0) * 100,
        ) / 100;
        const nextPaid = Math.round((existingPaid + incomingPaid) * 100) / 100;

        if (nextPaid > totalAmount) {
          throw new BadRequestException(
            `El monto excede el saldo pendiente (${(totalAmount - existingPaid).toFixed(2)})`,
          );
        }

        const fullyPaid = nextPaid === totalAmount;
        const notes = input.notes?.trim() || sale.notes || null;

        for (const [index, payment] of payments.entries()) {
          await tx.commercePayment.create({
            data: {
              saleId: sale.id,
              amount: new Prisma.Decimal(Number(payment.amount)),
              method: payment.method.trim(),
              reference: payment.reference?.trim() || null,
              status: CommercePaymentStatus.PAID,
              idempotencyKey: index === 0 ? key : null,
              recordedById: session.id,
            },
          });
        }

        const claimedSale = await tx.commerceSale.updateMany({
          where: {
            id: sale.id,
            tenantId: session.tenantId,
            status: CommerceSaleStatus.PENDING_PAYMENT,
            paidAmount: sale.paidAmount,
          },
          data: fullyPaid
            ? {
                status: CommerceSaleStatus.PAID,
                paymentStatus: CommercePaymentStatus.PAID,
                paidAmount: new Prisma.Decimal(nextPaid),
                paidAt: new Date(),
                notes,
              }
            : {
                paymentStatus: CommercePaymentStatus.PARTIAL,
                paidAmount: new Prisma.Decimal(nextPaid),
                notes,
              },
        });
        if (claimedSale.count !== 1) {
          throw new ConflictException('La orden cambió de estado o saldo; vuelve a intentar');
        }

        if (fullyPaid) {
          const qtyByProduct = new Map<string, number>();
          for (const item of sale.items) {
            qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) || 0) + item.quantity);
          }

          for (const [productId, quantity] of qtyByProduct) {
            const activeForProduct = sale.reservations.filter(
              (reservation) =>
                reservation.productId === productId &&
                reservation.status === InventoryReservationStatus.ACTIVE,
            );
            const reservedQty = activeForProduct.reduce(
              (sum, reservation) => sum + reservation.quantity,
              0,
            );
            if (activeForProduct.length === 0 || reservedQty !== quantity) {
              throw new ConflictException('La reserva de inventario cambió durante el cobro');
            }

            const consumed = await tx.inventoryReservation.updateMany({
              where: {
                saleId: sale.id,
                productId,
                status: InventoryReservationStatus.ACTIVE,
              },
              data: { status: InventoryReservationStatus.CONSUMED },
            });
            if (consumed.count !== activeForProduct.length) {
              throw new ConflictException('La reserva de inventario cambió durante el cobro');
            }

            const product = await tx.commerceProduct.findFirst({
              where: { id: productId, tenantId: session.tenantId },
              select: { id: true, sku: true, stockOnHand: true, reservedQuantity: true },
            });
            if (
              !product ||
              product.stockOnHand < quantity ||
              product.reservedQuantity < reservedQty
            ) {
              throw new ConflictException(`Stock insuficiente para liquidar ${product?.sku || productId}`);
            }

            const nextStock = product.stockOnHand - quantity;
            const nextReserved = product.reservedQuantity - reservedQty;
            const updatedProduct = await tx.commerceProduct.updateMany({
              where: {
                id: product.id,
                tenantId: session.tenantId,
                stockOnHand: product.stockOnHand,
                reservedQuantity: product.reservedQuantity,
              },
              data: {
                stockOnHand: nextStock,
                reservedQuantity: nextReserved,
              },
            });
            if (updatedProduct.count !== 1) {
              throw new ConflictException('El inventario cambió durante el cobro; vuelve a intentar');
            }

            await tx.inventoryMovement.create({
              data: {
                tenantId: session.tenantId,
                productId: product.id,
                saleId: sale.id,
                type: InventoryMovementType.EXIT,
                quantityDelta: -quantity,
                balanceAfter: nextStock,
                currency: sale.currency,
                comments: `Liquidación POS (${sale.salesChannel}) · ${this.formatHandoffCode(sale.id)}`,
                createdById: session.id,
              },
            });
          }
        } else {
          const activeReservations = sale.reservations.filter(
            (reservation) => reservation.status === InventoryReservationStatus.ACTIVE,
          );
          const protectedReservations = await tx.inventoryReservation.updateMany({
            where: {
              saleId: sale.id,
              status: InventoryReservationStatus.ACTIVE,
            },
            data: { expiresAt: null },
          });
          if (protectedReservations.count !== activeReservations.length) {
            throw new ConflictException('La reserva de inventario cambió durante el cobro');
          }
        }

        await tx.commerceAuditLog.create({
          data: {
            tenantId: session.tenantId,
            actorId: session.id,
            entityType: 'SALE',
            entityId: sale.id,
            action: fullyPaid ? 'SALE_SETTLED' : 'SALE_PARTIAL_PAYMENT',
            payload: {
              handoffCode: this.formatHandoffCode(sale.id),
              idempotencyKey: key,
              incomingPaid,
              nextPaid,
              totalAmount,
            },
          },
        });

        const refreshed = await tx.commerceSale.findUniqueOrThrow({
          where: { id: sale.id },
          include: this.saleInclude,
        });
        return this.toSaleResponse(refreshed);
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const replayPayment = await this.prisma.commercePayment.findFirst({
          where: paymentReplayWhere,
          select: { id: true },
        });
        if (replayPayment) {
          const replaySale = await this.prisma.commerceSale.findFirst({
            where: { id: saleId, tenantId: session.tenantId },
            include: this.saleInclude,
          });
          if (replaySale) return this.toSaleResponse(replaySale);
        }
      }
      throw error;
    }
  }

  async cancelSale(actor: Actor, saleId: string, input?: CancelSaleDto, scopeToReseller = false) {
    const session = this.actor(
      actor,
      scopeToReseller ? SalesChannel.RESELLER_POS : SalesChannel.JEWELRY_INTERNAL,
    );
    if (
      !scopeToReseller &&
      session.role !== Role.TENANT_ADMIN &&
      session.role !== Role.SYSTEM_ADMIN
    ) {
      throw new ForbiddenException('Sólo administradores pueden cancelar ventas internas');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.releaseExpiredReservationsInTx(tx, session.tenantId, {
        saleId,
        salesChannel: scopeToReseller ? SalesChannel.RESELLER_POS : undefined,
        resellerId:
          scopeToReseller && session.role === Role.REVENDEDOR ? session.id : undefined,
      });

      const sale = await tx.commerceSale.findFirst({
        where: {
          id: saleId,
          tenantId: session.tenantId,
          ...(scopeToReseller ? { salesChannel: SalesChannel.RESELLER_POS } : {}),
        },
        include: this.saleInclude,
      });
      if (!sale) throw new NotFoundException('Orden de venta no encontrada');
      if (scopeToReseller && session.role === Role.REVENDEDOR && sale.resellerId !== session.id) {
        throw new ForbiddenException('No autorizado para cancelar esta orden');
      }
      if (sale.status !== CommerceSaleStatus.PENDING_PAYMENT) {
        throw new ConflictException('Solo se pueden cancelar órdenes pendientes de cobro');
      }
      if (Number(sale.paidAmount) > 0) {
        throw new ConflictException('No se puede cancelar una orden con abonos registrados');
      }

      const reason = input?.reason?.trim() || 'Cancelada por el usuario';
      const claimedSale = await tx.commerceSale.updateMany({
        where: {
          id: sale.id,
          tenantId: session.tenantId,
          status: CommerceSaleStatus.PENDING_PAYMENT,
          paidAmount: 0,
          ...(scopeToReseller ? { salesChannel: SalesChannel.RESELLER_POS } : {}),
          ...(scopeToReseller && session.role === Role.REVENDEDOR
            ? { resellerId: session.id }
            : {}),
        },
        data: {
          status: CommerceSaleStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
      });
      if (claimedSale.count !== 1) {
        throw new ConflictException('La orden cambió de estado o saldo; vuelve a intentar');
      }

      const activeReservations = sale.reservations.filter(
        (r) => r.status === InventoryReservationStatus.ACTIVE,
      );
      for (const reservation of activeReservations) {
        const claim = await tx.inventoryReservation.updateMany({
          where: { id: reservation.id, status: InventoryReservationStatus.ACTIVE },
          data: { status: InventoryReservationStatus.RELEASED },
        });
        if (claim.count !== 1) {
          throw new ConflictException('La reserva de inventario cambió durante la cancelación');
        }

        const product = await tx.commerceProduct.findFirst({
          where: { id: reservation.productId, tenantId: session.tenantId },
          select: { id: true, reservedQuantity: true },
        });
        if (product) {
          const released = await tx.commerceProduct.updateMany({
            where: {
              id: product.id,
              tenantId: session.tenantId,
              reservedQuantity: product.reservedQuantity,
            },
            data: { reservedQuantity: Math.max(0, product.reservedQuantity - reservation.quantity) },
          });
          if (released.count !== 1) {
            throw new ConflictException('El inventario cambió durante la cancelación');
          }
        }
      }

      await tx.commerceAuditLog.create({
        data: {
          tenantId: session.tenantId,
          actorId: session.id,
          entityType: 'SALE',
          entityId: sale.id,
          action: 'SALE_CANCELLED',
          payload: { reason, handoffCode: this.formatHandoffCode(sale.id) },
        },
      });

      const refreshed = await tx.commerceSale.findUniqueOrThrow({
        where: { id: sale.id },
        include: this.saleInclude,
      });
      return this.toSaleResponse(refreshed);
    });
  }
}
