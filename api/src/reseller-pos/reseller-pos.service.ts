import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommerceProductDto } from './dto/create-commerce-product.dto';
import {
  ResellerCatalogItemResponse,
  ResellerCatalogResponse,
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
        currency: true,
        stockOnHand: true,
        reservedQuantity: true,
      },
    });

    return { items: products.map((product) => this.toCatalogItem(product)) };
  }

  async createCatalogProduct(
    tenantId: string,
    dto: CreateCommerceProductDto,
  ): Promise<ResellerCatalogItemResponse> {
    try {
      const product = await this.prisma.commerceProduct.create({
        data: {
          tenantId,
          sku: dto.sku.trim().toUpperCase(),
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          category: dto.category?.trim() || null,
          imageUrl: dto.imageUrl?.trim() || null,
          unitPrice: dto.unitPrice,
          currency: (dto.currency || 'MXN').trim().toUpperCase(),
          stockOnHand: dto.stockOnHand,
          availableToResellers: dto.availableToResellers ?? true,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          description: true,
          category: true,
          imageUrl: true,
          unitPrice: true,
          currency: true,
          stockOnHand: true,
          reservedQuantity: true,
        },
      });

      return this.toCatalogItem(product);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'Ya existe un producto con ese SKU para esta organización',
        );
      }
      throw error;
    }
  }

  private toCatalogItem(product: {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    category: string | null;
    imageUrl: string | null;
    unitPrice: { toString(): string } | number;
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
      unitPrice: Number(product.unitPrice),
      currency: product.currency,
      availableQuantity: Math.max(0, product.stockOnHand - product.reservedQuantity),
    };
  }
}
