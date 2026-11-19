import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CommerceSaleStatus, Role, SalesChannel } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ResellerPosService } from './reseller-pos.service';
import { CommerceService } from '../commerce/commerce.service';
import { CreateProductDto } from '../commerce/dto/commerce-product.dto';
import { CancelSaleDto, CreateSaleDto } from '../commerce/dto/commerce-sale.dto';
import { ResellerQuoteDto } from './dto/reseller-quote.dto';

@Controller('reseller')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.REVENDEDOR, Role.TENANT_ADMIN, Role.SYSTEM_ADMIN)
export class ResellerPosController {
  constructor(
    private readonly resellerPosService: ResellerPosService,
    private readonly commerceService: CommerceService,
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

  @Get('credit')
  getCredit(@Request() req: { user: { id: string; tenantId: string; role: Role } }) {
    return this.commerceService.getResellerCredit(req.user);
  }

  @Post('quotes')
  @HttpCode(HttpStatus.OK)
  calculateQuote(@Body() body: ResellerQuoteDto, @Request() req: { user: { tenantId: string } }) {
    return this.resellerPosService.calculateQuote(req.user.tenantId, body.items);
  }

  @Get('commissions')
  getCommissions(
    @Request() req: { user: { id: string; tenantId: string; role: Role } },
    @Query() query: { resellerId?: string; status?: string; currency?: string; from?: string; to?: string; page?: string; limit?: string },
  ) {
    return this.resellerPosService.listCommissions(req.user, query);
  }

  @Post('catalog')
  @Roles(Role.TENANT_ADMIN, Role.SYSTEM_ADMIN)
  createCatalogProduct(
    @Body() body: CreateProductDto,
    @Request() req: { user: { id: string; tenantId: string; role: Role } },
  ) {
    return this.commerceService.createProduct(req.user, body);
  }

  @Get('sales')
  listSales(
    @Request() req: { user: { id: string; tenantId: string; role: Role } },
    @Query('status') status?: CommerceSaleStatus,
    @Query('q') q?: string,
  ) {
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
    return this.commerceService.getSale(req.user, id, true);
  }

  @Post('sales')
  checkout(
    @Body() body: CreateSaleDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Request() req: { user: { id: string; tenantId: string; role: Role } },
  ) {
    return this.commerceService.checkout(req.user, SalesChannel.RESELLER_POS, body, idempotencyKey);
  }

  @Post('sales/:id/cancel')
  cancelSale(
    @Param('id') id: string,
    @Body() body: CancelSaleDto,
    @Request() req: { user: { id: string; tenantId: string; role: Role } },
  ) {
    return this.commerceService.cancelSale(req.user, id, body, true);
  }
}
