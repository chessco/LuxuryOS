import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreditService } from '../commerce/credit.service';

export const REVOLVING_CREDIT_PAYMENT_METHOD = 'REVOLVING_CREDIT';

@Injectable()
export class PaymentsService {
    constructor(
        private prisma: PrismaService,
        private credit: CreditService,
    ) { }

    async recordPayment(
        orderId: string,
        amount: number,
        method: string,
        reference?: string,
        userId?: string,
        tenantId?: string,
        autoDeliver?: boolean,
    ) {
        if (amount <= 0) throw new BadRequestException('El monto debe ser positivo');

        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findFirst({
                where: {
                    id: orderId,
                    ...(tenantId ? { tenantId } : {}),
                },
                include: {
                    client: {
                        select: { type: true, resellerUserId: true },
                    },
                },
            });
            if (!order) throw new BadRequestException('Orden no encontrada');

            const normalizedMethod = String(method || '').trim().toUpperCase();
            if (normalizedMethod === REVOLVING_CREDIT_PAYMENT_METHOD) {
                if (order.client.type !== 'RESELLER' || !order.client.resellerUserId) {
                    throw new BadRequestException('El crédito revolvente sólo está disponible para órdenes de un revendedor vinculado');
                }
                if (new Prisma.Decimal(amount).gt(order.balance.add(new Prisma.Decimal(0.01)))) {
                    throw new BadRequestException('El crédito revolvente no puede exceder el saldo pendiente de la orden');
                }
                const orderCode = String((order.specifications as any)?.orderCode || order.id);
                await this.credit.applyOrderRevolvingCreditInTx(tx, {
                    tenantId: order.tenantId,
                    actorId: userId,
                    orderId: order.id,
                    orderCode,
                    resellerId: order.client.resellerUserId,
                    currency: 'MXN',
                    amount,
                    reference,
                });
            }

            // Crear registro de pago
            const payment = await tx.payment.create({
                data: {
                    orderId,
                    amount: new Prisma.Decimal(amount),
                    method: normalizedMethod || method,
                    reference,
                    recordedBy: userId,
                },
            });

            // Recalcular balance
            const newPaidAmount = order.paidAmount.add(new Prisma.Decimal(amount));
            const newBalance = order.totalAmount.sub(newPaidAmount);

            const currentStatus = String(order.status || '').toUpperCase();
            const currentStage = String(order.stage || '').toUpperCase();

            // Identificar si la orden ya está lista/terminada para entrega o si es venta estándar
            const isReadyForDelivery =
                currentStatus === 'REPAIR_COMPLETED' ||
                currentStatus === 'READY_FOR_PICKUP' ||
                currentStatus === 'READY' ||
                currentStatus === 'LISTO' ||
                currentStatus === 'TERMINADO' ||
                currentStage === 'LISTO_ENTREGA' ||
                order.type === 'STANDARD';

            // Regla de Negocio: Al cobrar una pieza lista o cuando se indica entrega,
            // pasa en automático a ENTREGADO sin requerir un doble paso.
            const shouldDeliver = (isReadyForDelivery || autoDeliver === true) && !order.deliveredAt;

            const now = new Date();
            const specs = (order.specifications as any) || {};

            let updateData: any = {
                paidAmount: newPaidAmount,
                balance: newBalance,
                paymentStatus: newBalance.lte(0.01) ? 'PAGADO' : 'PARCIAL',
            };

            if (shouldDeliver) {
                let userName = 'Mostrador';
                let userRole = 'VENDEDOR';
                let userEmail: string | undefined = undefined;

                if (userId) {
                    try {
                        const u = await (tx as any).user?.findUnique?.({
                            where: { id: userId },
                            select: { name: true, email: true, role: true },
                        });
                        if (u) {
                            userName = u.name || u.email || userName;
                            userRole = u.role || userRole;
                            userEmail = u.email;
                        }
                    } catch {
                        // ignore and use fallback
                    }
                }

                updateData.deliveredAt = now;
                updateData.status = 'DELIVERED';
                if (order.type === 'STANDARD') {
                    updateData.stage = 'ENTREGADO_POSTVENTA';
                }

                updateData.specifications = {
                    ...specs,
                    deliveredByName: userName,
                    deliveredBy: {
                        id: userId,
                        name: userName,
                        email: userEmail,
                        role: userRole,
                        at: now,
                    },
                    deliveryConfirmed: true,
                    deliveryMethod: 'COBRO_AUTOMATICO',
                };
            }

            // Actualizar Orden
            const updatedOrder = await tx.order.update({
                where: { id: orderId },
                data: updateData,
            });

            return { payment, updatedOrder };
        });
    }

    async getPaymentsByOrder(orderId: string, tenantId?: string) {
        if (tenantId) {
            const order = await this.prisma.order.findFirst({
                where: { id: orderId, tenantId, deletedAt: null },
            });
            if (!order) throw new BadRequestException('Orden no encontrada');
        }

        return this.prisma.payment.findMany({
            where: { orderId },
            orderBy: { recordedAt: 'desc' },
        });
    }

    async updatePayment(
        paymentId: string,
        data: { amount?: number; method?: string; reference?: string },
        tenantId?: string,
        userId?: string
    ) {
        if (data.amount !== undefined && data.amount <= 0) {
            throw new BadRequestException('El monto debe ser positivo');
        }

        return this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findUnique({
                where: { id: paymentId },
                include: { order: true },
            });

            if (!payment) throw new BadRequestException('Pago no encontrado');

            if (tenantId && payment.order.tenantId !== tenantId) {
                throw new BadRequestException('No autorizado para modificar este pago');
            }

            const order = payment.order;
            if (payment.method === REVOLVING_CREDIT_PAYMENT_METHOD || data.method === REVOLVING_CREDIT_PAYMENT_METHOD) {
                throw new BadRequestException('Un pago con crédito revolvente es inmutable; registra un ajuste crediticio en Caja Cared');
            }
            const oldAmount = payment.amount;
            const newAmount = data.amount !== undefined ? new Prisma.Decimal(data.amount) : oldAmount;
            const diff = newAmount.sub(oldAmount);

            const updatedPayment = await tx.payment.update({
                where: { id: paymentId },
                data: {
                    amount: newAmount,
                    method: data.method !== undefined ? data.method : payment.method,
                    reference: data.reference !== undefined ? data.reference : payment.reference,
                    recordedBy: userId || payment.recordedBy,
                },
            });

            // Recalcular saldo de la orden
            const newPaidAmount = order.paidAmount.add(diff);
            const newBalance = order.totalAmount.sub(newPaidAmount);

            const updatedOrder = await tx.order.update({
                where: { id: order.id },
                data: {
                    paidAmount: newPaidAmount,
                    balance: newBalance,
                    paymentStatus: newPaidAmount.lte(0) ? 'PENDIENTE' : newBalance.lte(0) ? 'PAGADO' : 'PARCIAL',
                },
            });

            return { payment: updatedPayment, updatedOrder };
        });
    }

    async deletePayment(paymentId: string, tenantId?: string) {
        return this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findUnique({
                where: { id: paymentId },
                include: { order: true }
            });

            if (!payment) throw new BadRequestException('Pago no encontrado');

            if (tenantId && payment.order.tenantId !== tenantId) {
                throw new BadRequestException('No autorizado para eliminar este pago');
            }

            const order = payment.order;
            if (payment.method === REVOLVING_CREDIT_PAYMENT_METHOD) {
                throw new BadRequestException('Un pago con crédito revolvente no se elimina; registra un ajuste crediticio en Caja Cared');
            }

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
