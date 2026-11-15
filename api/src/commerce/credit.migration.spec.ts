import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('dual credit management migration', () => {
  const migration = readFileSync(
    resolve(
      __dirname,
      '../../prisma/migrations/20261115090000_add_dual_credit_management/migration.sql',
    ),
    'utf8',
  );

  it('adds creditedAmount to CommerceSale additively without destructive statements', () => {
    expect(migration).toMatch(
      /ALTER TABLE `CommerceSale`\s+ADD COLUMN `creditedAmount` DECIMAL\(10, 2\) NOT NULL DEFAULT 0\.00;/,
    );
    expect(migration).not.toMatch(/^\s*(DROP\s+TABLE|DELETE\s+FROM|TRUNCATE\s+TABLE)/im);
  });

  it('creates CreditAccount, CreditObligation, CreditPayment, and CreditLedgerEntry tables with dual enums', () => {
    expect(migration).toContain('CREATE TABLE `CreditAccount`');
    expect(migration).toContain("ENUM('RESELLER', 'CLIENT')");
    expect(migration).toContain('CREATE TABLE `CreditObligation`');
    expect(migration).toContain("ENUM('REVOLVING', 'NON_REVOLVING')");
    expect(migration).toContain('`termDays` INTEGER NOT NULL DEFAULT 30');
    expect(migration).toContain('CREATE TABLE `CreditPayment`');
    expect(migration).toContain('CREATE TABLE `CreditLedgerEntry`');
  });

  it('enforces tenant-scoped subject uniqueness and idempotency unique keys', () => {
    expect(migration).toContain(
      'UNIQUE INDEX `CreditAccount_tenantId_resellerId_key`(`tenantId`, `resellerId`)',
    );
    expect(migration).toContain(
      'UNIQUE INDEX `CreditAccount_tenantId_clientId_key`(`tenantId`, `clientId`)',
    );
    expect(migration).toContain(
      'UNIQUE INDEX `CreditObligation_tenantId_idempotencyKey_key`(`tenantId`, `idempotencyKey`)',
    );
    expect(migration).toContain(
      'UNIQUE INDEX `CreditPayment_tenantId_idempotencyKey_key`(`tenantId`, `idempotencyKey`)',
    );
  });
});
