import { readFileSync } from 'fs';
import { resolve } from 'path';

const migrationPath = resolve(
  __dirname,
  '../../prisma/migrations/20261109090000_add_reseller_pos_foundation/migration.sql',
);

describe('reseller POS foundation migration', () => {
  const migration = readFileSync(migrationPath, 'utf8');

  it('adds only the dedicated role and new reseller commerce tables', () => {
    expect(migration).toContain("'REVENDEDOR'");
    for (const table of [
      'CommerceProduct',
      'CommerceSale',
      'CommerceSaleItem',
      'CommercePayment',
      'InventoryReservation',
    ]) {
      expect(migration).toContain(`CREATE TABLE \`${table}\``);
    }
    expect(migration).not.toMatch(/ALTER TABLE `Order`/);
    expect(migration).not.toMatch(/ALTER TABLE `Payment`/);
  });

  it('does not mutate or remove existing business data', () => {
    expect(migration).not.toMatch(
      /^\s*(DELETE\s+FROM|UPDATE\s+`|INSERT\s+INTO|DROP\s+(TABLE|COLUMN|INDEX))/im,
    );
  });
});
