/**
 * Non-destructive, idempotent Credit & POS Testbed seeder.
 * Run with: npx --prefix api ts-node prisma/seed_credit_testbed.ts
 */
import {
  CommercePaymentStatus,
  CommerceSaleStatus,
  CreditAccountStatus,
  CreditFacilityType,
  CreditLedgerEntryType,
  CreditObligationStatus,
  CreditSubjectType,
  InventoryReservationStatus,
  PrismaClient,
  Role,
  SalesChannel,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const MS_PER_DAY = 86_400_000;

async function ensureReseller(
  tenantId: string,
  email: string,
  name: string,
  passwordHash: string,
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      tenantId,
      email,
      name,
      role: Role.REVENDEDOR,
      passwordHash,
    },
  });
}

async function main() {
  const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!tenant) {
    throw new Error('No hay ningún Tenant creado. Ejecuta primero el seed principal o crea la organización.');
  }

  const adminUser = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: { in: [Role.TENANT_ADMIN, Role.SYSTEM_ADMIN] } },
    orderBy: { createdAt: 'asc' },
  });

  const testPassword = process.env.TESTBED_RESELLER_PASSWORD || 'cared-testbed-2026';
  const passwordHash = await bcrypt.hash(testPassword, 10);

  const resellerCurrent = await ensureReseller(
    tenant.id,
    'revendedor.alcorriente@cared.mx',
    'Carlos Revendedor (Al Corriente)',
    passwordHash,
  );
  const resellerOverdue = await ensureReseller(
    tenant.id,
    'revendedor.mora@cared.mx',
    'Lucía Revendedora (Mora >30d)',
    passwordHash,
  );

  let clientB2C = await prisma.client.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'asc' },
  });
  if (!clientB2C) {
    clientB2C = await prisma.client.create({
      data: {
        tenantId: tenant.id,
        name: 'Sofía Villalobos (Testbed Crédito)',
        phone: '6441990001',
        email: 'sofia.credito@example.com',
      },
    });
  }

  // Ensure catalog pieces have stock, including the $3,000 example piece.
  await prisma.commerceProduct.updateMany({
    where: { tenantId: tenant.id, stockOnHand: { lt: 5 } },
    data: { stockOnHand: 5 },
  });

  const piece3000 = await prisma.commerceProduct.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: 'SLV-3000-TEST' } },
    update: { stockOnHand: 6, unitPrice: 3000, resellerPrice: 3000, status: 'ACTIVE', availableToResellers: true },
    create: {
      tenantId: tenant.id,
      sku: 'SLV-3000-TEST',
      name: 'Dije Conmemorativo Plata/Oro ($3,000)',
      category: 'Joyería',
      unitCost: 1600,
      unitPrice: 3000,
      resellerPrice: 3000,
      wholesalePrice: 2700,
      currency: 'MXN',
      stockOnHand: 6,
      availableToResellers: true,
    },
  });

  const now = new Date();

  // Scenario A: Reseller with coexisting Revolving ($50k limit, $12k used) + $3k Non-Revolving (30d)
  const accountA = await prisma.creditAccount.upsert({
    where: { tenantId_resellerId: { tenantId: tenant.id, resellerId: resellerCurrent.id } },
    update: {
      revolvingLimit: 50000,
      revolvingUsed: 12000,
      defaultTermDays: 30,
      status: CreditAccountStatus.ACTIVE,
    },
    create: {
      tenantId: tenant.id,
      subjectType: CreditSubjectType.RESELLER,
      resellerId: resellerCurrent.id,
      revolvingLimit: 50000,
      revolvingUsed: 12000,
      defaultTermDays: 30,
      status: CreditAccountStatus.ACTIVE,
      notes: 'Cama de pruebas: cuenta al corriente con coexistencia dual',
    },
  });

  const saleA = await prisma.commerceSale.upsert({
    where: {
      tenantId_salesChannel_resellerId_idempotencyKey: {
        tenantId: tenant.id,
        salesChannel: SalesChannel.RESELLER_POS,
        resellerId: resellerCurrent.id,
        idempotencyKey: 'testbed-sale-dual-a',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      resellerId: resellerCurrent.id,
      salesChannel: SalesChannel.RESELLER_POS,
      status: CommerceSaleStatus.PAID,
      paymentStatus: CommercePaymentStatus.PAID,
      currency: 'MXN',
      customerName: 'Boutique Norte',
      customerPhone: '6441112233',
      subtotalAmount: 15000,
      totalAmount: 15000,
      creditedAmount: 15000,
      idempotencyKey: 'testbed-sale-dual-a',
      paidAt: new Date(now.getTime() - 4 * MS_PER_DAY),
      notes: 'Orden mixta de prueba ($12,000 revolvente + $3,000 pieza no revolvente)',
      items: {
        create: [
          {
            productId: piece3000.id,
            skuSnapshot: piece3000.sku,
            nameSnapshot: piece3000.name,
            unitPrice: 3000,
            quantity: 5,
            lineTotal: 15000,
          },
        ],
      },
    },
  });

  const revOb = await prisma.creditObligation.upsert({
    where: { tenantId_idempotencyKey: { tenantId: tenant.id, idempotencyKey: 'testbed-ob-a-revolving' } },
    update: {},
    create: {
      tenantId: tenant.id,
      accountId: accountA.id,
      saleId: saleA.id,
      facilityType: CreditFacilityType.REVOLVING,
      title: 'Surtido Quincenal Revolvente',
      principalAmount: 12000,
      balanceDue: 12000,
      termDays: 30,
      issuedAt: new Date(now.getTime() - 4 * MS_PER_DAY),
      dueAt: new Date(now.getTime() + 26 * MS_PER_DAY),
      status: CreditObligationStatus.OPEN,
      idempotencyKey: 'testbed-ob-a-revolving',
      createdById: adminUser?.id ?? null,
    },
  });

  await prisma.creditObligation.upsert({
    where: { tenantId_idempotencyKey: { tenantId: tenant.id, idempotencyKey: 'testbed-ob-a-nonrev-3000' } },
    update: {},
    create: {
      tenantId: tenant.id,
      accountId: accountA.id,
      saleId: saleA.id,
      facilityType: CreditFacilityType.NON_REVOLVING,
      title: 'Dije Conmemorativo Plata/Oro ($3,000)',
      principalAmount: 3000,
      balanceDue: 3000,
      termDays: 30,
      issuedAt: new Date(now.getTime() - 4 * MS_PER_DAY),
      dueAt: new Date(now.getTime() + 26 * MS_PER_DAY),
      status: CreditObligationStatus.OPEN,
      idempotencyKey: 'testbed-ob-a-nonrev-3000',
      createdById: adminUser?.id ?? null,
    },
  });

  // Scenario B: Reseller with overdue (>30d) obligation triggering auto-block unless admin overrides
  const accountB = await prisma.creditAccount.upsert({
    where: { tenantId_resellerId: { tenantId: tenant.id, resellerId: resellerOverdue.id } },
    update: {
      revolvingLimit: 25000,
      revolvingUsed: 8000,
      status: CreditAccountStatus.ACTIVE,
    },
    create: {
      tenantId: tenant.id,
      subjectType: CreditSubjectType.RESELLER,
      resellerId: resellerOverdue.id,
      revolvingLimit: 25000,
      revolvingUsed: 8000,
      defaultTermDays: 30,
      status: CreditAccountStatus.ACTIVE,
      notes: 'Cama de pruebas: cuenta con saldo vencido (>30d)',
    },
  });

  await prisma.creditObligation.upsert({
    where: { tenantId_idempotencyKey: { tenantId: tenant.id, idempotencyKey: 'testbed-ob-b-overdue' } },
    update: {},
    create: {
      tenantId: tenant.id,
      accountId: accountB.id,
      facilityType: CreditFacilityType.REVOLVING,
      title: 'Factura Vencida (>30 días)',
      principalAmount: 8000,
      balanceDue: 8000,
      termDays: 30,
      issuedAt: new Date(now.getTime() - 36 * MS_PER_DAY),
      dueAt: new Date(now.getTime() - 6 * MS_PER_DAY),
      status: CreditObligationStatus.OVERDUE,
      idempotencyKey: 'testbed-ob-b-overdue',
      createdById: adminUser?.id ?? null,
    },
  });

  // Scenario C: B2C Client with $80k revolving limit + ready-to-settle PENDING_PAYMENT order ($3,000 piece)
  const accountC = await prisma.creditAccount.upsert({
    where: { tenantId_clientId: { tenantId: tenant.id, clientId: clientB2C.id } },
    update: {
      revolvingLimit: 80000,
      revolvingUsed: 15000,
      defaultTermDays: 30,
      status: CreditAccountStatus.ACTIVE,
    },
    create: {
      tenantId: tenant.id,
      subjectType: CreditSubjectType.CLIENT,
      clientId: clientB2C.id,
      revolvingLimit: 80000,
      revolvingUsed: 15000,
      defaultTermDays: 30,
      status: CreditAccountStatus.ACTIVE,
      notes: 'Cama de pruebas: cliente VIP con cupo disponible',
    },
  });

  await prisma.commerceSale.upsert({
    where: {
      tenantId_salesChannel_resellerId_idempotencyKey: {
        tenantId: tenant.id,
        salesChannel: SalesChannel.RESELLER_POS,
        resellerId: resellerCurrent.id,
        idempotencyKey: 'testbed-sale-pending-3000',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      resellerId: resellerCurrent.id,
      clientId: clientB2C.id,
      salesChannel: SalesChannel.RESELLER_POS,
      status: CommerceSaleStatus.PENDING_PAYMENT,
      paymentStatus: CommercePaymentStatus.PENDING,
      currency: 'MXN',
      customerName: clientB2C.name,
      customerPhone: clientB2C.phone,
      subtotalAmount: 3000,
      totalAmount: 3000,
      idempotencyKey: 'testbed-sale-pending-3000',
      notes: 'Orden lista en Caja Cared para probar Contado, Revolvente 30d, No Revolvente ($3,000) o Mixto',
      items: {
        create: [
          {
            productId: piece3000.id,
            skuSnapshot: piece3000.sku,
            nameSnapshot: piece3000.name,
            unitPrice: 3000,
            quantity: 1,
            lineTotal: 3000,
          },
        ],
      },
      reservations: {
        create: [
          {
            tenantId: tenant.id,
            productId: piece3000.id,
            resellerId: resellerCurrent.id,
            quantity: 1,
            status: InventoryReservationStatus.ACTIVE,
            expiresAt: new Date(now.getTime() + 30 * 60_000),
          },
        ],
      },
    },
  });

  const existingLedger = await prisma.creditLedgerEntry.count({
    where: { tenantId: tenant.id, accountId: accountA.id },
  });
  if (existingLedger === 0) {
    await prisma.creditLedgerEntry.create({
      data: {
        tenantId: tenant.id,
        accountId: accountA.id,
        obligationId: revOb.id,
        actorId: adminUser?.id ?? null,
        type: CreditLedgerEntryType.DRAWDOWN,
        facilityType: CreditFacilityType.REVOLVING,
        amount: 12000,
        balanceAfter: 12000,
        revolvingUsedAfter: 12000,
        notes: 'Asiento inicial cama de pruebas',
      },
    });
  }

  console.log('Cama de pruebas de Crédito Dual generada con éxito:');
  console.log(`- Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`- Escenario A (Al corriente + dual $12k rev / $3k no-rev): ${resellerCurrent.email}`);
  console.log(`- Escenario B (Mora >30d / bloqueo y override Admin): ${resellerOverdue.email}`);
  console.log(`- Escenario C (Cliente B2C + orden $3,000 por cobrar): ${clientB2C.name} (Cuenta ${accountC.id})`);
}

main()
  .catch((err) => {
    console.error('Error al generar la cama de pruebas:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
