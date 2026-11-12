CREATE TABLE `Supplier` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Supplier_tenantId_name_key`(`tenantId`, `name`),
  INDEX `Supplier_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InventoryEntry` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `supplierId` VARCHAR(191) NOT NULL,
  `type` ENUM('INITIAL_STOCK', 'ENTRY') NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'MXN',
  `comments` TEXT NULL,
  `totalCost` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `InventoryEntry_tenantId_type_createdAt_idx`(`tenantId`, `type`, `createdAt`),
  INDEX `InventoryEntry_supplierId_idx`(`supplierId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InventoryEntryItem` (
  `id` VARCHAR(191) NOT NULL,
  `entryId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `skuSnapshot` VARCHAR(191) NOT NULL,
  `nameSnapshot` VARCHAR(191) NOT NULL,
  `quantity` INT NOT NULL,
  `unitCost` DECIMAL(10,2) NOT NULL,
  `lineTotal` DECIMAL(10,2) NOT NULL,
  INDEX `InventoryEntryItem_entryId_idx`(`entryId`),
  INDEX `InventoryEntryItem_productId_idx`(`productId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InventoryMovement` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `entryId` VARCHAR(191) NULL,
  `type` ENUM('INITIAL_STOCK', 'ENTRY') NOT NULL,
  `quantityDelta` INT NOT NULL,
  `unitCost` DECIMAL(10,2) NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'MXN',
  `comments` TEXT NULL,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `InventoryMovement_tenantId_productId_createdAt_idx`(`tenantId`, `productId`, `createdAt`),
  INDEX `InventoryMovement_entryId_idx`(`entryId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Supplier` ADD CONSTRAINT `Supplier_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `InventoryEntry` ADD CONSTRAINT `InventoryEntry_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT `InventoryEntry_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE, ADD CONSTRAINT `InventoryEntry_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `InventoryEntryItem` ADD CONSTRAINT `InventoryEntryItem_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `InventoryEntry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT `InventoryEntryItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `CommerceProduct`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `InventoryMovement` ADD CONSTRAINT `InventoryMovement_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT `InventoryMovement_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `CommerceProduct`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE, ADD CONSTRAINT `InventoryMovement_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `InventoryEntry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE, ADD CONSTRAINT `InventoryMovement_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
