ALTER TABLE `InventoryMovement`
  MODIFY COLUMN `type` ENUM('INITIAL_STOCK', 'ENTRY', 'EXIT', 'ADJUSTMENT') NOT NULL,
  ADD COLUMN `saleId` VARCHAR(191) NULL,
  ADD COLUMN `balanceAfter` INT NULL,
  ADD INDEX `InventoryMovement_saleId_idx`(`saleId`),
  ADD CONSTRAINT `InventoryMovement_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `CommerceSale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
