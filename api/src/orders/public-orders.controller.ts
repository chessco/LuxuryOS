import { Controller, Get, Post, Param, Body, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('public/orders')
export class PublicOrdersController {
    constructor(private prisma: PrismaService) { }

    private cleanOrderIdentifier(idOrCode: string): string {
        let cleanId = idOrCode.trim();
        if (cleanId.toUpperCase().startsWith('ORD-')) {
            cleanId = cleanId.substring(4).trim();
        }
        return cleanId;
    }

    @Get('track/:id/check')
    async checkOrder(@Param('id') idOrCode: string) {
        const cleanId = this.cleanOrderIdentifier(idOrCode);
        const order = await this.prisma.order.findFirst({
            where: {
                OR: [
                    { id: cleanId },
                    { id: { startsWith: cleanId.toLowerCase() } },
                    { id: { startsWith: cleanId.toUpperCase() } },
                ]
            }
        });

        if (!order) {
            throw new NotFoundException('Pedido no encontrado');
        }

        return {
            exists: true,
            orderCode: `ORD-${order.id.substring(0, 8).toUpperCase()}`
        };
    }

    @Post('track/:id/verify')
    async verifyAndTrackOrder(
        @Param('id') idOrCode: string,
        @Body('phoneDigits') phoneDigits: string
    ) {
        if (!phoneDigits || phoneDigits.trim().length < 4) {
            throw new BadRequestException('Por favor ingrese los últimos 4 dígitos de su teléfono.');
        }

        const cleanId = this.cleanOrderIdentifier(idOrCode);
        const order = await this.prisma.order.findFirst({
            where: {
                OR: [
                    { id: cleanId },
                    { id: { startsWith: cleanId.toLowerCase() } },
                    { id: { startsWith: cleanId.toUpperCase() } },
                ]
            },
            include: { client: true }
        });

        if (!order) {
            throw new NotFoundException('Pedido no encontrado');
        }

        // Clean registered phone number
        const clientPhone = (order.client?.phone || (order as any).clientPhone || '').replace(/\D/g, '');
        const enteredDigits = phoneDigits.trim().replace(/\D/g, '').slice(-4);

        if (clientPhone.length >= 4) {
            const last4Registered = clientPhone.slice(-4);
            if (last4Registered !== enteredDigits) {
                throw new BadRequestException('Los 4 dígitos ingresados no coinciden con el teléfono registrado.');
            }
        }

        const formatDate = (date?: Date | string | null) => {
            if (!date) return null;
            return new Date(date).toLocaleDateString('es-MX', {
                timeZone: 'America/Hermosillo',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        };

        const getConcepto = (type: string) => {
            const t = (type || '').toUpperCase();
            if (t === 'REPAIR') return 'REPARACIÓN';
            if (t === 'MANUFACTURE') return 'FABRICACIÓN';
            if (t === 'LAYAWAY') return 'APARTADO';
            return 'VENTA';
        };

        const getStatusLabel = (status: string) => {
            const s = (status || '').toUpperCase().trim();
            if (['RECEIVED', 'DRAFT', 'NUEVO', 'PENDING', 'INTERES_LEAD', 'RECIBIDO'].includes(s)) return 'RECIBIDO';
            if ([
                'IN_REPAIR', 'IN_PRODUCTION', 'IN_PROGRESS', 'IN_WORKSHOP',
                'TALLER', 'PRODUCTION', 'EN_PROCESO', 'EN_PRODUCCION',
                'CONTROL_CALIDAD', 'QUALITY_CHECK', 'DIAGNOSIS_PENDING',
                'WAITING_PARTS', 'SPEC_PENDING', 'MATERIALS_PENDING', 'EN TALLER'
            ].includes(s)) return 'EN TALLER';
            if ([
                'REPAIR_COMPLETED', 'READY_FOR_PICKUP', 'READY', 'COMPLETED',
                'TERMINADO', 'LISTO', 'LISTO_ENTREGA', 'PARA ENTREGA'
            ].includes(s)) return 'LISTO';
            if (['DELIVERED', 'ENTREGADO', 'ENTREGADO_POSTVENTA'].includes(s)) return 'ENTREGADO';
            if (['CANCELLED', 'CANCELADO'].includes(s)) return 'CANCELADO';
            return s.replace(/_/g, ' ');
        };

        const statusLabel = getStatusLabel(order.status || order.stage || 'RECEIVED');

        // Build 4-step workflow timeline
        const stepOrder = ['RECIBIDO', 'EN TALLER', 'LISTO', 'ENTREGADO'];
        const currentStepIndex = stepOrder.indexOf(statusLabel);

        const steps = [
            {
                id: 'RECEIVED',
                label: 'Recibido',
                description: 'Pieza recibida e ingresada al sistema en sucursal',
                icon: 'inventory_2',
                isCompleted: currentStepIndex >= 0,
                isCurrent: currentStepIndex === 0,
                date: formatDate(order.createdAt)
            },
            {
                id: 'IN_WORKSHOP',
                label: 'En Taller',
                description: 'Nuestros maestros artesanos están trabajando en su pieza',
                icon: 'handyman',
                isCompleted: currentStepIndex >= 1,
                isCurrent: currentStepIndex === 1,
                date: currentStepIndex >= 1 ? formatDate(order.updatedAt) : null
            },
            {
                id: 'READY',
                label: 'Listo para Entrega',
                description: 'Pieza lista y disponible para entrega en sucursal',
                icon: 'verified',
                isCompleted: currentStepIndex >= 2,
                isCurrent: currentStepIndex === 2,
                date: currentStepIndex >= 2 ? formatDate(order.updatedAt) : null
            },
            {
                id: 'DELIVERED',
                label: 'Entregado',
                description: 'Pieza entregada al cliente',
                icon: 'local_shipping',
                isCompleted: currentStepIndex >= 3,
                isCurrent: currentStepIndex === 3,
                date: formatDate(order.deliveredAt)
            }
        ];

        return {
            verified: true,
            orderCode: `ORD-${order.id.substring(0, 8).toUpperCase()}`,
            concept: getConcepto(order.type),
            pieceType: (order.pieceType || 'PIEZA DE JOYERÍA').toUpperCase(),
            statusLabel,
            createdAt: formatDate(order.createdAt),
            deliveredAt: formatDate(order.deliveredAt),
            steps
        };
    }
}
