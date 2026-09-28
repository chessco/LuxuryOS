import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { isOriginAllowed } from '../common/cors';

@WebSocketGateway({
    cors: {
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            if (isOriginAllowed(origin)) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    },
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
