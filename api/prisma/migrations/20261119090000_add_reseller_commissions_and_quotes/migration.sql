-- Frozen reseller margin snapshots. Existing rows remain NONE with nullable amounts.
ALTER TABLE `CommerceSaleItem`
  ADD COLUMN `publicUnitPrice` DECIMAL(10,2) NULL,
  ADD COLUMN `commissionUnitAmount` DECIMAL(10,2) NULL,
  ADD COLUMN `commissionAmount` DECIMAL(10,2) NULL;

ALTER TABLE `CommerceSale`
  ADD COLUMN `publicTotalAmount` DECIMAL(12,2) NULL,
  ADD COLUMN `commissionAmount` DECIMAL(12,2) NULL,
  ADD COLUMN `commissionStatus` ENUM('NONE', 'PENDING', 'PENDING_CREDIT', 'EARNED', 'VOIDED') NOT NULL DEFAULT 'NONE',
  ADD COLUMN `commissionEarnedAt` DATETIME(3) NULL,
  ADD INDEX `CommerceSale_channel_created_idx` (`tenantId`, `salesChannel`, `createdAt`),
  ADD INDEX `CommerceSale_reseller_created_idx` (`tenantId`, `salesChannel`, `resellerId`, `createdAt`);
