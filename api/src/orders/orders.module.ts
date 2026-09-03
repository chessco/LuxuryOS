import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PublicOrdersController } from './public-orders.controller';

import { OrderStrategyFactory } from './strategies/order-strategy.factory';
import { RepairStrategy } from './strategies/repair.strategy';
import { ManufactureStrategy } from './strategies/manufacture.strategy';
import { LayawayStrategy } from './strategies/layaway.strategy';

import { StandardStrategy } from './strategies/standard.strategy';
import { NotificationService } from '../queue/notification.service';
import { SettingsService } from '../settings/settings.service';

@Module({
    providers: [
        OrdersService,
        OrderStrategyFactory,
        RepairStrategy,
        ManufactureStrategy,
        LayawayStrategy,
        StandardStrategy,
        NotificationService,
        SettingsService,
    ],
    controllers: [OrdersController, PublicOrdersController],
})
export class OrdersModule { }
