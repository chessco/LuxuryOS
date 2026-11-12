import { Body, Controller, Get, Headers, Optional, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CommerceSaleStatus, Role, SalesChannel } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ResellerPosService } from './reseller-pos.service';
import { CreateCommerceProductDto } from './dto/create-commerce-product.dto';
import { CommerceService } from '../commerce/commerce.service';
import { CancelSaleDto, CreateSaleDto } from '../commerce/dto/commerce-sale.dto';

@Controller('reseller')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.REVENDEDOR, Role.TENANT_ADMIN)
export class ResellerPosController {
  constructor(
    private readonly resellerPosService: ResellerPosService,
    @Optional() private readonly commerceService?: CommerceService,
  ) {}

  @Get('profile')
  getProfile(
    @Request()
    req: {
      user: {
        id: string;
        name?: string | null;
        tenantId: string;
        role: 'REVENDEDOR' | 'TENANT_ADMIN' | 'SYSTEM_ADMIN';
      };
    },
  ) {
    return this.resellerPosService.getProfile(req.user);
  }

  @Get('catalog')
  getCatalog(@Request() req: { user: { tenantId: string } }) {
    return this.resellerPosService.getCatalog(req.user.tenantId);
  }

  @Get('inventory')
  getInventory(@Request() req: { user: { tenantId: string } }) {
    return this.resellerPosService.getInventory(req.user.tenantId);
  }

  @Post('catalog')
  @Roles(Role.TENANT_ADMIN)
  createCatalogProduct(
    @Body() body: CreateCommerceProductDto,
    @Request() req: { user: { tenantId: string } },
  ) {
    return this.resellerPosService.createCatalogProduct(req.user.tenantId, body);
  }

  @Get('sales')
  listSales(
    @Request() req: { user: { id: string; tenantId: string; role: Role } },
    @Query('status') status?: CommerceSaleStatus,
    @Query('q') q?: string,
  ) {
    if (!this.commerceService) {
      throw new Error('Commerce service not initialized');
    }
    return this.commerceService.listSales(req.user, {
      channel: SalesChannel.RESELLER_POS,
      status,
      q,
      scopeToReseller: true,
    });
  }

  @Get('sales/:id')
  getSale(
    @Param('id') id: string,
    @Request() req: { user: { id: string; tenantId: string; role: Role } },
  ) {
    if (!this.commerceService) {
      throw new Error('Commerce service not initialized');
    }
    return this.commerceService.getSale(req.user, id, true);
  }

  @Post('sales')
  checkout(
    @Body() body: CreateSaleDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Request() req: { user: { id: string; tenantId: string; role: Role } },
  ) {
    if (!this.commerceService) {
      throw new Error('Commerce service not initialized');
    }
    return this.commerceService.checkout(req.user, SalesChannel.RESELLER_POS, body, idempotencyKey);
  }

  @Post('sales/:id/cancel')
  cancelSale(
    @Param('id') id: string,
    @Body() body: CancelSaleDto,
    @Request() req: { user: { id: string; tenantId: string; role: Role } },
  ) {
    if (!this.commerceService) {
      throw new Error('Commerce service not initialized');
    }
    return this.commerceService.cancelSale(req.user, id, body, true);
  }
}
