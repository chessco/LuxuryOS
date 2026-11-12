import { Body, Controller, Get, Headers, Post, Request, UseGuards } from '@nestjs/common';
import { Role, SalesChannel } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CommerceService } from './commerce.service';

@Controller('commerce')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENDEDOR, Role.TENANT_ADMIN, Role.SYSTEM_ADMIN)
export class InternalPosController {
  constructor(private readonly commerce: CommerceService) {}
  @Get('catalog') catalog(@Request() req: any) { return this.commerce.catalog(req.user, SalesChannel.JEWELRY_INTERNAL); }
  @Post('sales') checkout(@Request() req: any, @Body() body: any, @Headers('idempotency-key') key?: string) { return this.commerce.checkout(req.user, SalesChannel.JEWELRY_INTERNAL, body, key); }
}
