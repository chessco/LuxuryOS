import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    WebSocketServer,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './ws-jwt.guard';

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [
        'https://luxuryos.pitayacode.io',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:3002',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
    ];

@WebSocketGateway({
    cors: {
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || origin.endsWith('.pitayacode.io')) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    },
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    constructor(private readonly chatService: ChatService) { }

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('joinRoom')
    async handleJoinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() conversationId: string
    ) {
        const userId = client.data?.user?.sub || client.data?.user?.id;
        const tenantId = client.data?.user?.tenantId;

        if (!userId || !tenantId) {
            client.emit('error', { message: 'No autenticado para acceder al chat' });
            return;
        }

        const isMember = await this.chatService.isUserInConversation(conversationId, userId, tenantId);
        if (!isMember) {
            client.emit('error', { message: 'No autorizado para unirse a esta conversación' });
            return;
        }

        client.join(conversationId);
        console.log(`Client ${client.id} (user ${userId}) joined room: ${conversationId}`);
    }

    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(client: Socket, conversationId: string) {
        client.leave(conversationId);
        console.log(`Client ${client.id} left room: ${conversationId}`);
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string; senderId?: string; content: string },
    ) {
        const userId = client.data?.user?.sub || client.data?.user?.id;
        const tenantId = client.data?.user?.tenantId;

        if (!userId || !tenantId) {
            client.emit('error', { message: 'No autenticado para enviar mensajes' });
            return;
        }

        try {
            // Enforce authenticated senderId from JWT session
            const message = await this.chatService.saveMessage(
                data.conversationId,
                userId,
                data.content,
                tenantId
            );

            // Broadcast to all clients in the room
            this.server.to(data.conversationId).emit('newMessage', message);

            // Also notify users for the list update (last message)
            this.server.emit('conversationUpdated', {
                conversationId: data.conversationId,
                lastMessage: message
            });
        } catch (error: any) {
            console.error(`[ChatGateway] Error handling sendMessage:`, error);
            client.emit('error', { message: error.message || 'Failed to send message' });
        }
    }
}
