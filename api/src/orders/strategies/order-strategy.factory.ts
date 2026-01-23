import { Injectable } from '@nestjs/common';
import { OrderType } from '@prisma/client';
import { OrderStrategy } from './order-strategy.interface';
import { RepairStrategy } from './repair.strategy';
import { ManufactureStrategy } from './manufacture.strategy';
import { LayawayStrategy } from './layaway.strategy';
import { StandardStrategy } from './standard.strategy';

@Injectable()
export class OrderStrategyFactory {
    constructor(
        private repairStrategy: RepairStrategy,
        private manufactureStrategy: ManufactureStrategy,
        private layawayStrategy: LayawayStrategy,
        private standardStrategy: StandardStrategy,
    ) { }

    getStrategy(type: OrderType): OrderStrategy {
        switch (type) {
            case OrderType.REPAIR:
                return this.repairStrategy;
            case OrderType.MANUFACTURE:
                return this.manufactureStrategy;
            case OrderType.LAYAWAY:
                return this.layawayStrategy;
            default:
                return this.standardStrategy;
        }
    }
}
