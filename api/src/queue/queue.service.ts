import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueTicketStatus, QueueTicketKind, Prisma, OrderType, OrderStage, OrderStatus } from '@prisma/client';
import { CreateQueueTicketDto } from './dto/create-queue-ticket.dto';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from './notification.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QueueService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
        private configService: ConfigService,
    ) { }

    async createTicket(tenantId: string, data: CreateQueueTicketDto) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return this.prisma.$transaction(async (tx) => {
            const count = await tx.queueTicket.count({
                where: {
                    tenantId,
                    kind: data.kind,
                    createdAt: { gte: today },
                },
            });

            const prefixMap = {
                [QueueTicketKind.REPAIR]: 'R',
                [QueueTicketKind.SALE]: 'V',
                [QueueTicketKind.PICKUP]: 'P',
            };

            const prefix = prefixMap[data.kind] || 'T';
            const code = `${prefix}-${(count + 1).toString().padStart(3, '0')}`;
            const qrToken = uuidv4();

            const ticket = await tx.queueTicket.create({
                data: {
                    tenantId,
                    kind: data.kind,
                    customerName: data.customerName,
                    customerPhone: data.customerPhone,
                    customerEmail: data.customerEmail,
                    code,
                    qrToken,
                    recommendations: data.recommendationIds ? {
                        create: data.recommendationIds.map(id => ({
                            recommendationId: id
                        }))
                    } : undefined,
                },
            });

            await tx.queueEvent.create({
                data: {
                    ticketId: ticket.id,
                    toStatus: QueueTicketStatus.WAITING,
                },
            });

            return ticket;
        });
    }

    async getPublicTickets(tenantId: string) {
        const current = await this.prisma.queueTicket.findFirst({
            where: {
                tenantId,
                status: { in: [QueueTicketStatus.CALLING, QueueTicketStatus.IN_SERVICE] }
            },
            orderBy: { updatedAt: 'desc' },
        });

        const waiting = await this.prisma.queueTicket.findMany({
            where: { tenantId, status: QueueTicketStatus.WAITING },
            orderBy: { createdAt: 'asc' },
            take: 10,
        });

        return { current, waiting };
    }

    async getStaffTickets(tenantId: string) {
        return this.prisma.queueTicket.findMany({
            where: {
                tenantId,
                status: {
                    in: [QueueTicketStatus.WAITING, QueueTicketStatus.CALLING, QueueTicketStatus.IN_SERVICE],
                },
            },
            orderBy: [{ status: 'desc' }, { createdAt: 'asc' }],
            include: {
                recommendations: { include: { recommendation: true } },
                order: true
            },
        });
    }

    async setCalling(ticketId: string, tenantId: string, userId: string) {
        const ticket = await this.prisma.queueTicket.findFirst({
            where: { id: ticketId, tenantId },
        });
        if (!ticket) throw new NotFoundException('Ticket not found');

        const updated = await this.updateStatus(ticketId, tenantId, QueueTicketStatus.CALLING, userId);

        if (ticket.customerPhone) {
            await this.notificationService.notifyNowTurn(tenantId, ticket.id, ticket.customerPhone, ticket.customerName, ticket.code);
        }

        return updated;
    }

    async setInService(ticketId: string, tenantId: string, userId: string, createOrder: boolean = false) {
        const ticket = await this.prisma.queueTicket.findFirst({
            where: { id: ticketId, tenantId },
            include: { order: true }
        });
        if (!ticket) throw new NotFoundException('Ticket not found');

        return this.prisma.$transaction(async (tx) => {
            let linkedOrderId = ticket.orderId;

            if (createOrder && !linkedOrderId && ticket.kind !== QueueTicketKind.PICKUP) {
                // Find or Create Client
                let client = await tx.client.findFirst({
                    where: {
                        tenantId,
                        OR: [
                            { phone: ticket.customerPhone || undefined },
                            { email: ticket.customerEmail || undefined }
                        ].filter(f => f.phone || f.email) as any
                    }
                });

                if (!client) {
                    client = await tx.client.create({
                        data: {
                            tenantId,
                            name: ticket.customerName,
                            phone: ticket.customerPhone,
                            email: ticket.customerEmail,
                        }
                    });
                }

                const orderData: Prisma.OrderCreateInput = {
                    tenant: { connect: { id: tenantId } },
                    client: { connect: { id: client.id } },
                    pieceType: 'Por definir',
                    value: 0,
                    cost: 0,
                    margin: 0,
                    totalAmount: 0,
                    paidAmount: 0,
                    balance: 0,
                    queueTicket: { connect: { id: ticket.id } },
                    type: ticket.kind === QueueTicketKind.REPAIR ? OrderType.REPAIR : OrderType.STANDARD,
                    status: ticket.kind === QueueTicketKind.REPAIR ? OrderStatus.RECEIVED : OrderStatus.DRAFT,
                    stage: ticket.kind === QueueTicketKind.REPAIR ? undefined : OrderStage.INTERES_LEAD,
                };

                const order = await tx.order.create({ data: orderData });
                linkedOrderId = order.id;
            }

            const updatedTicket = await tx.queueTicket.update({
                where: { id: ticketId },
                data: {
                    status: QueueTicketStatus.IN_SERVICE,
                    orderId: linkedOrderId
                },
            });

            await tx.queueEvent.create({
                data: {
                    ticketId,
                    fromStatus: ticket.status,
                    toStatus: QueueTicketStatus.IN_SERVICE,
                    changedBy: userId,
                },
            });

            return updatedTicket;
        });
    }

    async confirmPickup(ticketId: string, tenantId: string, userId: string) {
        const ticket = await this.prisma.queueTicket.findFirst({
            where: { id: ticketId, tenantId },
            include: { order: true }
        });
        if (!ticket || !ticket.orderId) throw new BadRequestException('Ticket has no linked order for pickup');

        return this.prisma.$transaction(async (tx) => {
            const order = ticket.order!;

            if (order.type === OrderType.REPAIR) {
                await tx.order.update({
                    where: { id: order.id },
                    data: { status: OrderStatus.DELIVERED },
                });
            } else {
                await tx.order.update({
                    where: { id: order.id },
                    data: { stage: OrderStage.ENTREGADO_POSTVENTA },
                });
            }

            return this.updateStatus(ticketId, tenantId, QueueTicketStatus.DONE, userId, tx);
        });
    }

    async updateStatus(ticketId: string, tenantId: string, toStatus: QueueTicketStatus, userId?: string, txInstance?: Prisma.TransactionClient) {
        const tx = txInstance || this.prisma;

        const ticket = await tx.queueTicket.findFirst({ where: { id: ticketId, tenantId } });
        if (!ticket) throw new NotFoundException('Ticket not found');

        const updatedTicket = await tx.queueTicket.update({
            where: { id: ticketId },
            data: { status: toStatus },
        });

        await tx.queueEvent.create({
            data: {
                ticketId,
                fromStatus: ticket.status,
                toStatus,
                changedBy: userId,
            },
        });

        // If a turn was called or finished, check who is near now
        if (toStatus === QueueTicketStatus.CALLING || toStatus === QueueTicketStatus.DONE || toStatus === QueueTicketStatus.NO_SHOW) {
            this.notifyNearPeople(tenantId);
        }

        return updatedTicket;
    }

    private async notifyNearPeople(tenantId: string) {
        const threshold = parseInt(this.configService.get('QUEUE_NEAR_THRESHOLD', '3'));

        // Get people in WAITING state, ordered by creation
        const waiting = await this.prisma.queueTicket.findMany({
            where: { tenantId, status: QueueTicketStatus.WAITING },
            orderBy: { createdAt: 'asc' },
            take: threshold,
        });

        for (const ticket of waiting) {
            if (ticket.customerPhone) {
                await this.notificationService.notifyNearTurn(tenantId, ticket.id, ticket.customerPhone, ticket.customerName);
            }
        }
    }

    async getByToken(qrToken: string) {
        const ticket = await this.prisma.queueTicket.findUnique({
            where: { qrToken },
            include: { order: true, recommendations: { include: { recommendation: true } } },
        });
        if (!ticket) throw new NotFoundException('Ticket not found');
        return ticket;
    }

    async searchPickups(tenantId: string, name?: string, phone?: string) {
        return this.prisma.queueTicket.findMany({
            where: {
                tenantId,
                kind: QueueTicketKind.PICKUP,
                status: QueueTicketStatus.WAITING,
                customerName: name ? { contains: name } : undefined,
                customerPhone: phone ? { contains: phone } : undefined,
            },
            include: { order: true },
        });
    }

    async getRecommendations(tenantId: string, kind: QueueTicketKind) {
        return this.prisma.queueRecommendation.findMany({
            where: { tenantId, kind, isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
    }
}
