import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { CommerceCommissionStatus, CommercePaymentStatus, CommerceProductStatus, CommerceSaleStatus, CreditSubjectType, InventoryMovementType, InventoryReservationStatus, Prisma, Role, SalesChannel } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from './credit.service';
import { CreditDrawdownDto } from './dto/commerce-credit.dto';
import { CreateProductDto, RecordProductMovementDto, UpdateProductDto } from './dto/commerce-product.dto';
import { CancelSaleDto, CreateSaleDto, SettleSaleDto } from './dto/commerce-sale.dto';
import { priceResellerLines } from './commerce-pricing.util';

type Actor = { id?: string; sub?: string; tenantId?: string; role?: Role };
type CartItem = { productId: string; quantity: number };
type PaymentInput = { amount: number; method: string; reference?: string };
type CheckoutInput = CreateSaleDto | { items: CartItem[]; clientId?: string; customerName?: string; customerPhone?: string; payments?: PaymentInput[]; creditDrawdowns?: CreditDrawdownDto[]; allowOverdueOverride?: boolean; notes?: string; expectedQuoteFingerprint?: string };

@Injectable()
export class CommerceService {
  private readonly credit: CreditService;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() creditService?: CreditService,
  ) {
    this.credit = creditService ?? new CreditService(prisma);
  }

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
      ...(actor.role === Role.VENDEDOR ? { wholesalePrice: undefined } : { wholesalePrice: product.wholesalePrice != null ? Number(product.wholesalePrice) : null }),
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
    creditObligations: { orderBy: { issuedAt: 'asc' as const } },
  };

  private formatHandoffCode(saleId: string) {
    return `ORD-${saleId.slice(0, 8).toUpperCase()}`;
  }

  private toSaleResponse(sale: any, actorRole: Role) {
    const showMargin = (actorRole === Role.REVENDEDOR || actorRole === Role.TENANT_ADMIN || actorRole === Role.SYSTEM_ADMIN) && sale.salesChannel === SalesChannel.RESELLER_POS;
    const subtotalAmount = Number(sale.subtotalAmount ?? 0);
    const discountAmount = Number(sale.discountAmount ?? 0);
    const totalAmount = Number(sale.totalAmount ?? 0);
    const paidAmount = Number(sale.paidAmount ?? 0);
    const creditedAmount = Number(sale.creditedAmount ?? 0);
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
      clientId: sale.clientId ?? null,
      salesChannel: sale.salesChannel,
      status: sale.status,
      paymentStatus: sale.paymentStatus,
      currency: sale.currency,
      customerName: sale.customerName ?? null,
      customerPhone: sale.customerPhone ?? null,
      subtotalAmount,
      discountAmount,
      totalAmount,
      ...(showMargin ? {
        publicTotalAmount: sale.publicTotalAmount == null ? null : Number(sale.publicTotalAmount),
        commissionAmount: sale.commissionAmount == null ? null : Number(sale.commissionAmount),
        commissionStatus: sale.commissionStatus,
        commissionEarnedAt: sale.commissionEarnedAt ?? null,
      } : {}),
      paidAmount,
      creditedAmount,
      balanceDue: Math.max(0, Math.round((totalAmount - paidAmount - creditedAmount) * 100) / 100),
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
            ...(showMargin ? {
              publicUnitPrice: item.publicUnitPrice == null ? null : Number(item.publicUnitPrice),
              commissionUnitAmount: item.commissionUnitAmount == null ? null : Number(item.commissionUnitAmount),
              commissionAmount: item.commissionAmount == null ? null : Number(item.commissionAmount),
            } : {}),
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
      creditObligations: Array.isArray(sale.creditObligations)
        ? sale.creditObligations.map((obligation: any) => ({
            id: obligation.id,
            code: this.credit.formatObligationCode(obligation.id),
            facilityType: obligation.facilityType,
            title: obligation.title,
            principalAmount: Number(obligation.principalAmount),
            paidAmount: Number(obligation.paidAmount),
            balanceDue: Number(obligation.balanceDue),
            dueAt: obligation.dueAt,
            status: obligation.status,
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
        await tx.commerceSale.updateMany({
          where: { id: candidateSaleId, tenantId, commissionStatus: CommerceCommissionStatus.PENDING },
          data: { commissionStatus: CommerceCommissionStatus.VOIDED },
        });
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

  /**
   * Releases expired, unpaid reservations for every affected tenant. This is
   * deliberately separate from request-time cleanup so abandoned carts cannot
   * keep stock reserved until somebody happens to visit the same sales view.
   * The existing compare-and-swap claims keep the operation safe when more
   * than one API replica runs this method at the same time.
   */
  async releaseExpiredReservationsGlobally() {
    const now = new Date();
    const tenants = await this.prisma.inventoryReservation.findMany({
      where: {
        status: InventoryReservationStatus.ACTIVE,
        expiresAt: { not: null, lte: now },
        sale: {
          is: {
            status: CommerceSaleStatus.PENDING_PAYMENT,
            paidAmount: 0,
          },
        },
      },
      distinct: ['tenantId'],
      select: { tenantId: true },
    });

    for (const { tenantId } of tenants) {
      await this.prisma.$transaction((tx) =>
        this.releaseExpiredReservationsInTx(tx, tenantId),
      );
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
    const clientId = String(input.clientId || '').trim() || null;
    const payments = Array.isArray(input.payments) ? input.payments : [];
    const creditDrawdowns = Array.isArray((input as CreateSaleDto).creditDrawdowns)
      ? (input as CreateSaleDto).creditDrawdowns!
      : [];
    if (channel === SalesChannel.RESELLER_POS && (payments.length || creditDrawdowns.length)) {
      throw new ForbiddenException('Cared es responsable de procesar los pagos y créditos de revendedores');
    }
    for (const payment of payments) {
      if (!Number.isFinite(Number(payment.amount)) || Number(payment.amount) <= 0 || !String(payment.method || '').trim()) throw new BadRequestException('Pago inválido');
    }
    for (const drawdown of creditDrawdowns) {
      if (!Number.isFinite(Number(drawdown.amount)) || Number(drawdown.amount) <= 0) {
        throw new BadRequestException('Monto de crédito inválido');
      }
    }
    if (creditDrawdowns.length > 0 && !clientId) {
      throw new BadRequestException('Selecciona un cliente registrado para otorgar crédito a 30 días');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const prior = await tx.commerceSale.findFirst({
          where: replayWhere,
          include: this.saleInclude,
        });
        if (prior) {
          return this.toSaleResponse(prior, session.role);
        }

        if (clientId) {
          const client = await tx.client.findFirst({
            where: { id: clientId, tenantId: session.tenantId },
            select: { id: true },
          });
          if (!client) throw new NotFoundException('Cliente no encontrado');
        }

        await this.releaseExpiredReservationsInTx(tx, session.tenantId);

        const products = await tx.commerceProduct.findMany({ where: { id: { in: items.map(i => i.productId) }, tenantId: session.tenantId, status: CommerceProductStatus.ACTIVE, ...(channel === SalesChannel.RESELLER_POS ? { availableToResellers: true } : {}) } });
        if (products.length !== items.length) throw new NotFoundException('Uno o más artículos no están disponibles');
        if (new Set(products.map(product => product.currency)).size > 1) {
          throw new BadRequestException('Todos los artículos de una venta deben usar la misma moneda');
        }
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
        const priced = channel === SalesChannel.RESELLER_POS ? priceResellerLines(items, products) : null;
        const pricedById = new Map(priced?.lines.map(line => [line.productId, line]) || []);
        if (priced) subtotal = Math.round(priced.lines.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100;
        if (channel === SalesChannel.RESELLER_POS && subtotal <= 0) {
          throw new BadRequestException('El total de la venta debe ser mayor a cero');
        }
        if (channel === SalesChannel.RESELLER_POS) {
          const currentQuote = priced ? {
            lines: priced.lines.map(line => {
              const product = productById.get(line.productId)!;
              const availableQuantity = Math.max(0, product.stockOnHand - product.reservedQuantity);
              return { ...line, sku: product.sku, name: product.name, availableQuantity, isAvailable: availableQuantity >= line.quantity };
            }),
            currency: products[0].currency,
            publicTotalAmount: Math.round(priced.lines.reduce((sum, line) => sum + line.publicLineTotal, 0) * 100) / 100,
            totalAmount: Math.round(priced.lines.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100,
            estimatedMargin: Math.round(priced.lines.reduce((sum, line) => sum + line.commissionAmount, 0) * 100) / 100,
            allItemsAvailable: true,
            reservesInventory: false,
            quoteFingerprint: priced.quoteFingerprint,
            evaluatedAt: new Date().toISOString(),
          } : null;
          const unavailable = lines.filter(line => line.product.stockOnHand - line.product.reservedQuantity < line.quantity);
          if (unavailable.length) throw new ConflictException({ code: 'INSUFFICIENT_STOCK', message: 'Stock insuficiente', conflicts: unavailable.map(line => ({ productId: line.product.id, availableQuantity: Math.max(0, line.product.stockOnHand - line.product.reservedQuantity) })), currentQuote: { ...currentQuote, allItemsAvailable: false } });
          if (input.expectedQuoteFingerprint && input.expectedQuoteFingerprint !== priced?.quoteFingerprint) {
            throw new ConflictException({ code: 'QUOTE_DRIFT', message: 'Los precios cambiaron; revisa la cotización', conflicts: [], currentQuote });
          }
        }
        const paid = Math.round(payments.reduce((sum, payment) => sum + Number(payment.amount), 0) * 100) / 100;
        const credited = Math.round(creditDrawdowns.reduce((sum, drawdown) => sum + Number(drawdown.amount), 0) * 100) / 100;
        const totalCovered = Math.round((paid + credited) * 100) / 100;
        if (totalCovered > subtotal) throw new BadRequestException('El pago y crédito no pueden exceder el total');
        if (credited > 0 && totalCovered !== subtotal) {
          throw new BadRequestException('Al aplicar crédito, el enganche más el crédito deben cubrir el 100% de la orden');
        }
        const fullyPaid = totalCovered === subtotal;
        const sale = await tx.commerceSale.create({ data: {
          tenantId: session.tenantId, resellerId: session.id, salesChannel: channel,
          status: fullyPaid ? CommerceSaleStatus.PAID : CommerceSaleStatus.PENDING_PAYMENT,
          paymentStatus: fullyPaid ? CommercePaymentStatus.PAID : paid > 0 ? CommercePaymentStatus.PARTIAL : CommercePaymentStatus.PENDING,
          currency: lines[0]?.product.currency || 'MXN', clientId, customerName: input.customerName?.trim() || null, customerPhone: input.customerPhone?.trim() || null,
          subtotalAmount: new Prisma.Decimal(subtotal), totalAmount: new Prisma.Decimal(subtotal), paidAmount: new Prisma.Decimal(paid), ...(credited > 0 ? { creditedAmount: new Prisma.Decimal(credited) } : {}), notes: input.notes?.trim() || null, idempotencyKey: key, paidAt: fullyPaid ? new Date() : null,
          ...(priced ? { publicTotalAmount: new Prisma.Decimal(Math.round(priced.lines.reduce((sum, line) => sum + line.publicLineTotal, 0) * 100) / 100), commissionAmount: new Prisma.Decimal(Math.round(priced.lines.reduce((sum, line) => sum + line.commissionAmount, 0) * 100) / 100), commissionStatus: CommerceCommissionStatus.PENDING } : {}),
          items: { create: lines.map(line => ({ productId: line.product.id, skuSnapshot: line.product.sku, nameSnapshot: line.product.name, unitPrice: new Prisma.Decimal(line.unitPrice), quantity: line.quantity, lineTotal: new Prisma.Decimal(pricedById.get(line.product.id)?.lineTotal ?? Math.round(line.unitPrice * line.quantity * 100) / 100), ...(pricedById.has(line.product.id) ? { publicUnitPrice: new Prisma.Decimal(pricedById.get(line.product.id)!.publicUnitPrice), commissionUnitAmount: new Prisma.Decimal(pricedById.get(line.product.id)!.commissionUnitAmount), commissionAmount: new Prisma.Decimal(pricedById.get(line.product.id)!.commissionAmount) } : {}) })) },
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
        if (creditDrawdowns.length > 0) {
          const itemLabel = lines.map((line) => `${line.quantity}x ${line.product.name}`).join(', ').slice(0, 140);
          await this.credit.applySaleCreditDrawdownsInTx(tx, {
            tenantId: session.tenantId,
            actorId: session.id,
            actorRole: session.role,
            saleId: sale.id,
            saleHandoffCode: this.formatHandoffCode(sale.id),
            currency: sale.currency,
            subjectType: CreditSubjectType.CLIENT,
            clientId,
            drawdowns: creditDrawdowns.map((drawdown) => ({
              ...drawdown,
              title: drawdown.title?.trim() || `${itemLabel} · ${this.formatHandoffCode(sale.id)}`,
            })),
            allowOverdueOverride: Boolean((input as CreateSaleDto).allowOverdueOverride),
          });
        }
        await tx.commerceAuditLog.create({ data: { tenantId: session.tenantId, actorId: session.id, entityType: 'SALE', entityId: sale.id, action: fullyPaid ? 'SALE_PAID' : 'SALE_RESERVED', payload: { channel, subtotal, paid, credited } } });
        const created = await tx.commerceSale.findUniqueOrThrow({ where: { id: sale.id }, include: this.saleInclude });
        return this.toSaleResponse(created, session.role);
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const prior = await this.prisma.commerceSale.findFirst({
          where: replayWhere,
          include: this.saleInclude,
        });
        if (prior) return this.toSaleResponse(prior, session.role);
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
    const needle = (filters?.q || '').trim();
    const handoffNeedle = needle.toUpperCase().startsWith('ORD-')
      ? needle.slice(4)
      : needle;

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
        ...(needle
          ? {
              OR: [
                { id: { contains: handoffNeedle } },
                { customerName: { contains: needle } },
                { customerPhone: { contains: needle } },
                { notes: { contains: needle } },
                {
                  reseller: {
                    is: {
                      OR: [
                        { name: { contains: needle } },
                        { email: { contains: needle } },
                      ],
                    },
                  },
                },
                {
                  items: {
                    some: {
                      OR: [
                        { skuSnapshot: { contains: needle } },
                        { nameSnapshot: { contains: needle } },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      };

      return tx.commerceSale.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: this.saleInclude,
      });
    });

    return sales.map((sale) => this.toSaleResponse(sale, session.role));
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

    return this.toSaleResponse(sale, session.role);
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
    const creditDrawdowns = Array.isArray(input.creditDrawdowns) ? input.creditDrawdowns : [];
    if (!payments.length && !creditDrawdowns.length) {
      throw new BadRequestException('Debes registrar al menos un método de pago o crédito para cobrar la orden');
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
    for (const drawdown of creditDrawdowns) {
      if (!Number.isFinite(Number(drawdown.amount)) || Number(drawdown.amount) <= 0) {
        throw new BadRequestException('Monto de disposición de crédito inválido');
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
        const replayCredit = !replayPayment && tx.creditObligation?.findFirst
          ? await tx.creditObligation.findFirst({
              where: {
                tenantId: session.tenantId,
                saleId,
                idempotencyKey: `${saleId}:${createHash('sha256').update(key).digest('hex')}:0`,
              },
              select: { id: true },
            })
          : null;
        if (replayPayment || replayCredit) {
          const replaySale = await tx.commerceSale.findFirst({
            where: { id: saleId, tenantId: session.tenantId },
            include: this.saleInclude,
          });
          if (!replaySale) throw new NotFoundException('Orden de venta no encontrada');
          return this.toSaleResponse(replaySale, session.role);
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
        const existingCredited = Math.round(Number(sale.creditedAmount ?? 0) * 100) / 100;
        const incomingPaid = Math.round(
          payments.reduce((sum, payment) => sum + Number(payment.amount), 0) * 100,
        ) / 100;
        const incomingCredited = Math.round(
          creditDrawdowns.reduce((sum, drawdown) => sum + Number(drawdown.amount), 0) * 100,
        ) / 100;
        const nextPaid = Math.round((existingPaid + incomingPaid) * 100) / 100;
        const nextCredited = Math.round((existingCredited + incomingCredited) * 100) / 100;
        const totalCovered = Math.round((nextPaid + nextCredited) * 100) / 100;

        if (totalCovered > totalAmount) {
          throw new BadRequestException(
            `El monto excede el saldo pendiente (${(totalAmount - existingPaid - existingCredited).toFixed(2)})`,
          );
        }
        if (incomingCredited > 0 && totalCovered !== totalAmount) {
          throw new BadRequestException(
            'Al aplicar crédito en caja, el pago y las líneas de crédito deben liquidar el 100% del saldo pendiente.',
          );
        }

        const fullyPaid = totalCovered === totalAmount;
        const notes = input.notes?.trim() || sale.notes || null;
        const overrideClientId = String(input.clientId || '').trim() || null;

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
                ...(nextCredited > 0 ? { creditedAmount: new Prisma.Decimal(nextCredited) } : {}),
                ...(overrideClientId && !sale.clientId ? { clientId: overrideClientId } : {}),
                paidAt: new Date(),
                ...(sale.commissionStatus === CommerceCommissionStatus.PENDING ? {
                  commissionStatus: nextCredited > 0 ? CommerceCommissionStatus.PENDING_CREDIT : CommerceCommissionStatus.EARNED,
                  commissionEarnedAt: nextCredited > 0 ? null : new Date(),
                } : {}),
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

          if (creditDrawdowns.length > 0) {
            const effectiveClientId = overrideClientId || sale.clientId || null;
            const creditSubjectType =
              sale.salesChannel === SalesChannel.RESELLER_POS && !overrideClientId
                ? CreditSubjectType.RESELLER
                : CreditSubjectType.CLIENT;
            if (creditSubjectType === CreditSubjectType.CLIENT && !effectiveClientId) {
              throw new BadRequestException('Selecciona un cliente registrado para otorgar crédito a 30 días');
            }
            const itemLabel = sale.items
              .map((item: any) => `${item.quantity}x ${item.nameSnapshot}`)
              .join(', ')
              .slice(0, 140);
            await this.credit.applySaleCreditDrawdownsInTx(tx, {
              tenantId: session.tenantId,
              actorId: session.id,
              actorRole: session.role,
              saleId: sale.id,
              saleHandoffCode: this.formatHandoffCode(sale.id),
              currency: sale.currency,
              subjectType: creditSubjectType,
              resellerId: creditSubjectType === CreditSubjectType.RESELLER ? sale.resellerId : null,
              clientId: creditSubjectType === CreditSubjectType.CLIENT ? effectiveClientId : null,
              drawdowns: creditDrawdowns.map((drawdown) => ({
                ...drawdown,
                title:
                  drawdown.title?.trim() ||
                  `${itemLabel || 'Orden POS'} · ${this.formatHandoffCode(sale.id)}`,
              })),
              allowOverdueOverride: Boolean(input.allowOverdueOverride),
              idempotencyKey: key,
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
              incomingCredited,
              nextPaid,
              nextCredited,
              totalAmount,
            },
          },
        });

        const refreshed = await tx.commerceSale.findUniqueOrThrow({
          where: { id: sale.id },
          include: this.saleInclude,
        });
        return this.toSaleResponse(refreshed, session.role);
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
          if (replaySale) return this.toSaleResponse(replaySale, session.role);
        }
      }
      throw error;
    }
  }

  getResellerCredit(actor: Actor) {
    return this.credit.getResellerCredit(actor);
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
          ...(sale.commissionStatus === CommerceCommissionStatus.PENDING ? { commissionStatus: CommerceCommissionStatus.VOIDED } : {}),
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
      return this.toSaleResponse(refreshed, session.role);
    });
  }
}
