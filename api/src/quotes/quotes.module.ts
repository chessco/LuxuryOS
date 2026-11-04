import { Module } from '@nestjs/common';
import { NotificationService } from '../queue/notification.service';
import { SettingsService } from '../settings/settings.service';
import { OrderStrategyFactory } from '../orders/strategies/order-strategy.factory';
import { RepairStrategy } from '../orders/strategies/repair.strategy';
import { ManufactureStrategy } from '../orders/strategies/manufacture.strategy';
import { LayawayStrategy } from '../orders/strategies/layaway.strategy';
import { StandardStrategy } from '../orders/strategies/standard.strategy';
import { PublicQuotesController } from './public-quotes.controller';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

@Module({ controllers: [QuotesController, PublicQuotesController], providers: [QuotesService, NotificationService, SettingsService, OrderStrategyFactory, RepairStrategy, ManufactureStrategy, LayawayStrategy, StandardStrategy] })
export class QuotesModule {}
