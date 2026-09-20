import { Controller, Post, Body, UseGuards, Request, Delete, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(private paymentsService: PaymentsService) { }

    @Post()
    async recordPayment(
        @Body() body: { orderId: string; amount: number; method: string; reference?: string },
        @Request() req
    ) {
        const userId = req.user?.id || req.user?.userId || req.user?.sub;
        const tenantId = req.user?.tenantId;
        return this.paymentsService.recordPayment(
            body.orderId,
            body.amount,
            body.method,
            body.reference,
            userId,
            tenantId
        );
    }

    @Delete(':id')
    async deletePayment(@Param('id') id: string, @Request() req) {
        const tenantId = req.user?.tenantId;
        return this.paymentsService.deletePayment(id, tenantId);
    }
}
