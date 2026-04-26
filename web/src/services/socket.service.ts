import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class SocketService {
    private socket: Socket | null = null;

    connect() {
        if (this.socket) return;

        const token = localStorage.getItem('token');
        this.socket = io(SOCKET_URL, {
            auth: { token }
        });

        this.socket.on('connect', () => {
            console.log('Connected to socket server. Socket ID:', this.socket?.id);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from socket server. Reason:', reason);
        });
    }

    getSocket() {
        return this.socket;
    }

    joinRoom(conversationId: string) {
        if (!this.socket?.connected) {
            console.log(`[SocketService] Socket not connected, queuing joinRoom for: ${conversationId}`);
            this.socket?.once('connect', () => {
                this.socket?.emit('joinRoom', conversationId);
            });
            return;
        }
        this.socket.emit('joinRoom', conversationId);
    }

    leaveRoom(conversationId: string) {
        this.socket?.emit('leaveRoom', conversationId);
    }

    sendMessage(data: { conversationId: string; senderId: string; content: string }) {
        if (!this.socket?.connected) {
            console.warn('[SocketService] Attempted to send message while disconnected. Queuing...');
            this.socket?.once('connect', () => {
                this.socket?.emit('sendMessage', data);
            });
            return;
        }
        this.socket.emit('sendMessage', data);
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
