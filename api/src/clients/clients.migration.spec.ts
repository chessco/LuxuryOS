import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('client type and reseller portal link migration', () => {
  const migration = readFileSync(
    resolve(
      __dirname,
      '../../prisma/migrations/20261115180000_add_client_type_and_reseller_portal_link/migration.sql',
    ),
    'utf8',
  );

  it('adds Client.type, tags, and resellerUserId additively without destructive SQL', () => {
    expect(migration).not.toMatch(
      /^\s*(DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE\s+TABLE|DELETE\s+FROM)/im,
    );
    expect(migration).toMatch(
      /ADD COLUMN `type` ENUM\('RETAIL', 'VIP', 'RESELLER'\) NOT NULL DEFAULT 'RETAIL'/,
    );
    expect(migration).toMatch(/ADD COLUMN `tags` JSON NULL/);
    expect(migration).toMatch(/ADD COLUMN `resellerUserId` VARCHAR\(191\) NULL/);
  });

  it('adds uniqueness and tenant-type indexes plus ON DELETE SET NULL foreign key', () => {
    expect(migration).toContain(
      'ADD UNIQUE INDEX `Client_resellerUserId_key`(`resellerUserId`)',
    );
    expect(migration).toContain(
      'ADD INDEX `Client_tenantId_type_idx`(`tenantId`, `type`)',
    );
    expect(migration).toContain(
      'CONSTRAINT `Client_resellerUserId_fkey`',
    );
    expect(migration).toContain('FOREIGN KEY (`resellerUserId`) REFERENCES `User`(`id`)');
    expect(migration).toContain('ON DELETE SET NULL ON UPDATE CASCADE');
    expect(migration).not.toContain('ON DELETE CASCADE');
  });
});
