import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { ClientsModule } from './clients/clients.module';

@Module({
  imports: [PrismaModule, AuthModule, OrdersModule, ClientsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
