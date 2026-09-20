import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    Req,
    Query,
    BadRequestException,
} from '@nestjs/common';
import { QueueService } from './queue.service';
import { CreateQueueTicketDto } from './dto/create-queue-ticket.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QueueGateway } from './queue.gateway';
import { QueueTicketStatus, QueueTicketKind } from '@prisma/client';

@Controller('queue')
export class QueueController {
    constructor(
        private readonly queueService: QueueService,
        private readonly queueGateway: QueueGateway,
    ) { }

    private async resolveTenantId(req: any): Promise<string> {
        const headerTenant = req.headers['x-tenant-id'];
        if (headerTenant && typeof headerTenant === 'string') {
            const exists = await this.queueService.checkTenantExists(headerTenant);
            if (exists) return headerTenant;
        }
        return this.queueService.getDefaultTenantId();
    }

    @Post('tickets')
    async create(@Body() data: CreateQueueTicketDto, @Req() req: any) {
        try {
            const tenantId = await this.resolveTenantId(req);
            const ticket = await this.queueService.createTicket(tenantId, data);
            
            try {
                if (this.queueGateway && this.queueGateway.notifyUpdate) {
                    this.queueGateway.notifyUpdate(tenantId);
                }
            } catch (gwError) {
                console.error('[QueueController] Gateway notification failed:', gwError);
            }

            return ticket;
        } catch (error: any) {
            console.error('[QueueController] Error creating ticket:', error);
            const message = error.response?.message || error.message;
            throw new BadRequestException(`Error: ${message}`);
        }
    }

    @Get('tickets/public')
    async getPublic(@Req() req: any) {
        const tenantId = await this.resolveTenantId(req);
        return this.queueService.getPublicTickets(tenantId);
    }

    @Get('q/:token')
    async resolveByToken(@Param('token') token: string) {
        return this.queueService.getByToken(token);
    }

    @Get('recommendations/:kind')
    async getRecommendations(@Param('kind') kind: QueueTicketKind, @Req() req: any) {
        const tenantId = await this.resolveTenantId(req);
        return this.queueService.getRecommendations(tenantId, kind);
    }

    @UseGuards(JwtAuthGuard)
    @Get('staff')
    async getStaff(@Req() req: any) {
        const tenantId = req.user.tenantId;
        return this.queueService.getStaffTickets(tenantId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('tickets/:id/call')
    async call(@Param('id') id: string, @Req() req: any) {
        const ticket = await this.queueService.setCalling(id, req.user.tenantId, req.user.id);
        this.queueGateway.notifyUpdate(req.user.tenantId);
        return ticket;
    }

    @UseGuards(JwtAuthGuard)
    @Post('tickets/:id/in-service')
    async inService(
        @Param('id') id: string,
        @Body('createOrder') createOrder: boolean,
        @Req() req: any
    ) {
        const ticket = await this.queueService.setInService(id, req.user.tenantId, req.user.id, createOrder);
        this.queueGateway.notifyUpdate(req.user.tenantId);
        return ticket;
    }

    @UseGuards(JwtAuthGuard)
    @Post('tickets/:id/done')
    async done(@Param('id') id: string, @Req() req: any) {
        const ticket = await this.queueService.updateStatus(id, req.user.tenantId, QueueTicketStatus.DONE, req.user.id);
        this.queueGateway.notifyUpdate(req.user.tenantId);
        return ticket;
    }

    @UseGuards(JwtAuthGuard)
    @Get('pickup/search')
    async searchPickups(
        @Query('name') name: string,
        @Query('phone') phone: string,
        @Req() req: any
    ) {
        return this.queueService.searchPickups(req.user.tenantId, name, phone);
    }

    @UseGuards(JwtAuthGuard)
    @Post('tickets/:id/confirm-pickup')
    async confirmPickup(@Param('id') id: string, @Req() req: any) {
        const ticket = await this.queueService.confirmPickup(id, req.user.tenantId, req.user.id);
        this.queueGateway.notifyUpdate(req.user.tenantId);
        return ticket;
    }

    @UseGuards(JwtAuthGuard)
    @Post('tickets/:id/link-order')
    async linkOrder(
        @Param('id') id: string,
        @Body('orderId') orderId: string,
        @Req() req: any
    ) {
        const ticket = await this.queueService.linkOrder(id, req.user.tenantId, orderId);
        this.queueGateway.notifyUpdate(req.user.tenantId);
        return ticket;
    }

    @UseGuards(JwtAuthGuard)
    @Post('orders/:id/confirm-delivery')
    async confirmOrderDelivery(
        @Param('id') id: string,
        @Req() req: any
    ) {
        const result = await this.queueService.confirmOrderDelivery(req.user.tenantId, id, req.user.id);
        this.queueGateway.notifyUpdate(req.user.tenantId);
        return result;
    }
}
