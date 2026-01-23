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
        return this.paymentsService.recordPayment(
            body.orderId,
            body.amount,
            body.method,
            body.reference,
            req.user.userId
        );
    }

    @Delete(':id')
    async deletePayment(@Param('id') id: string) {
        return this.paymentsService.deletePayment(id);
    }
}
