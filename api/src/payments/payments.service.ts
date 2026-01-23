import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
    constructor(private prisma: PrismaService) { }

    async recordPayment(orderId: string, amount: number, method: string, reference?: string, userId?: string) {
        if (amount <= 0) throw new BadRequestException('El monto debe ser positivo');

        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({ where: { id: orderId } });
            if (!order) throw new BadRequestException('Orden no encontrada');

            // Crear registro de pago
            const payment = await tx.payment.create({
                data: {
                    orderId,
                    amount: new Prisma.Decimal(amount),
                    method,
                    reference,
                    recordedBy: userId,
                },
            });

            // Recalcular balance
            const newPaidAmount = order.paidAmount.add(new Prisma.Decimal(amount));
            const newBalance = order.totalAmount.sub(newPaidAmount);

            // Validar sobrepago (opcional, pero buena práctica)
            if (newBalance.lt(0)) {
                // throw new BadRequestException('El pago excede el saldo pendiente');
                // O permitirlo como saldo a favor
            }

            // Actualizar Orden
            const updatedOrder = await tx.order.update({
                where: { id: orderId },
                data: {
                    paidAmount: newPaidAmount,
                    balance: newBalance,
                    paymentStatus: newBalance.lte(0) ? 'PAGADO' : 'PARCIAL',
                },
            });

            return { payment, updatedOrder };
        });
    }

    async getPaymentsByOrder(orderId: string) {
        return this.prisma.payment.findMany({
            where: { orderId },
            orderBy: { recordedAt: 'desc' },
        });
    }

    async deletePayment(paymentId: string) {
        return this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findUnique({
                where: { id: paymentId },
                include: { order: true }
            });

            if (!payment) throw new BadRequestException('Pago no encontrado');

            const order = payment.order;

            // Recalcular balance restando el monto del pago eliminado
            const newPaidAmount = order.paidAmount.sub(payment.amount);
            const newBalance = order.totalAmount.sub(newPaidAmount);

            // Actualizar Orden
            await tx.order.update({
                where: { id: order.id },
                data: {
                    paidAmount: newPaidAmount,
                    balance: newBalance,
                    paymentStatus: newPaidAmount.lte(0) ? 'PENDIENTE' : newBalance.lte(0) ? 'PAGADO' : 'PARCIAL',
                },
            });

            // Eliminar el pago
            return tx.payment.delete({
                where: { id: paymentId },
            });
        });
    }
}
