CREATE TABLE `Quote` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NULL,
  `status` ENUM('DRAFT','SENT','AUTHORIZED','CONVERTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `quoteNumber` INTEGER NOT NULL,
  `quoteCode` VARCHAR(191) NOT NULL,
  `pieceType` VARCHAR(191) NOT NULL,
  `notes` TEXT NULL,
  `specifications` JSON NULL,
  `laborCost` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `materialCost` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `totalAmount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `validUntil` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `authorizedAt` DATETIME(3) NULL,
  `convertedAt` DATETIME(3) NULL,
  `cancelledAt` DATETIME(3) NULL,
  `publicToken` VARCHAR(191) NOT NULL,
  `convertedOrderId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Quote_publicToken_key`(`publicToken`),
  UNIQUE INDEX `Quote_convertedOrderId_key`(`convertedOrderId`),
  UNIQUE INDEX `Quote_tenantId_quoteNumber_key`(`tenantId`, `quoteNumber`),
  UNIQUE INDEX `Quote_tenantId_quoteCode_key`(`tenantId`, `quoteCode`),
  INDEX `Quote_tenantId_status_createdAt_idx`(`tenantId`, `status`, `createdAt`),
  INDEX `Quote_clientId_idx`(`clientId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Quote` ADD CONSTRAINT `Quote_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_convertedOrderId_fkey` FOREIGN KEY (`convertedOrderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve historical quotes while removing them from the operational workflow.
INSERT INTO `Quote` (`id`, `tenantId`, `clientId`, `createdById`, `status`, `quoteNumber`, `quoteCode`, `pieceType`, `notes`, `specifications`, `laborCost`, `materialCost`, `totalAmount`, `validUntil`, `sentAt`, `authorizedAt`, `cancelledAt`, `publicToken`, `createdAt`, `updatedAt`)
SELECT
  UUID(), o.`tenantId`, o.`clientId`, o.`createdById`,
  CASE o.`status` WHEN 'QUOTE_SENT' THEN 'SENT' WHEN 'APPROVED' THEN 'AUTHORIZED' WHEN 'CANCELLED' THEN 'CANCELLED' ELSE 'DRAFT' END,
  ROW_NUMBER() OVER (PARTITION BY o.`tenantId` ORDER BY o.`createdAt`, o.`id`),
  CONCAT('COT-', ROW_NUMBER() OVER (PARTITION BY o.`tenantId` ORDER BY o.`createdAt`, o.`id`)),
  o.`pieceType`, o.`notes`, o.`specifications`, COALESCE(o.`laborCost`, 0), COALESCE(o.`materialCost`, 0), o.`totalAmount`, o.`dueDate`,
  CASE WHEN o.`status` = 'QUOTE_SENT' THEN o.`updatedAt` ELSE NULL END,
  CASE WHEN o.`status` = 'APPROVED' THEN o.`updatedAt` ELSE NULL END,
  o.`cancelledAt`, LOWER(SHA2(CONCAT(o.`id`, UUID(), RAND()), 256)), o.`createdAt`, o.`updatedAt`
FROM `Order` o WHERE o.`type` = 'QUOTE';
