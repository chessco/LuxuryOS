import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationService } from '../queue/notification.service';
import { SettingsModule } from '../settings/settings.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [PrismaModule, AuthModule, SettingsModule, ConfigModule],
    providers: [ChatService, ChatGateway, NotificationService],
    controllers: [ChatController],
    exports: [ChatService],
})
export class ChatModule { }
