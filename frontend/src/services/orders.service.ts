import api from './api';

export const OrdersService = {
    getBoard: async () => {
        const response = await api.get('/kanban/board');
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
    getOrder: async (id: string) => {
        // Fallback for demo if endpoint doesn't exist or returns 404, 
        // but ideally this calls GET /kanban/orders/:id
        // Since we don't have that endpoint explicitly in the controller yet (checked in step 239)
        // We will mock it or fetch all and find. 
        // Controller has GET /kanban/orders -> returns all.
        const response = await api.get('/kanban/orders');
        return response.data.find((o: any) => o.id === id);
    }
};
