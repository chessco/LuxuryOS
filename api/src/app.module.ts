import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { ClientsModule } from './clients/clients.module';
import { PaymentsModule } from './payments/payments.module';
import { UsersModule } from './users/users.module';
import { ChatModule } from './chat/chat.module';
import { QueueModule } from './queue/queue.module';
import { SettingsModule } from './settings/settings.module';
import { AiModule } from './ai/ai.module';
import { ResellerPosModule } from './reseller-pos/reseller-pos.module';
import { QuotesModule } from './quotes/quotes.module';
import { CommerceModule } from './commerce/commerce.module';
import { InventoryOperationsModule } from './inventory-operations/inventory-operations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OrdersModule,
    ClientsModule,
    PaymentsModule,
    UsersModule,
    ChatModule,
    QueueModule,
    SettingsModule,
    AiModule,
    QuotesModule,
    CommerceModule,
    InventoryOperationsModule,
    ResellerPosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
