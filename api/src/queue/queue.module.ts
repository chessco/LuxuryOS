import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueGateway } from './queue.gateway';
import { NotificationService } from './notification.service';
import { OrdersModule } from '../orders/orders.module';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

@Module({
    imports: [OrdersModule],
    controllers: [QueueController, WhatsAppWebhookController],
    providers: [QueueService, QueueGateway, NotificationService],
    exports: [QueueService],
})
export class QueueModule { }
