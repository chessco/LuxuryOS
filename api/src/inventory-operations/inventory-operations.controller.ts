import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InventoryOperationsService } from './inventory-operations.service';
@Controller('inventory-operations') @UseGuards(JwtAuthGuard)
export class InventoryOperationsController {
  constructor(private readonly service: InventoryOperationsService) {}
  @Get('suppliers') suppliers(@Request() req: any) { return this.service.suppliers(req.user); }
  @Post('suppliers') supplier(@Request() req: any, @Body() body: any) { return this.service.createSupplier(req.user, body); }
  @Post('entries') entry(@Request() req: any, @Body() body: any) { return this.service.createEntry(req.user, body); }
}
