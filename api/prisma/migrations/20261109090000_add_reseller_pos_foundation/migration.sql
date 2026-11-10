-- Add the dedicated reseller role without reusing the jewelry salesperson role.
ALTER TABLE `User` MODIFY `role` ENUM('SYSTEM_ADMIN', 'TENANT_ADMIN', 'TENANT_USER', 'VENDEDOR', 'REVENDEDOR', 'JOYERO', 'DISENADOR') NOT NULL DEFAULT 'TENANT_USER';

-- Shared product catalog. The reseller channel may only expose explicitly enabled products.
CREATE TABLE `CommerceProduct` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(191) NULL,
    `imageUrl` TEXT NULL,
    `unitPrice` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'MXN',
    `stockOnHand` INTEGER NOT NULL DEFAULT 0,
    `reservedQuantity` INTEGER NOT NULL DEFAULT 0,
    `availableToResellers` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CommerceProduct_tenantId_sku_key`(`tenantId`, `sku`),
    INDEX `CommerceProduct_tenantId_status_availableToResellers_idx`(`tenantId`, `status`, `availableToResellers`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Commerce sales remain separate from jewelry production orders, while retaining
-- a channel field for the future internal POS.
CREATE TABLE `CommerceSale` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `resellerId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NULL,
    `salesChannel` ENUM('JEWELRY_INTERNAL', 'RESELLER_POS') NOT NULL DEFAULT 'RESELLER_POS',
    `status` ENUM('DRAFT', 'PENDING_PAYMENT', 'PAID', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `paymentStatus` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `currency` VARCHAR(3) NOT NULL DEFAULT 'MXN',
    `customerName` VARCHAR(191) NULL,
    `customerPhone` VARCHAR(191) NULL,
    `subtotalAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `discountAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `paidAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `idempotencyKey` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CommerceSale_idempotencyKey_key`(`idempotencyKey`),
    INDEX `CommerceSale_tenantId_salesChannel_status_idx`(`tenantId`, `salesChannel`, `status`),
    INDEX `CommerceSale_resellerId_createdAt_idx`(`resellerId`, `createdAt`),
    INDEX `CommerceSale_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommerceSaleItem` (
    `id` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `skuSnapshot` VARCHAR(191) NOT NULL,
    `nameSnapshot` VARCHAR(191) NOT NULL,
    `unitPrice` DECIMAL(10, 2) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `lineTotal` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CommerceSaleItem_saleId_idx`(`saleId`),
    INDEX `CommerceSaleItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommercePayment` (
    `id` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `recordedById` VARCHAR(191) NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CommercePayment_saleId_idx`(`saleId`),
    INDEX `CommercePayment_recordedById_idx`(`recordedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InventoryReservation` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `resellerId` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventoryReservation_tenantId_status_expiresAt_idx`(`tenantId`, `status`, `expiresAt`),
    INDEX `InventoryReservation_productId_status_idx`(`productId`, `status`),
    INDEX `InventoryReservation_resellerId_status_idx`(`resellerId`, `status`),
    INDEX `InventoryReservation_saleId_idx`(`saleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CommerceProduct` ADD CONSTRAINT `CommerceProduct_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CommerceSale` ADD CONSTRAINT `CommerceSale_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CommerceSale` ADD CONSTRAINT `CommerceSale_resellerId_fkey` FOREIGN KEY (`resellerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CommerceSale` ADD CONSTRAINT `CommerceSale_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CommerceSaleItem` ADD CONSTRAINT `CommerceSaleItem_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `CommerceSale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CommerceSaleItem` ADD CONSTRAINT `CommerceSaleItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `CommerceProduct`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CommercePayment` ADD CONSTRAINT `CommercePayment_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `CommerceSale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CommercePayment` ADD CONSTRAINT `CommercePayment_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `InventoryReservation` ADD CONSTRAINT `InventoryReservation_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `InventoryReservation` ADD CONSTRAINT `InventoryReservation_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `CommerceProduct`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `InventoryReservation` ADD CONSTRAINT `InventoryReservation_resellerId_fkey` FOREIGN KEY (`resellerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `InventoryReservation` ADD CONSTRAINT `InventoryReservation_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `CommerceSale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
