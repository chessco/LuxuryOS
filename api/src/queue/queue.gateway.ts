import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: 'queue',
})
export class QueueGateway {
    @WebSocketServer()
    server!: Server;

    @SubscribeMessage('joinTenantRoom')
    handleJoinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() tenantId: string,
    ) {
        client.join(tenantId);
        console.log(`Client ${client.id} joined queue room: ${tenantId}`);
    }

    notifyUpdate(tenantId: string) {
        this.server.to(tenantId).emit('queueUpdated');
    }
}
