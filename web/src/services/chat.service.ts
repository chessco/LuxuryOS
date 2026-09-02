import api from './api';

export const ChatService = {
    getConversations: async () => {
        const response = await api.get('/chat/conversations');
        return response.data;
    },

    getMessages: async (conversationId: string) => {
        const response = await api.get(`/chat/conversations/${conversationId}/messages`);
        return response.data;
    },

    findOrCreateConversation: async (userId: string) => {
        const response = await api.post('/chat/conversations/find-or-create', { userId });
        return response.data;
    },

    // --- WhatsApp Customer Chat ---

    getWhatsAppConversations: async () => {
        const response = await api.get('/chat/whatsapp/conversations');
        return response.data;
    },

    getWhatsAppMessages: async (phone: string) => {
        const response = await api.get('/chat/whatsapp/messages', { params: { phone } });
        return response.data;
    },

    sendWhatsAppMessage: async (phone: string, content: string, clientName?: string) => {
        const response = await api.post('/chat/whatsapp/send', { phone, content, clientName });
        return response.data;
    }
};
