import {
    Controller,
    Get,
    Patch,
    Post,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrderStage } from '@prisma/client';

@Controller('kanban')
@UseGuards(JwtAuthGuard)
export class OrdersController {
    constructor(private ordersService: OrdersService) { }

    @Get('board')
    async getBoard(@Request() req) {
        return this.ordersService.getBoard(req.user.tenantId);
    }

    @Patch('order/:id/move')
    async moveOrder(
        @Param('id') id: string,
        @Body('toStage') toStage: OrderStage,
        @Request() req,
    ) {
        return this.ordersService.moveOrder(id, req.user.tenantId, toStage);
    }

    @Post('orders')
    async createOrder(@Body() body: any, @Request() req) {
        return this.ordersService.createOrder(req.user.tenantId, body);
    }

    @Get('orders')
    async getOrders(@Request() req) {
        return this.ordersService.getOrders(req.user.tenantId);
    }
}
