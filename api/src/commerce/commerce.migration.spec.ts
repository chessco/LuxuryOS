import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('commerce reservation hardening migration', () => {
  const migration = readFileSync(
    resolve(
      __dirname,
      '../../prisma/migrations/20261111150000_harden_commerce_reservations/migration.sql',
    ),
    'utf8',
  );

  it('scopes idempotency without rewriting business rows', () => {
    expect(migration).toMatch(
      /ALTER TABLE `CommerceSale`\s+DROP INDEX `CommerceSale_tenantId_idempotencyKey_key`,\s+ADD UNIQUE INDEX `CommerceSale_idempotency_scope_key`/,
    );
    expect(migration).toContain('(`tenantId`, `salesChannel`, `resellerId`, `idempotencyKey`)');
    expect(migration).not.toMatch(/^\s*(DELETE\s+FROM|UPDATE\s+`|INSERT\s+INTO)/im);
  });

  it('only makes reservation expiration nullable', () => {
    expect(migration).toContain('ALTER TABLE `InventoryReservation`');
    expect(migration).toContain('MODIFY COLUMN `expiresAt` DATETIME(3) NULL');
  });

  it('adds a nullable settlement idempotency key scoped to its sale', () => {
    expect(migration).toContain('ADD COLUMN `idempotencyKey` VARCHAR(191) NULL');
    expect(migration).toContain(
      'ADD UNIQUE INDEX `CommercePayment_sale_idempotency_key` (`saleId`, `idempotencyKey`)',
    );
  });
});
