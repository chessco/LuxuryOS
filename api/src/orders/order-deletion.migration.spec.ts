import * as fs from 'fs';
import * as path from 'path';

describe('order soft-delete and immutable sequence migrations', () => {
  const migrationsRoot = path.resolve(__dirname, '../../prisma/migrations');

  it('adds nullable audit fields and a persistent tenant/type sequence', () => {
    const ddl = fs.readFileSync(
      path.join(migrationsRoot, '20261118090000_add_order_soft_delete_and_sequences/migration.sql'),
      'utf8',
    );
    expect(ddl).toContain('`deletedAt` DATETIME(3) NULL');
    expect(ddl).toContain('`deletedById` VARCHAR(191) NULL');
    expect(ddl).toContain('`deletionReason` VARCHAR(500) NULL');
    expect(ddl).toContain('CREATE TABLE `OrderNumberSequence`');
  });

  it('initializes counters from the maximum retained order code without rewriting orders', () => {
    const dataMigration = fs.readFileSync(
      path.join(migrationsRoot, '20261118091000_initialize_order_sequences/migration.sql'),
      'utf8',
    );
    expect(dataMigration).toContain('MAX(CAST(SUBSTRING_INDEX');
    expect(dataMigration).not.toMatch(/UPDATE\s+`Order`/i);
    expect(dataMigration).not.toMatch(/DELETE\s+FROM\s+`Order`/i);
  });
});
