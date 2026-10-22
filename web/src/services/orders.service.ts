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
        const cleanId = encodeURIComponent((id || '').trim());
        const response = await api.get(`/kanban/orders/${cleanId}`);
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
    },

    async deleteOrder(id: string) {
        const response = await api.delete(`/kanban/orders/${id}`);
        return response.data;
    },

    async sendWhatsApp(id: string) {
        const response = await api.post(`/kanban/orders/${id}/send-whatsapp`);
        return response.data;
    },

    async deliverOrderViaQr(id: string) {
        const cleanId = encodeURIComponent((id || '').trim());
        const response = await api.post(`/kanban/orders/${cleanId}/deliver`);
        return response.data;
    },

    async settleAndDeliverOrderViaQr(
        id: string,
        paymentOrOptions?: string | { paymentMethod?: string; notes?: string; reference?: string },
        reference?: string
    ) {
        const cleanId = encodeURIComponent((id || '').trim());
        const payload = typeof paymentOrOptions === 'object' && paymentOrOptions !== null
            ? paymentOrOptions
            : { paymentMethod: paymentOrOptions, reference };
        const response = await api.post(`/kanban/orders/${cleanId}/settle-and-deliver`, payload);
        return response.data;
    },

    async uploadPhoto(fileOrBase64: File | string) {
        if (typeof fileOrBase64 === 'string') {
            const response = await api.post('/kanban/orders/upload-photo', { base64: fileOrBase64 });
            return response.data;
        } else {
            const formData = new FormData();
            formData.append('file', fileOrBase64);
            const response = await api.post('/kanban/orders/upload-photo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        }
    },

    async getPayments(orderId: string) {
        const cleanId = encodeURIComponent((orderId || '').trim());
        const response = await api.get(`/payments/order/${cleanId}`);
        return response.data;
    },

    async returnOrderToClientViaQr(id: string, reason: string) {
        const cleanId = encodeURIComponent((id || '').trim());
        const response = await api.post(`/kanban/orders/${cleanId}/return-client`, { reason });
        return response.data;
    },

    async completeDesign(id: string, designData: { notes?: string; images?: string[] }) {
        const cleanId = encodeURIComponent((id || '').trim());
        const response = await api.post(`/kanban/orders/${cleanId}/complete-design`, designData);
        return response.data;
    },

    async assignJewelerAfterDesign(id: string, jewelerName: string, jewelerId?: string) {
        const cleanId = encodeURIComponent((id || '').trim());
        const response = await api.post(`/kanban/orders/${cleanId}/assign-jeweler`, { jewelerName, jewelerId });
        return response.data;
    }
};

