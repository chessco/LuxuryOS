-- Business Partner pattern: ClientType (RETAIL, VIP, RESELLER), tags, and 1:1 optional link to User (REVENDEDOR)
ALTER TABLE `Client`
    ADD COLUMN `type` ENUM('RETAIL', 'VIP', 'RESELLER') NOT NULL DEFAULT 'RETAIL',
    ADD COLUMN `tags` JSON NULL,
    ADD COLUMN `resellerUserId` VARCHAR(191) NULL,
    ADD UNIQUE INDEX `Client_resellerUserId_key`(`resellerUserId`),
    ADD INDEX `Client_tenantId_type_idx`(`tenantId`, `type`);

ALTER TABLE `Client`
    ADD CONSTRAINT `Client_resellerUserId_fkey`
    FOREIGN KEY (`resellerUserId`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
