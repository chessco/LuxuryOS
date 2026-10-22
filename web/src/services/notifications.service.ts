import api from './api';

export interface WhatsAppStatus {
    connected: boolean;
    failedCount: number;
    lastFailureAt: string | null;
}

export const NotificationsService = {
    getWhatsAppStatus: async (): Promise<WhatsAppStatus> => {
        const response = await api.get('/notifications/whatsapp-status');
        return response.data;
    }
};
