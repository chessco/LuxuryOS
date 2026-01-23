import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

import { OrderStrategyFactory } from './strategies/order-strategy.factory';
import { RepairStrategy } from './strategies/repair.strategy';
import { ManufactureStrategy } from './strategies/manufacture.strategy';
import { LayawayStrategy } from './strategies/layaway.strategy';

import { StandardStrategy } from './strategies/standard.strategy';

@Module({
    providers: [
        OrdersService,
        OrderStrategyFactory,
        RepairStrategy,
        ManufactureStrategy,
        LayawayStrategy,
        StandardStrategy,
    ],
    controllers: [OrdersController],
})
export class OrdersModule { }
