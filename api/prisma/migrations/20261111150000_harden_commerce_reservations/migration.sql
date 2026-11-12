-- Keep idempotency isolated per tenant, channel, and responsible user.
-- Existing rows remain valid because this replaces a stricter tenant-wide key.
ALTER TABLE `CommerceSale`
  DROP INDEX `CommerceSale_tenantId_idempotencyKey_key`,
  ADD UNIQUE INDEX `CommerceSale_idempotency_scope_key`
    (`tenantId`, `salesChannel`, `resellerId`, `idempotencyKey`);

-- A settlement retry is identified inside its sale without affecting checkout payments.
ALTER TABLE `CommercePayment`
  ADD COLUMN `idempotencyKey` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `CommercePayment_sale_idempotency_key` (`saleId`, `idempotencyKey`);

-- A reservation with money received has no automatic expiration.
ALTER TABLE `InventoryReservation`
  MODIFY COLUMN `expiresAt` DATETIME(3) NULL;
