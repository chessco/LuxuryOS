import { Controller, Get, Post, Param, Body, Req, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateTrackToken } from './tracking.util';
import { RateLimiter } from '../common/rate-limiter';
import { clientIp } from '../common/roles.util';

@Controller('public/orders')
export class PublicOrdersController {
    private readonly requestsByIp = new RateLimiter(120, 10 * 60 * 1000);
    private readonly failuresByIpAndOrder = new RateLimiter(8, 15 * 60 * 1000);
    private readonly failuresByOrder = new RateLimiter(30, 60 * 60 * 1000);

    private tokenIndex = new Map<string, string>();
    private tokenIndexBuiltAt = 0;
    private tokenIndexBuilding: Promise<void> | null = null;

    constructor(private prisma: PrismaService) { }

    private assertRateLimit(req: any) {
        if (!this.requestsByIp.consume(clientIp(req))) {
            throw new HttpException('Demasiadas solicitudes. Intenta de nuevo en unos minutos.', HttpStatus.TOO_MANY_REQUESTS);
        }
    }

    private cleanIdentifier(idOrToken: string): string {
        let clean = (idOrToken || '').trim();
        if (clean.toUpperCase().startsWith('ORD-')) {
            clean = clean.substring(4).trim();
        }
        return clean;
    }

    // Un identificador fuerte (UUID completo o token de 16+ caracteres) no se puede adivinar por prefijo
    private isStrongIdentifier(idOrToken: string): boolean {
        return this.cleanIdentifier(idOrToken).length >= 16;
    }

    private async refreshTokenIndex() {
        if (!this.tokenIndexBuilding) {
            this.tokenIndexBuilding = (async () => {
                const rows = await this.prisma.order.findMany({
                    select: { id: true },
                    orderBy: { createdAt: 'desc' },
                    take: 20000,
                });
                const next = new Map<string, string>();
                for (const row of rows) {
                    next.set(generateTrackToken(row.id).toLowerCase(), row.id);
                }
                this.tokenIndex = next;
                this.tokenIndexBuiltAt = Date.now();
            })().finally(() => {
                this.tokenIndexBuilding = null;
            });
        }
        await this.tokenIndexBuilding;
    }

    private async findOrderIdByToken(token: string): Promise<string | null> {
        const key = token.toLowerCase();
        const cached = this.tokenIndex.get(key);
        if (cached) return cached;
        if (Date.now() - this.tokenIndexBuiltAt > 30_000) {
            await this.refreshTokenIndex();
        }
        return this.tokenIndex.get(key) ?? null;
    }

    private async findOrderByIdOrToken(idOrToken: string) {
        if (!idOrToken) return null;
        const clean = this.cleanIdentifier(idOrToken);

        // Prevent prefix enumeration: queries shorter than 8 characters are strictly rejected
        if (clean.length < 8) {
            return null;
        }

        // 1. Direct match by full UUID (36 characters)
        if (clean.length === 36) {
            const order = await this.prisma.order.findUnique({
                where: { id: clean },
                include: { client: true }
            });
            if (order) return order;
        }

        // 2. Match by 16-character tracking token
        if (clean.length >= 16) {
            const orderId = await this.findOrderIdByToken(clean);
            if (orderId) {
                const order = await this.prisma.order.findUnique({
                    where: { id: orderId },
                    include: { client: true }
                });
                if (order) return order;
            }
        }

        // 3. Exact 8-character prefix corresponding to standard ticket format (ORD-XXXXXXXX)
        if (clean.length === 8) {
            const orders = await this.prisma.order.findMany({
                where: {
                    id: { startsWith: clean.toLowerCase() }
                },
                take: 2,
                include: { client: true }
            });

            if (orders.length === 1) {
                return orders[0];
            }
        }

        return null;
    }

    private async checkExpiration(order: any) {
        const isDelivered = (order.status === 'DELIVERED' || order.stage === 'ENTREGADO_POSTVENTA') && order.deliveredAt;
        if (!isDelivered) return;

        // Fetch expiration setting
        const settings = await this.prisma.setting.findMany({
            where: { tenantId: order.tenantId }
        });
        const settingMap = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {} as Record<string, string>);
        const expirationDays = parseInt(settingMap['tracking_expiration_days'] || '15', 10);

        const deliveredTime = new Date(order.deliveredAt).getTime();
        const now = Date.now();
        const elapsedDays = (now - deliveredTime) / (1000 * 60 * 60 * 24);

        if (elapsedDays > expirationDays) {
            throw new BadRequestException(`Este enlace de seguimiento ha expirado (vigencia máxima de ${expirationDays} días posteriores a la entrega).`);
        }
    }

    @Get('track/:id/check')
    async checkOrder(@Param('id') idOrToken: string, @Req() req: any) {
        this.assertRateLimit(req);
        const order = await this.findOrderByIdOrToken(idOrToken);
        if (!order) {
            throw new NotFoundException('Pedido no encontrado');
        }

        // Check if expired
        await this.checkExpiration(order);

        return {
            exists: true,
            orderCode: `ORD-${order.id.substring(0, 8).toUpperCase()}`
        };
    }

    @Post('track/:id/verify')
    async verifyAndTrackOrder(
        @Param('id') idOrToken: string,
        @Body('phoneDigits') phoneDigits: string,
        @Req() req: any
    ) {
        this.assertRateLimit(req);
        if (typeof phoneDigits !== 'string' || !phoneDigits || phoneDigits.trim().length < 4) {
            throw new BadRequestException('Por favor ingrese los últimos 4 dígitos de su teléfono.');
        }

        const order = await this.findOrderByIdOrToken(idOrToken);
        if (!order) {
            throw new NotFoundException('Pedido no encontrado');
        }

        // Check expiration
        await this.checkExpiration(order);

        // Clean registered phone number
        const clientPhone = (order.client?.phone || (order as any).clientPhone || '').replace(/\D/g, '');
        const enteredDigits = phoneDigits.trim().replace(/\D/g, '').slice(-4);

        const ipOrderKey = `${clientIp(req)}|${order.id}`;
        if (this.failuresByIpAndOrder.isBlocked(ipOrderKey) || this.failuresByOrder.isBlocked(order.id)) {
            throw new HttpException('Demasiados intentos. Intenta de nuevo más tarde.', HttpStatus.TOO_MANY_REQUESTS);
        }

        if (clientPhone.length >= 4) {
            const last4Registered = clientPhone.slice(-4);
            if (last4Registered !== enteredDigits) {
                this.failuresByIpAndOrder.hit(ipOrderKey);
                this.failuresByOrder.hit(order.id);
                throw new BadRequestException('Los 4 dígitos ingresados no coinciden con el teléfono registrado.');
            }
        } else if (!this.isStrongIdentifier(idOrToken)) {
            throw new BadRequestException('Este pedido no tiene teléfono registrado. Usa el enlace de seguimiento que se te envió.');
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
