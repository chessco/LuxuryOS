import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class SocketService {
    private socket: Socket | null = null;

    connect() {
        if (this.socket) return;

        this.socket = io(SOCKET_URL);

        this.socket.on('connect', () => {
            console.log('Connected to socket server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from socket server');
        });
    }

    getSocket() {
        return this.socket;
    }

    joinRoom(conversationId: string) {
        this.socket?.emit('joinRoom', conversationId);
    }

    leaveRoom(conversationId: string) {
        this.socket?.emit('leaveRoom', conversationId);
    }

    sendMessage(data: { conversationId: string; senderId: string; content: string }) {
        this.socket?.emit('sendMessage', data);
    }

    onNewMessage(callback: (message: any) => void) {
        this.socket?.on('newMessage', callback);
    }

    onConversationUpdated(callback: (data: any) => void) {
        this.socket?.on('conversationUpdated', callback);
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
    }
}

export const socketService = new SocketService();
