import api from './api';

export class QueueService {
    static async createTicket(data: {
        customerName: string;
        customerPhone?: string;
        customerEmail?: string;
        kind: 'REPAIR' | 'SALE' | 'PICKUP';
        recommendationIds?: string[];
    }) {
        const response = await api.post('/queue/tickets', data);
        return response.data;
    }

    static async getPublicTickets() {
        const response = await api.get('/queue/tickets/public');
        return response.data;
    }

    static async getStaffTickets() {
        const response = await api.get('/queue/staff');
        return response.data;
    }

    static async callTicket(id: string) {
        const response = await api.post(`/queue/tickets/${id}/call`);
        return response.data;
    }

    static async setInService(id: string, createOrder: boolean = false) {
        const response = await api.post(`/queue/tickets/${id}/in-service`, { createOrder });
        return response.data;
    }

    static async doneTicket(id: string) {
        const response = await api.post(`/queue/tickets/${id}/done`);
        return response.data;
    }

    static async resolveTicketByToken(token: string) {
        const response = await api.get(`/queue/q/${token}`);
        return response.data;
    }

    static async searchPickups(name: string, phone: string) {
        const response = await api.get('/queue/pickup/search', { params: { name, phone } });
        return response.data;
    }

    static async confirmPickup(id: string) {
        const response = await api.post(`/queue/tickets/${id}/confirm-pickup`);
        return response.data;
    }

    static async confirmOrderDelivery(orderId: string) {
        const response = await api.post(`/queue/orders/${orderId}/confirm-delivery`);
        return response.data;
    }

    static async getRecommendations(kind: string) {
        const response = await api.get(`/queue/recommendations/${kind}`);
        return response.data;
    }

    static async linkOrder(ticketId: string, orderId: string) {
        const response = await api.post(`/queue/tickets/${ticketId}/link-order`, { orderId });
        return response.data;
    }
}
