import api from './api';

export interface CreateClientDto {
    name: string;
    email?: string;
    phone?: string;
    tags?: string[];
}

export const ClientsService = {
    getAll: async () => {
        // Fetch clients and all orders in parallel to guarantee accurate client totals even before API cache refresh
        const [clientsRes, ordersRes] = await Promise.all([
            api.get<any[]>('/clients'),
            api.get<any[]>('/kanban/orders').catch(() => ({ data: [] }))
        ]);

        const allOrders: any[] = Array.isArray(ordersRes?.data) ? ordersRes.data : [];

        // Map orders by clientId, phone, and normalized name for bulletproof fallback
        const ordersByClientId = new Map<string, any[]>();
        const ordersByPhone = new Map<string, any[]>();
        const ordersByName = new Map<string, any[]>();

        for (const order of allOrders) {
            const cId = order.clientId || order.client?.id;
            if (cId) {
                if (!ordersByClientId.has(cId)) ordersByClientId.set(cId, []);
                ordersByClientId.get(cId)!.push(order);
            }

            const phone = String(order.client?.phone || (order.specifications as any)?.clientPhone || '').replace(/\D/g, '');
            if (phone) {
                if (!ordersByPhone.has(phone)) ordersByPhone.set(phone, []);
                ordersByPhone.get(phone)!.push(order);
            }

            const name = String(order.client?.name || order.clientName || '').trim().toUpperCase();
            if (name) {
                if (!ordersByName.has(name)) ordersByName.set(name, []);
                ordersByName.get(name)!.push(order);
            }
        }

        return (clientsRes.data || []).map(c => {
            const cleanPhone = String(c.phone || '').replace(/\D/g, '');
            const cleanName = String(c.name || '').trim().toUpperCase();

            const matchedOrders = (Array.isArray(c.orders) && c.orders.length > 0)
                ? c.orders
                : (ordersByClientId.get(c.id) ||
                   (cleanPhone ? ordersByPhone.get(cleanPhone) : undefined) ||
                   (cleanName ? ordersByName.get(cleanName) : undefined) || []);

            const validOrders = matchedOrders.filter((o: any) => {
                const s = String(o.status || o.stage || '').toUpperCase();
                return s !== 'CANCELLED' && s !== 'CANCELADO';
            });

            let totalSpentNum = 0;
            if (c.totalSpentNumber !== undefined && c.totalSpentNumber !== null && Number(c.totalSpentNumber) > 0) {
                totalSpentNum = Number(c.totalSpentNumber);
            } else if (c.totalSpent && c.totalSpent !== '0 MXN') {
                totalSpentNum = parseFloat(String(c.totalSpent).replace(/[^0-9.-]/g, '')) || 0;
            } else {
                totalSpentNum = validOrders.reduce((sum: number, o: any) => {
                    const total = parseFloat(String(o.totalAmount || '0')) || 0;
                    const val = parseFloat(String(o.value || '0')) || 0;
                    const paid = parseFloat(String(o.paidAmount || '0')) || 0;
                    const amount = total > 0 ? total : (val > 0 ? val : paid);
                    return sum + amount;
                }, 0);
            }

            let lastOrderFormatted = c.lastOrder && c.lastOrder !== '—' ? c.lastOrder : '—';
            if (lastOrderFormatted === '—' && matchedOrders.length > 0) {
                const sorted = [...matchedOrders].sort((a: any, b: any) =>
                    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                );
                if (sorted[0]?.createdAt) {
                    lastOrderFormatted = new Date(sorted[0].createdAt).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                }
            }

            return {
                ...c,
                status: c.status || 'Active',
                totalSpentNumber: totalSpentNum,
                totalSpent: `${totalSpentNum.toLocaleString('es-MX')} MXN`,
                lastOrder: lastOrderFormatted,
                initials: c.name ? c.name.substring(0, 2).toUpperCase() : 'CL',
                initialsColor: 'bg-zinc-800 text-zinc-400'
            };
        });
    },
    create: async (data: CreateClientDto) => {
        const response = await api.post('/clients', data);
        return response.data;
    },
    update: async (id: string, data: Partial<CreateClientDto>) => {
        const response = await api.patch(`/clients/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/clients/${id}`);
    },
    getHistory: async (id: string) => {
        const response = await api.get(`/clients/${id}/history`);
        return response.data;
    }
};

