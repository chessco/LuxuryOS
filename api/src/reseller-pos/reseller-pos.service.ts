import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommerceCommissionStatus, Prisma, Role, SalesChannel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { priceResellerLines } from '../commerce/commerce-pricing.util';
import {
  ResellerCatalogItemResponse,
  ResellerCatalogResponse,
  ResellerInventoryItemResponse,
  ResellerInventoryResponse,
  ResellerProfileResponse,
} from './reseller-pos.contract';

@Injectable()
export class ResellerPosService {
  constructor(private readonly prisma: PrismaService) {}

  async listCommissions(
    actor: { id: string; tenantId: string; role: Role },
    query: { resellerId?: string; status?: string; currency?: string; from?: string; to?: string; page?: string; limit?: string },
  ) {
    if (actor.role !== Role.REVENDEDOR && actor.role !== Role.TENANT_ADMIN && actor.role !== Role.SYSTEM_ADMIN) throw new ForbiddenException('No autorizado para consultar márgenes');
    if (actor.role === Role.REVENDEDOR && query.resellerId && query.resellerId !== actor.id) {
      throw new ForbiddenException('No autorizado para consultar otro revendedor');
    }
    const status = query.status?.trim() || undefined;
    if (status && !['PENDING', 'PENDING_CREDIT', 'EARNED', 'VOIDED'].includes(status)) throw new BadRequestException('Estado de margen inválido');
    const currency = query.currency?.trim().toUpperCase() || undefined;
    if (currency && !/^[A-Z]{3}$/.test(currency)) throw new BadRequestException('Moneda inválida');
    const parseDate = (value: string | undefined, end: boolean) => {
      if (!value) return undefined;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Fecha inválida; usa YYYY-MM-DD');
      const date = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z`);
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new BadRequestException('Fecha inválida');
      return date;
    };
    const from = parseDate(query.from, false);
    const to = parseDate(query.to, true);
    if (from && to && from > to) throw new BadRequestException('La fecha inicial debe ser anterior a la final');
    const page = query.page == null ? 1 : Number(query.page);
    const limit = query.limit == null ? 20 : Number(query.limit);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException('Paginación inválida');
    const where: Prisma.CommerceSaleWhereInput = {
      tenantId: actor.tenantId,
      salesChannel: SalesChannel.RESELLER_POS,
      commissionStatus: { not: CommerceCommissionStatus.NONE },
      ...(actor.role === Role.REVENDEDOR ? { resellerId: actor.id } : query.resellerId ? { resellerId: query.resellerId } : {}),
      ...(currency ? { currency } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    };
    const [groups, count, sales] = await Promise.all([
      this.prisma.commerceSale.groupBy({ by: ['currency', 'commissionStatus'], where, _sum: { commissionAmount: true }, _count: { _all: true } }),
      this.prisma.commerceSale.count({ where: { ...where, ...(status ? { commissionStatus: status as CommerceCommissionStatus } : {}) } }),
      this.prisma.commerceSale.findMany({
        where: { ...where, ...(status ? { commissionStatus: status as CommerceCommissionStatus } : {}) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit,
        select: { id: true, resellerId: true, currency: true, createdAt: true, commissionAmount: true, commissionStatus: true, commissionEarnedAt: true, totalAmount: true, publicTotalAmount: true },
      }),
    ]);
    const totalsByCurrency: Record<string, Record<string, number>> = {};
    for (const group of groups) {
      const row = totalsByCurrency[group.currency] ??= { PENDING: 0, PENDING_CREDIT: 0, EARNED: 0, VOIDED: 0 };
      row[group.commissionStatus] = Number(group._sum.commissionAmount ?? 0);
    }
    return {
      totalsByCurrency,
      items: sales.map(sale => ({ ...sale, commissionAmount: Number(sale.commissionAmount ?? 0), totalAmount: Number(sale.totalAmount), publicTotalAmount: sale.publicTotalAmount == null ? null : Number(sale.publicTotalAmount) })),
      page, limit, total: count,
    };
  }

  async calculateQuote(tenantId: string, requested: { productId: string; quantity: number }[]) {
    if (!Array.isArray(requested) || !requested.length) throw new BadRequestException('El carrito no puede estar vacío');
    const quantities = new Map<string, number>();
    for (const item of requested) {
      const id = String(item.productId || '').trim();
      if (!id || !Number.isInteger(item.quantity) || item.quantity < 1) throw new BadRequestException('Artículo o cantidad inválidos');
      quantities.set(id, (quantities.get(id) || 0) + item.quantity);
    }
    const items = [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
    const products = await this.prisma.commerceProduct.findMany({
      where: { tenantId, id: { in: items.map(item => item.productId) }, status: 'ACTIVE', availableToResellers: true },
      select: { id: true, sku: true, name: true, currency: true, unitPrice: true, resellerPrice: true, stockOnHand: true, reservedQuantity: true },
    });
    if (products.length !== items.length) throw new NotFoundException('Uno o más artículos no están disponibles');
    if (new Set(products.map(product => product.currency)).size !== 1) throw new BadRequestException('Todos los artículos deben usar la misma moneda');
    const priced = priceResellerLines(items, products);
    const expired = await this.prisma.inventoryReservation.findMany({
      where: {
        tenantId,
        productId: { in: items.map(item => item.productId) },
        status: 'ACTIVE',
        expiresAt: { not: null, lte: new Date() },
        sale: { is: { status: 'PENDING_PAYMENT', paidAmount: 0 } },
      },
      select: { productId: true, quantity: true },
    });
    const expiredByProduct = new Map<string, number>();
    for (const hold of expired) expiredByProduct.set(hold.productId, (expiredByProduct.get(hold.productId) || 0) + hold.quantity);
    const byId = new Map(products.map(product => [product.id, product]));
    const lines = priced.lines.map(line => {
      const product = byId.get(line.productId)!;
      const availableQuantity = Math.max(0, product.stockOnHand - product.reservedQuantity + (expiredByProduct.get(line.productId) || 0));
      return { ...line, sku: product.sku, name: product.name, availableQuantity, isAvailable: availableQuantity >= line.quantity };
    });
    return {
      lines,
      currency: products[0].currency,
      publicTotalAmount: Math.round(lines.reduce((sum, line) => sum + line.publicLineTotal, 0) * 100) / 100,
      totalAmount: Math.round(lines.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100,
      estimatedMargin: Math.round(lines.reduce((sum, line) => sum + line.commissionAmount, 0) * 100) / 100,
      allItemsAvailable: lines.every(line => line.isAvailable),
      reservesInventory: false,
      quoteFingerprint: priced.quoteFingerprint,
      evaluatedAt: new Date().toISOString(),
    };
  }

  async getProfile(user: {
    id: string;
    name?: string | null;
    tenantId: string;
    role: 'REVENDEDOR' | 'TENANT_ADMIN' | 'SYSTEM_ADMIN';
  }): Promise<ResellerProfileResponse> {
    return {
      id: user.id,
      name: user.name ?? null,
      tenantId: user.tenantId,
      role: user.role,
      salesChannel: 'RESELLER_POS',
    };
  }

  async getCatalog(tenantId: string): Promise<ResellerCatalogResponse> {
    const products = await this.prisma.commerceProduct.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        availableToResellers: true,
      },
      orderBy: [{ name: 'asc' }, { sku: 'asc' }],
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        category: true,
        imageUrl: true,
        unitPrice: true,
        resellerPrice: true,
        currency: true,
        stockOnHand: true,
        reservedQuantity: true,
      },
    });

    return { items: products.map((product) => this.toCatalogItem(product)) };
  }

  async getInventory(tenantId: string): Promise<ResellerInventoryResponse> {
    const products = await this.prisma.commerceProduct.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        availableToResellers: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }, { sku: 'asc' }],
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        imageUrl: true,
        unitPrice: true,
        resellerPrice: true,
        currency: true,
        stockOnHand: true,
        reservedQuantity: true,
      },
    });
    const items = products.map((product) => this.toInventoryItem(product));

    return {
      items,
      summary: items.reduce(
        (summary, item) => ({
          productCount: summary.productCount + 1,
          stockOnHandQuantity: summary.stockOnHandQuantity + item.stockOnHand,
          reservedQuantity: summary.reservedQuantity + item.reservedQuantity,
          availableQuantity: summary.availableQuantity + item.availableQuantity,
          lowStockCount: summary.lowStockCount + (item.availabilityStatus === 'LOW_STOCK' ? 1 : 0),
          outOfStockCount: summary.outOfStockCount + (item.availabilityStatus === 'OUT_OF_STOCK' ? 1 : 0),
        }),
        {
          productCount: 0,
          stockOnHandQuantity: 0,
          reservedQuantity: 0,
          availableQuantity: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
        },
      ),
    };
  }

  private toCatalogItem(product: {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    category: string | null;
    imageUrl: string | null;
    unitPrice: { toString(): string } | number;
    resellerPrice?: { toString(): string } | number | null;
    currency: string;
    stockOnHand: number;
    reservedQuantity: number;
  }): ResellerCatalogItemResponse {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      imageUrl: product.imageUrl,
      unitPrice: Number(product.resellerPrice ?? product.unitPrice),
      publicUnitPrice: Number(product.unitPrice),
      estimatedMargin: Math.max(0, Number(product.unitPrice) - Number(product.resellerPrice ?? product.unitPrice)),
      currency: product.currency,
      availableQuantity: Math.max(0, product.stockOnHand - product.reservedQuantity),
    };
  }

  private toInventoryItem(product: {
    id: string;
    sku: string;
    name: string;
    category: string | null;
    imageUrl: string | null;
    unitPrice: { toString(): string } | number;
    resellerPrice?: { toString(): string } | number | null;
    currency: string;
    stockOnHand: number;
    reservedQuantity: number;
  }): ResellerInventoryItemResponse {
    const availableQuantity = Math.max(0, product.stockOnHand - product.reservedQuantity);
    const availabilityStatus = availableQuantity === 0
      ? (product.stockOnHand === 0 ? 'OUT_OF_STOCK' : 'RESERVED')
      : (availableQuantity <= 2 ? 'LOW_STOCK' : 'AVAILABLE');

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      imageUrl: product.imageUrl,
      unitPrice: Number(product.resellerPrice ?? product.unitPrice),
      publicUnitPrice: Number(product.unitPrice),
      estimatedMargin: Math.max(0, Number(product.unitPrice) - Number(product.resellerPrice ?? product.unitPrice)),
      currency: product.currency,
      stockOnHand: product.stockOnHand,
      reservedQuantity: product.reservedQuantity,
      availableQuantity,
      availabilityStatus,
    };
  }
}
