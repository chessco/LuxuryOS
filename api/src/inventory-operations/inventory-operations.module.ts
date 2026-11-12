import { Module } from '@nestjs/common';
import { InventoryOperationsController } from './inventory-operations.controller';
import { InventoryOperationsService } from './inventory-operations.service';
@Module({ controllers: [InventoryOperationsController], providers: [InventoryOperationsService] })
export class InventoryOperationsModule {}
