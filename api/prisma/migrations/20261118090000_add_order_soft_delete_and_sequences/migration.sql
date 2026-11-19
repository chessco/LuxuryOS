-- Additive, nullable audit fields keep existing orders and references intact.
ALTER TABLE `Order`
  ADD COLUMN `deletedAt` DATETIME(3) NULL,
  ADD COLUMN `deletedById` VARCHAR(191) NULL,
  ADD COLUMN `deletionReason` VARCHAR(500) NULL;

CREATE INDEX `Order_tenantId_deletedAt_idx` ON `Order`(`tenantId`, `deletedAt`);
CREATE INDEX `Order_deletedById_idx` ON `Order`(`deletedById`);

ALTER TABLE `Order`
  ADD CONSTRAINT `Order_deletedById_fkey`
  FOREIGN KEY (`deletedById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `OrderNumberSequence` (
  `tenantId` VARCHAR(191) NOT NULL,
  `type` ENUM('STANDARD', 'REPAIR', 'MANUFACTURE', 'DESIGN', 'LASER', 'LAYAWAY', 'QUOTE') NOT NULL,
  `currentValue` INTEGER NOT NULL DEFAULT 0,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`tenantId`, `type`),
  CONSTRAINT `OrderNumberSequence_tenantId_fkey`
    FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
