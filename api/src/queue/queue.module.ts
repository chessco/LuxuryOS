import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueGateway } from './queue.gateway';
import { NotificationService } from './notification.service';
import { OrdersModule } from '../orders/orders.module';
import { SettingsModule } from '../settings/settings.module';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { NotificationStatusController } from './notification-status.controller';

@Module({
    imports: [OrdersModule, SettingsModule],
    controllers: [QueueController, WhatsAppWebhookController, NotificationStatusController],
    providers: [QueueService, QueueGateway, NotificationService],
    exports: [QueueService],
})
export class QueueModule { }
