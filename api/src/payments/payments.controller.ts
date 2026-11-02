import { Controller, Post, Get, Patch, Body, UseGuards, Request, Delete, Param, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { isJoyeroRole, isDesignerRole } from '../common/roles.util';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(private paymentsService: PaymentsService) { }

    @Get('order/:orderId')
    async getPaymentsByOrder(@Param('orderId') orderId: string, @Request() req) {
        const tenantId = req.user?.tenantId;
        return this.paymentsService.getPaymentsByOrder(orderId, tenantId);
    }

    @Post()
    async recordPayment(
        @Body() body: { orderId: string; amount: number; method: string; reference?: string; autoDeliver?: boolean },
        @Request() req
    ) {
        const user = req.user;
        if (isJoyeroRole(user?.role, user?.email, user?.name)) {
            throw new ForbiddenException('El rol Joyero no tiene permisos para registrar anticipos o pagos');
        }
        if (isDesignerRole(user?.role, user?.email, user?.name)) {
            throw new ForbiddenException('El rol Diseñador no tiene permisos para registrar anticipos o pagos');
        }

        const userId = req.user?.id || req.user?.userId || req.user?.sub;
        const tenantId = req.user?.tenantId;
        return this.paymentsService.recordPayment(
            body.orderId,
            body.amount,
            body.method,
            body.reference,
            userId,
            tenantId,
            body.autoDeliver
        );
    }

    @Patch(':id')
    async updatePayment(
        @Param('id') id: string,
        @Body() body: { amount?: number; method?: string; reference?: string },
        @Request() req
    ) {
        const user = req.user;
        if (isJoyeroRole(user?.role, user?.email, user?.name)) {
            throw new ForbiddenException('El rol Joyero no tiene permisos para modificar anticipos o pagos');
        }
        if (isDesignerRole(user?.role, user?.email, user?.name)) {
            throw new ForbiddenException('El rol Diseñador no tiene permisos para modificar anticipos o pagos');
        }

        const userId = req.user?.id || req.user?.userId || req.user?.sub;
        const tenantId = req.user?.tenantId;
        return this.paymentsService.updatePayment(id, body, tenantId, userId);
    }

    @Delete(':id')
    async deletePayment(@Param('id') id: string, @Request() req) {
        const user = req.user;
        if (isJoyeroRole(user?.role, user?.email, user?.name)) {
            throw new ForbiddenException('El rol Joyero no tiene permisos para eliminar anticipos o pagos');
        }
        if (isDesignerRole(user?.role, user?.email, user?.name)) {
            throw new ForbiddenException('El rol Diseñador no tiene permisos para eliminar anticipos o pagos');
        }

        const tenantId = req.user?.tenantId;
        return this.paymentsService.deletePayment(id, tenantId);
    }
}
