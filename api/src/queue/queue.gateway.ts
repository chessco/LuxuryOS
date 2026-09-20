import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

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
