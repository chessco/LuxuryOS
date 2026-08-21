import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStage, OrderStatus, Prisma } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';

import { OrderStrategyFactory } from './strategies/order-strategy.factory';

@Injectable()
export class OrdersService {
    constructor(
        private prisma: PrismaService,
        private strategyFactory: OrderStrategyFactory,
    ) { }

    async getBoard(tenantId: string, type?: string) {
        const query: any = { tenantId };
        if (type) {
            query.type = type;
        } else {
            query.type = 'STANDARD';
        }

        const orders = await this.prisma.order.findMany({
            where: query,
            include: { client: true },
        });

        // Determine grouping keys based on type
        let groupingEnum: any;
        let groupingField: 'stage' | 'status';

        if (type === 'REPAIR' || type === 'MANUFACTURE' || type === 'LAYAWAY') {
            groupingEnum = OrderStatus;
            groupingField = 'status';
        } else {
            groupingEnum = OrderStage;
            groupingField = 'stage';
        }

        const columns = Object.values(groupingEnum).reduce((acc: any, key: any) => {
            acc[key] = orders.filter((o: any) => o[groupingField] === key);
            return acc;
        }, {});

        return columns;
    }

    async moveOrder(id: string, tenantId: string, toStage: any) {
        const order = await this.prisma.order.findUnique({
            where: { id },
        });

        if (!order) throw new NotFoundException('Pedido no encontrado');
        if (order.tenantId !== tenantId) throw new ForbiddenException('No tienes permiso para mover este pedido');

        const updateData: any = {};
        if (order.type === 'REPAIR' || order.type === 'MANUFACTURE' || order.type === 'LAYAWAY') {
            updateData.status = toStage;
        } else {
            updateData.stage = toStage;
        }

        return this.prisma.order.update({
            where: { id },
            data: updateData,
        });
    }

    async createOrder(tenantId: string, data: CreateOrderDto) {
        const totalAmount = data.totalAmount ?? data.value ?? 0;
        const paidAmount = 0;
        const balance = totalAmount;
        const margin = (data.value || 0) - (data.cost || 0);

        // Determine initial status from strategy if not provided
        let status = data.status;
        if (!status && data.type) {
            const strategy = this.strategyFactory.getStrategy(data.type);
            if (strategy) {
                status = strategy.getInitialStatus();
            }
        }

        return this.prisma.order.create({
            data: {
                ...data,
                tenantId,
                totalAmount,
                paidAmount,
                balance,
                margin,
                status: status ?? undefined, // Let Prisma default to DRAFT if undefined
            },
            include: {
                client: true,
                queueTicket: true,
            }
        });
    }

    async getOrders(tenantId: string) {
        const orders = await this.prisma.order.findMany({
            where: { tenantId },
            include: { 
                client: true,
                queueTicket: true
            },
        });

        // Sort in memory to avoid "Out of sort memory" errors in limited MySQL environments
        return orders.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
    }

    async getOrder(tenantId: string, id: string) {
        return this.prisma.order.findUnique({
            where: { id, tenantId },
            include: { 
                client: true, 
                payments: true,
                queueTicket: true
            },
        });
    }

    async advanceStatus(tenantId: string, id: string) {
        const order = await this.getOrder(tenantId, id);
        if (!order) throw new NotFoundException('Order not found');

        const strategy = this.strategyFactory.getStrategy(order.type);

        // Specialized logic for Standard (OrderStage) vs others (OrderStatus)
        if (order.type === 'STANDARD') {
            const nextStage = (strategy as any).getNextStage(order.stage);
            if (nextStage) {
                return this.prisma.order.update({
                    where: { id },
                    data: { stage: nextStage }
                });
            }
        } else {
            const nextStatus = strategy.getNextStatus(order.status);
            if (nextStatus) {
                return this.prisma.order.update({
                    where: { id },
                    data: { status: nextStatus }
                });
            }
        }
        return order; // No transition possible
    }

    async updateOrder(tenantId: string, id: string, data: any) {
        const order = await this.getOrder(tenantId, id);
        if (!order) throw new NotFoundException('Order not found');

        const {
            pieceType, value, cost, priority, notes, dueDate,
            metal, color, karats, weight, size, thickness, itemCode,
            laborCost, materialCost, specifications, clientId, status, imageUrl
        } = data;

        // Recalculate totalAmount and balance if financial fields are changing
        const currentLabor = order.laborCost ? Number(order.laborCost) : 0;
        const currentMaterial = order.materialCost ? Number(order.materialCost) : 0;
        const currentValue = order.value ? Number(order.value) : 0;

        const updatedLabor = laborCost !== undefined ? Number(laborCost) : currentLabor;
        const updatedMaterial = materialCost !== undefined ? Number(materialCost) : currentMaterial;
        const updatedValue = value !== undefined ? Number(value) : currentValue;

        let totalAmount: Prisma.Decimal;

        // Priority: 1. Explicit labor+material, 2. Explicit value, 3. Existing totalAmount (if not zero), 4. Existing value
        if (laborCost !== undefined || materialCost !== undefined) {
            totalAmount = new Prisma.Decimal(updatedLabor + updatedMaterial);
        } else if (value !== undefined) {
            totalAmount = new Prisma.Decimal(updatedValue);
        } else {
            const currentTotal = order.totalAmount ? new Prisma.Decimal(order.totalAmount) : new Prisma.Decimal(0);
            if (currentTotal.isZero() && currentValue > 0) {
                totalAmount = new Prisma.Decimal(currentValue);
            } else {
                totalAmount = currentTotal;
            }
        }

        const paidAmount = order.paidAmount ? new Prisma.Decimal(order.paidAmount) : new Prisma.Decimal(0);
        const balance = totalAmount.sub(paidAmount);

        return this.prisma.order.update({
            where: { id },
            data: {
                pieceType,
                value: updatedValue,
                cost: cost !== undefined ? Number(cost) : undefined,
                priority,
                notes,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                metal,
                color,
                karats,
                weight,
                size,
                thickness,
                itemCode,
                laborCost: updatedLabor,
                materialCost: updatedMaterial,
                totalAmount,
                balance,
                specifications,
                clientId,
                status,
                imageUrl
            }
        });
    }

    async generateAIImage(tenantId: string, id: string) {
        const order = await this.getOrder(tenantId, id);
        if (!order) throw new NotFoundException('Order not found');

        // Simulamos la generación con IA. En un caso real llamaríamos a OpenAI/DALL-E.
        // Por ahora usaremos una imagen de placeholder representativa de joyería
        const prompt = `Lujosa pieza de joyería: ${order.pieceType}, metal ${order.metal || 'oro'}, color ${order.color || 'natural'}. Estilo premium, fondo oscuro, iluminación cinematográfica.`;

        // Mock URL de una imagen generada (usaremos Unsplash para el demo)
        const mockImageUrl = `https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=2070&auto=format&fit=crop`;

        return this.prisma.order.update({
            where: { id },
            data: { imageUrl: mockImageUrl }
        });
    }
}
