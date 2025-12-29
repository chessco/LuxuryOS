import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStage } from '@prisma/client';

@Injectable()
export class OrdersService {
    constructor(private prisma: PrismaService) { }

    async getBoard(tenantId: string) {
        const orders = await this.prisma.order.findMany({
            where: { tenantId },
            include: { client: true },
        });

        // Grouping logic for the board
        const columns = Object.values(OrderStage).reduce((acc: any, stage) => {
            acc[stage] = orders.filter((o) => o.stage === stage);
            return acc;
        }, {});

        return columns;
    }

    async moveOrder(id: string, tenantId: string, toStage: OrderStage) {
        const order = await this.prisma.order.findUnique({
            where: { id },
        });

        if (!order) throw new NotFoundException('Pedido no encontrado');
        if (order.tenantId !== tenantId) throw new ForbiddenException('No tienes permiso para mover este pedido');

        return this.prisma.order.update({
            where: { id },
            data: { stage: toStage },
        });
    }

    async createOrder(tenantId: string, data: any) {
        return this.prisma.order.create({
            data: {
                ...data,
                tenantId,
            },
        });
    }

    async getOrders(tenantId: string) {
        return this.prisma.order.findMany({
            where: { tenantId },
            include: { client: true },
            orderBy: { createdAt: 'desc' },
        });
    }
}
