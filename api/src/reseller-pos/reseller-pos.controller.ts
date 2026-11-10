import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ResellerPosService } from './reseller-pos.service';
import { CreateCommerceProductDto } from './dto/create-commerce-product.dto';

@Controller('reseller')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.REVENDEDOR, Role.TENANT_ADMIN)
export class ResellerPosController {
  constructor(private readonly resellerPosService: ResellerPosService) {}

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

  @Post('catalog')
  @Roles(Role.TENANT_ADMIN)
  createCatalogProduct(
    @Body() body: CreateCommerceProductDto,
    @Request() req: { user: { tenantId: string } },
  ) {
    return this.resellerPosService.createCatalogProduct(req.user.tenantId, body);
  }
}
