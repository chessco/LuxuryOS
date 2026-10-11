import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isAdminRole } from '../common/roles.util';

@Injectable()
export class ClientsService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string, user?: any) {
        const canViewFinancials = user ? isAdminRole(user.role, user.email) : true;

        const clients = await this.prisma.client.findMany({
            where: { tenantId },
            include: {
                orders: {
                    select: {
                        id: true,
                        totalAmount: true,
                        paidAmount: true,
                        value: true,
                        status: true,
                        stage: true,
                        createdAt: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });

        return clients.map(client => {
            const clientOrders = client.orders || [];

            const validOrders = clientOrders.filter(o => {
                const s = String(o.status || o.stage || '').toUpperCase();
                return s !== 'CANCELLED' && s !== 'CANCELADO';
            });

            const totalSpentNum = validOrders.reduce((sum, o) => {
                const total = parseFloat(String(o.totalAmount || '0')) || 0;
                const val = parseFloat(String(o.value || '0')) || 0;
                const paid = parseFloat(String(o.paidAmount || '0')) || 0;
                const amount = total > 0 ? total : (val > 0 ? val : paid);
                return sum + amount;
            }, 0);

            const lastOrderDate = clientOrders.length > 0 && clientOrders[0].createdAt
                ? clientOrders[0].createdAt
                : null;

            return {
                ...client,
                totalSpentNumber: canViewFinancials ? totalSpentNum : null,
                totalSpent: canViewFinancials ? `${Number(totalSpentNum.toFixed(2)).toLocaleString('es-MX')} MXN` : null,
                lastOrderDate,
                lastOrder: lastOrderDate
                    ? new Date(lastOrderDate).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : '—',
                ordersCount: clientOrders.length,
            };
        });
    }

    async create(tenantId: string, data: any) {
        const { name, email, phone, location } = data;
        if (!name || !name.trim()) {
            throw new BadRequestException('El nombre del cliente es obligatorio');
        }
        return this.prisma.client.create({
            data: {
                name: name.toUpperCase().trim(),
                email,
                phone,
                location,
                tenantId,
            },
        });
    }

    async update(tenantId: string, id: string, data: any) {
        const { name, email, phone, location } = data;
        if (name !== undefined && (!name || !name.trim())) {
            throw new BadRequestException('El nombre del cliente es obligatorio');
        }
        return this.prisma.client.update({
            where: { id, tenantId },
            data: {
                name: name ? name.toUpperCase().trim() : undefined,
                email,
                phone,
                location,
            },
        });
    }

    async delete(tenantId: string, id: string) {
        return this.prisma.client.delete({
            where: { id, tenantId },
        });
    }
}
