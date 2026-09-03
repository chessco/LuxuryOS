import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStage, OrderStatus, Prisma } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { generateTrackToken } from './tracking.util';

import { OrderStrategyFactory } from './strategies/order-strategy.factory';
import { NotificationService } from '../queue/notification.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class OrdersService {
    constructor(
        private prisma: PrismaService,
        private strategyFactory: OrderStrategyFactory,
        private notificationService: NotificationService,
        private settingsService: SettingsService,
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

        if (toStage === 'DELIVERED' || toStage === 'ENTREGADO' || toStage === 'ENTREGADO_POSTVENTA') {
            updateData.deliveredAt = new Date();
        }

        const updated = await this.prisma.order.update({
            where: { id },
            data: updateData,
        });

        // Trigger automatic WhatsApp notification on status transition
        await this.notifyOrderWorkflowStatus(tenantId, id);
        return updated;
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

        const created = await this.prisma.order.create({
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

        return created;
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
                const updated = await this.prisma.order.update({
                    where: { id },
                    data: { 
                        stage: nextStage,
                        ...(nextStage === 'ENTREGADO_POSTVENTA' ? { deliveredAt: new Date() } : {})
                    }
                });
                await this.notifyOrderWorkflowStatus(tenantId, id);
                return updated;
            }
        } else {
            const nextStatus = strategy.getNextStatus(order.status);
            if (nextStatus) {
                const updated = await this.prisma.order.update({
                    where: { id },
                    data: { 
                        status: nextStatus,
                        ...(nextStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {})
                    }
                });
                await this.notifyOrderWorkflowStatus(tenantId, id);
                return updated;
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

        const isDelivering = (status === 'DELIVERED' || status === 'ENTREGADO' || status === 'ENTREGADO_POSTVENTA');
        const updated = await this.prisma.order.update({
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
                imageUrl,
                ...(isDelivering ? { deliveredAt: new Date() } : {})
            }
        });

        if (status && status !== order.status) {
            await this.notifyOrderWorkflowStatus(tenantId, id);
        }

        return updated;
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

    async deleteOrder(tenantId: string, id: string) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: { queueTicket: true }
        });
        if (!order) {
            throw new NotFoundException('Pedido no encontrado');
        }

        if (order.queueTicket) {
            await this.prisma.queueTicket.update({
                where: { id: order.queueTicket.id },
                data: { orderId: null }
            });
        }

        await this.prisma.payment.deleteMany({
            where: { orderId: id }
        });

        return this.prisma.order.delete({
            where: { id }
        });
    }

    async notifyOrderWorkflowStatus(tenantId: string, id: string) {
        try {
            await this.sendOrderWhatsApp(tenantId, id);
        } catch (error) {
            console.error('[Workflow WhatsApp Notification]', error);
        }
    }

    async sendOrderWhatsApp(tenantId: string, id: string) {
        const order = await this.prisma.order.findUnique({
            where: { id, tenantId },
            include: { client: true }
        });

        if (!order) {
            throw new NotFoundException('Pedido no encontrado');
        }

        const phone = order.client?.phone;
        if (!phone) {
            return { success: false, reason: 'El cliente no tiene teléfono configurado' };
        }

        const orderCode = `ORD-${order.id.substring(0, 8).toUpperCase()}`;
        const clientName = (order.client?.name || 'Cliente').toUpperCase();
        const formatDate = (date?: Date | string | null) => {
            const d = date ? new Date(date) : new Date();
            return d.toLocaleDateString('es-MX', {
                timeZone: 'America/Hermosillo',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        };

        const dateStr = formatDate(order.createdAt);

        const getConcepto = (type: string) => {
            const t = (type || '').toUpperCase();
            if (t === 'REPAIR') return 'REPARACIÓN';
            if (t === 'MANUFACTURE') return 'FABRICACIÓN';
            if (t === 'LAYAWAY') return 'APARTADO';
            return 'VENTA';
        };

        const getStatusLabel = (status: string) => {
            const s = (status || '').toUpperCase().trim();
            // Recibido
            if (['RECEIVED', 'DRAFT', 'NUEVO', 'PENDING', 'INTERES_LEAD', 'RECIBIDO'].includes(s)) return 'RECIBIDO';
            
            // En Taller / En Proceso
            if ([
                'IN_REPAIR', 'IN_PRODUCTION', 'IN_PROGRESS', 'IN_WORKSHOP', 
                'TALLER', 'PRODUCTION', 'EN_PROCESO', 'EN_PRODUCCION', 
                'CONTROL_CALIDAD', 'QUALITY_CHECK', 'DIAGNOSIS_PENDING', 
                'WAITING_PARTS', 'SPEC_PENDING', 'MATERIALS_PENDING', 'EN TALLER'
            ].includes(s)) return 'EN TALLER';
            
            // Listo / Terminado
            if ([
                'REPAIR_COMPLETED', 'READY_FOR_PICKUP', 'READY', 'COMPLETED', 
                'TERMINADO', 'LISTO', 'LISTO_ENTREGA'
            ].includes(s)) return 'LISTO';
            
            // Entregado
            if (['DELIVERED', 'ENTREGADO', 'ENTREGADO_POSTVENTA'].includes(s)) return 'ENTREGADO';
            
            // Cancelado
            if (['CANCELLED', 'CANCELADO'].includes(s)) return 'CANCELADO';

            // Cotizaciones / Aprobaciones
            if (['QUOTE_SENT', 'COTIZACION_ENVIADA'].includes(s)) return 'COTIZACIÓN';
            if (['APPROVED', 'APROBADO_ANTICIPO'].includes(s)) return 'APROBADO';
            if (['LAYAWAY_OPEN'].includes(s)) return 'APARTADO';
            if (['LAYAWAY_EXPIRED'].includes(s)) return 'VENCIDO';

            return s.replace(/_/g, ' ');
        };

        const statusLabel = getStatusLabel(order.status);
        const isReceived = statusLabel === 'RECIBIDO';
        const isReady = statusLabel === 'LISTO';
        const isDelivered = statusLabel === 'ENTREGADO';

        const trackToken = generateTrackToken(order.id);
        const trackingUrl = `https://luxuryos.pitayacode.io/track/${trackToken}`;

        let message = '';
        if (isReceived) {
            const settings = await this.prisma.setting.findMany({ where: { tenantId } });
            const map = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {} as Record<string, string>);
            const codeType = map['label_code_type'] || 'BARCODE';

            const codeImageUrl = codeType === 'QR'
                ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${orderCode}`
                : `https://bwipjs-api.metafloor.com/?bcid=code128&text=${orderCode}&scale=3`;

            message = `🔔 *CARED* 🔔

*Fecha:* ${dateStr}
*Cliente:* ${clientName}
*No. Orden:* ${orderCode}
*Concepto:* ${getConcepto(order.type)}
*Status:* ${statusLabel}

🌐 *Ver seguimiento en línea:*
${trackingUrl}

${codeImageUrl}

Gracias por su preferencia. ✨`;
        } else if (isReady) {
            const settings = await this.prisma.setting.findMany({ where: { tenantId } });
            const map = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {} as Record<string, string>);
            const codeType = map['label_code_type'] || 'BARCODE';

            const codeImageUrl = codeType === 'QR'
                ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${orderCode}`
                : `https://bwipjs-api.metafloor.com/?bcid=code128&text=${orderCode}&scale=3`;

            message = `🔔 *CARED* 🔔

*Fecha:* ${dateStr}
*Cliente:* ${clientName}
*No. Orden:* ${orderCode}
*Concepto:* ${getConcepto(order.type)}
*Status:* ${statusLabel}

${codeImageUrl}

Gracias por su preferencia. ✨`;
        } else if (isDelivered) {
            const deliveryDateStr = formatDate(order.deliveredAt);

            message = `🔔 *CARED* 🔔

*Fecha:* ${dateStr}
*Cliente:* ${clientName}
*No. Orden:* ${orderCode}
*Concepto:* ${getConcepto(order.type)}
*Status:* ${statusLabel}
*Fecha Entrega:* ${deliveryDateStr}

Gracias por su preferencia. ✨`;
        } else {
            // Intermediate/Other statuses (e.g. EN TALLER)
            message = `🔔 *CARED* 🔔

*No. Orden:* ${orderCode}
*Concepto:* ${getConcepto(order.type)}
*Status:* ${statusLabel}`;
        }

        const success = await this.notificationService.sendCustomMessage(tenantId, phone, message);
        return { success };
    }
}
