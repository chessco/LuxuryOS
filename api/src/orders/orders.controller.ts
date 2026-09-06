import {
    Controller,
    Get,
    Patch,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
    Query,
    ForbiddenException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrderStage } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('kanban')
@UseGuards(JwtAuthGuard)
export class OrdersController {
    constructor(private ordersService: OrdersService) { }

    @Get('board')
    async getBoard(@Request() req, @Query('type') type?: string) {
        console.log(`[OrdersController] Fetching board for tenant: ${req.user.tenantId}, type: ${type}`);
        const result = await this.ordersService.getBoard(req.user.tenantId, type);
        const count = Object.values(result as any).flat().length;
        console.log(`[OrdersController] Found ${count} orders for tenant ${req.user.tenantId}`);
        return result;
    }

    @Patch('order/:id/move')
    async moveOrder(
        @Param('id') id: string,
        @Body('toStage') toStage: any,
        @Request() req,
    ) {
        return this.ordersService.moveOrder(id, req.user.tenantId, toStage);
    }

    @Post('orders')
    async createOrder(@Body() body: CreateOrderDto, @Request() req) {
        const userId = req.user.id || req.user.userId;
        return this.ordersService.createOrder(req.user.tenantId, body, userId);
    }

    @Get('orders/:id')
    async getOrder(@Param('id') id: string, @Request() req) {
        return this.ordersService.getOrder(req.user.tenantId, id);
    }

    @Patch('orders/:id/advance')
    async advanceStatus(@Param('id') id: string, @Request() req) {
        return this.ordersService.advanceStatus(req.user.tenantId, id);
    }

    @Patch('orders/:id')
    async updateOrder(@Param('id') id: string, @Body() body: any, @Request() req) {
        return this.ordersService.updateOrder(req.user.tenantId, id, body);
    }

    @Get('orders')
    async getOrders(@Request() req) {
        return this.ordersService.getOrders(req.user.tenantId);
    }

    @Post('orders/:id/generate-image')
    async generateAIImage(@Param('id') id: string, @Request() req) {
        return this.ordersService.generateAIImage(req.user.tenantId, id);
    }

    @Delete('orders/:id')
    async deleteOrder(@Param('id') id: string, @Request() req) {
        if (req.user.role !== 'SYSTEM_ADMIN') {
            throw new ForbiddenException('Solo el rol SYSTEM_ADMIN puede eliminar pedidos');
        }
        return this.ordersService.deleteOrder(req.user.tenantId, id);
    }

    @Post('orders/:id/send-whatsapp')
    async sendOrderWhatsApp(@Param('id') id: string, @Request() req) {
        return this.ordersService.sendOrderWhatsApp(req.user.tenantId, id);
    }
}
