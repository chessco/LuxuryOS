import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
      currency: product.currency,
      stockOnHand: product.stockOnHand,
      reservedQuantity: product.reservedQuantity,
      availableQuantity,
      availabilityStatus,
    };
  }
}
