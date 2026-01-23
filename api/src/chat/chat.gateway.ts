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

@WebSocketGateway({
    cors: {
        origin: '*',
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
    handleJoinRoom(client: Socket, conversationId: string) {
        client.join(conversationId);
        console.log(`Client ${client.id} joined room: ${conversationId}`);
    }

    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(client: Socket, conversationId: string) {
        client.leave(conversationId);
        console.log(`Client ${client.id} left room: ${conversationId}`);
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string; senderId: string; content: string },
    ) {
        const message = await this.chatService.saveMessage(
            data.conversationId,
            data.senderId,
            data.content,
        );

        // Broadcast to all clients in the room
        this.server.to(data.conversationId).emit('newMessage', message);

        // Also notify users for the list update (last message)
        this.server.emit('conversationUpdated', {
            conversationId: data.conversationId,
            lastMessage: message
        });
    }
}
