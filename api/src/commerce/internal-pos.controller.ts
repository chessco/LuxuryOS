import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CommerceProductStatus, CommerceSaleStatus, InventoryMovementType, Role, SalesChannel } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CommerceService } from './commerce.service';
import { CreateProductDto, RecordProductMovementDto, UpdateProductDto } from './dto/commerce-product.dto';
import { CancelSaleDto, CreateSaleDto, SettleSaleDto } from './dto/commerce-sale.dto';

@Controller('commerce')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENDEDOR, Role.TENANT_ADMIN, Role.SYSTEM_ADMIN)
export class InternalPosController {
  constructor(private readonly commerce: CommerceService) {}
  @Get('catalog') catalog(@Request() req: any) { return this.commerce.catalog(req.user, SalesChannel.JEWELRY_INTERNAL); }
  @Get('products') @Roles(Role.TENANT_ADMIN, Role.SYSTEM_ADMIN) listProducts(@Request() req: any, @Query('status') status?: CommerceProductStatus) { return this.commerce.listProducts(req.user, status); }
  @Get('products/:id') @Roles(Role.TENANT_ADMIN, Role.SYSTEM_ADMIN) getProduct(@Request() req: any, @Param('id') id: string) { return this.commerce.getProduct(req.user, id); }
  @Get('products/:id/kardex') @Roles(Role.TENANT_ADMIN, Role.SYSTEM_ADMIN) getProductKardex(@Request() req: any, @Param('id') id: string, @Query('type') type?: InventoryMovementType) { return this.commerce.getProductKardex(req.user, id, type); }
  @Post('products/:id/movements') @Roles(Role.TENANT_ADMIN, Role.SYSTEM_ADMIN) recordProductMovement(@Request() req: any, @Param('id') id: string, @Body() body: RecordProductMovementDto) { return this.commerce.recordProductMovement(req.user, id, body); }
  @Post('products') @Roles(Role.TENANT_ADMIN, Role.SYSTEM_ADMIN) createProduct(@Request() req: any, @Body() body: CreateProductDto) { return this.commerce.createProduct(req.user, body); }
  @Patch('products/:id') @Roles(Role.TENANT_ADMIN, Role.SYSTEM_ADMIN) updateProduct(@Request() req: any, @Param('id') id: string, @Body() body: UpdateProductDto) { return this.commerce.updateProduct(req.user, id, body); }
  @Delete('products/:id') @Roles(Role.TENANT_ADMIN, Role.SYSTEM_ADMIN) deleteProduct(@Request() req: any, @Param('id') id: string) { return this.commerce.deleteProduct(req.user, id); }
  @Get('sales') listSales(@Request() req: any, @Query('channel') channel?: SalesChannel, @Query('status') status?: CommerceSaleStatus, @Query('q') q?: string) { return this.commerce.listSales(req.user, { channel, status, q }); }
  @Get('sales/:id') getSale(@Request() req: any, @Param('id') id: string) { return this.commerce.getSale(req.user, id); }
  @Post('sales') checkout(@Request() req: any, @Body() body: CreateSaleDto, @Headers('idempotency-key') key?: string) { return this.commerce.checkout(req.user, SalesChannel.JEWELRY_INTERNAL, body, key); }
  @Post('sales/:id/settle') settleSale(@Request() req: any, @Param('id') id: string, @Body() body: SettleSaleDto, @Headers('idempotency-key') key?: string) { return this.commerce.settleSale(req.user, id, body, key); }
  @Post('sales/:id/cancel') @Roles(Role.TENANT_ADMIN, Role.SYSTEM_ADMIN) cancelSale(@Request() req: any, @Param('id') id: string, @Body() body: CancelSaleDto) { return this.commerce.cancelSale(req.user, id, body); }
}
