import api from './api';

export const OrdersService = {
    getBoard: async (type?: string) => {
        const response = await api.get('/kanban/board', { params: { type } });
        return response.data;
    },
    getOrders: async () => {
        const response = await api.get('/kanban/orders');
        return response.data;
    },
    create: async (orderData: any) => {
        const response = await api.post('/kanban/orders', orderData);
        return response.data;
    },
    moveOrder: async (id: string, toStage: string) => {
        const response = await api.patch(`/kanban/order/${id}/move`, { toStage });
        return response.data;
    },
    getOrder: async (id: string): Promise<any> => {
        const response = await api.get(`/kanban/orders/${id}`);
        return response.data;
    },
    advanceStatus: async (id: string) => {
        const response = await api.patch(`/kanban/orders/${id}/advance`);
        return response.data;
    },
    updateOrder: async (id: string, data: any) => {
        const response = await api.patch(`/kanban/orders/${id}`, data);
        return response.data;
    },

    async registerPayment(orderId: string, amount: number, method: string) {
        const response = await api.post('/payments', { orderId, amount, method });
        return response.data;
    },

    async generateImage(id: string) {
        const response = await api.post(`/kanban/orders/${id}/generate-image`);
        return response.data;
    },

    async deletePayment(id: string) {
        const response = await api.delete(`/payments/${id}`);
        return response.data;
    }
};
