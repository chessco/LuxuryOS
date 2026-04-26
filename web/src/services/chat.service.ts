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
    }
};
