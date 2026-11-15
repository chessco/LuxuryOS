import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('user active status migration', () => {
  const migration = readFileSync(
    resolve(
      __dirname,
      '../../prisma/migrations/20261115190000_add_user_active_status/migration.sql',
    ),
    'utf8',
  );

  it('is additive and preserves every existing account as active', () => {
    expect(migration).toMatch(
      /ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT TRUE/i,
    );
    expect(migration).not.toMatch(
      /^\s*(DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE\s+TABLE|DELETE\s+FROM|UPDATE\s+)/im,
    );
  });
});
