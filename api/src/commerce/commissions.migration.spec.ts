import { readFileSync } from 'fs';
import { join } from 'path';

describe('Reseller commissions additive migration', () => {
  const migration = readFileSync(
    join(__dirname, '../../prisma/migrations/20261119090000_add_reseller_commissions_and_quotes/migration.sql'),
    'utf8',
  );
  const sql = migration.replace(/^--.*$/gm, '');

  it('adds nullable frozen margin snapshots and a NONE default', () => {
    expect(sql).toMatch(/ALTER TABLE `CommerceSaleItem`/);
    for (const column of ['publicUnitPrice', 'commissionUnitAmount', 'commissionAmount']) {
      expect(sql).toMatch(new RegExp(`ADD COLUMN \`${column}\` DECIMAL\\(10,2\\) NULL`));
    }
    expect(sql).toMatch(/ALTER TABLE `CommerceSale`/);
    for (const column of ['publicTotalAmount', 'commissionAmount']) {
      expect(sql).toMatch(new RegExp(`ADD COLUMN \`${column}\` DECIMAL\\(12,2\\) NULL`));
    }
    expect(sql).toMatch(/ADD COLUMN `commissionStatus` ENUM\('NONE', 'PENDING', 'PENDING_CREDIT', 'EARNED', 'VOIDED'\) NOT NULL DEFAULT 'NONE'/);
    expect(sql).toMatch(/ADD COLUMN `commissionEarnedAt` DATETIME\(3\) NULL/);
  });

  it('adds the mapped reporting indexes', () => {
    expect(sql).toMatch(/ADD INDEX `CommerceSale_channel_created_idx` \(`tenantId`, `salesChannel`, `createdAt`\)/);
    expect(sql).toMatch(/ADD INDEX `CommerceSale_reseller_created_idx` \(`tenantId`, `salesChannel`, `resellerId`, `createdAt`\)/);
  });

  it('contains no destructive DML or DDL', () => {
    expect(sql).not.toMatch(/\b(?:DROP|TRUNCATE|UPDATE|DELETE|INSERT)\b/i);
  });
});
