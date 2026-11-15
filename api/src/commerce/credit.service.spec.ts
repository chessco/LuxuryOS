import 'reflect-metadata';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import {
  CreditAccountStatus,
  CreditFacilityType,
  CreditLedgerEntryType,
  CreditObligationStatus,
  CreditSubjectType,
  Role,
} from '@prisma/client';
import { CreditService } from './credit.service';

describe('CreditService Dual Credit Management (Revolving + Non-Revolving 30d)', () => {
  const tx = {
    user: { findFirst: jest.fn(), findMany: jest.fn() },
    client: { findFirst: jest.fn(), findMany: jest.fn() },
    creditAccount: {
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    creditObligation: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    creditPayment: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    creditLedgerEntry: {
      create: jest.fn(),
    },
    commerceSale: {
      updateMany: jest.fn(),
    },
    commerceAuditLog: {
      create: jest.fn(),
    },
  } as any;

  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  } as any;

  let service: CreditService;
  const adminActor = { id: 'admin-1', tenantId: 'tenant-1', role: Role.TENANT_ADMIN };
  const cashierActor = { id: 'seller-1', tenantId: 'tenant-1', role: Role.VENDEDOR };
  const resellerActor = { id: 'reseller-1', tenantId: 'tenant-1', role: Role.REVENDEDOR };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    tx.creditObligation.updateMany.mockResolvedValue({ count: 0 });
    tx.creditObligation.count.mockResolvedValue(0);
    tx.commerceSale.updateMany.mockResolvedValue({ count: 1 });
    service = new CreditService(prisma);
  });

  it('rejects non-admin users when setting revolving limits', async () => {
    await expect(
      service.upsertAccount(cashierActor, {
        subjectType: CreditSubjectType.CLIENT,
        clientId: 'client-1',
        revolvingLimit: 5000,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('configures a 30-day REVOLVING credit account for a reseller or client and logs ledger', async () => {
    tx.user.findFirst.mockResolvedValue({
      id: 'reseller-1',
      name: 'Carlos Revendedor',
      email: 'carlos@cared.mx',
      role: Role.REVENDEDOR,
    });
    tx.creditAccount.findFirst.mockResolvedValue(null);
    tx.creditAccount.create.mockResolvedValue({
      id: 'acc-1',
      tenantId: 'tenant-1',
      subjectType: CreditSubjectType.RESELLER,
      resellerId: 'reseller-1',
      clientId: null,
      revolvingLimit: 10000,
      revolvingUsed: 0,
      currency: 'MXN',
      defaultTermDays: 30,
      status: CreditAccountStatus.ACTIVE,
      notes: 'Línea base revendedor',
    });

    const summary = await service.upsertAccount(adminActor, {
      subjectType: CreditSubjectType.RESELLER,
      resellerId: 'reseller-1',
      revolvingLimit: 10000,
      defaultTermDays: 30,
      notes: 'Línea base revendedor',
    });

    expect(summary).toMatchObject({
      id: 'acc-1',
      subjectType: CreditSubjectType.RESELLER,
      revolvingLimit: 10000,
      revolvingUsed: 0,
      revolvingAvailable: 10000,
      defaultTermDays: 30,
      canDrawCredit: true,
      canDrawRevolving: true,
    });
    expect(tx.creditLedgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: CreditLedgerEntryType.LIMIT_UPDATED,
          amount: expect.anything(),
        }),
      }),
    );
  });

  it('rejects a limit reduction if a concurrent drawdown used the quota', async () => {
    tx.client.findFirst.mockResolvedValue({ id: 'client-1', name: 'Cliente' });
    tx.creditAccount.findFirst.mockResolvedValue({
      id: 'acc-1', tenantId: 'tenant-1', clientId: 'client-1',
      revolvingUsed: 0, revolvingLimit: 1000, status: CreditAccountStatus.ACTIVE,
      obligations: [],
    });
    tx.creditAccount.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.upsertAccount(adminActor, {
      subjectType: CreditSubjectType.CLIENT, clientId: 'client-1', revolvingLimit: 100,
    })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.creditAccount.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ revolvingUsed: expect.objectContaining({ lte: expect.anything() }) }),
    }));
  });

  it('allows REVOLVING and NON_REVOLVING ($3,000 piece at 30d) to coexist without NON_REVOLVING consuming revolving quota', async () => {
    tx.client.findFirst.mockResolvedValue({
      id: 'client-1',
      name: 'Sofía Villalobos',
      phone: '6441234567',
      email: 'sofia@mail.com',
    });
    tx.creditAccount.findFirst.mockResolvedValue({
      id: 'acc-client-1',
      tenantId: 'tenant-1',
      subjectType: CreditSubjectType.CLIENT,
      resellerId: null,
      clientId: 'client-1',
      revolvingLimit: 5000,
      revolvingUsed: 1000,
      currency: 'MXN',
      defaultTermDays: 30,
      status: CreditAccountStatus.ACTIVE,
    });
    tx.creditAccount.updateMany.mockResolvedValue({ count: 1 });
    let seq = 0;
    tx.creditObligation.create.mockImplementation(({ data }: any) => {
      seq += 1;
      return Promise.resolve({
        id: `obli-${seq}-0000`,
        ...data,
        principalAmount: Number(data.principalAmount),
        paidAmount: 0,
        balanceDue: Number(data.balanceDue),
        account: {
          subjectType: CreditSubjectType.CLIENT,
          clientId: 'client-1',
          client: { id: 'client-1', name: 'Sofía Villalobos', phone: '6441234567', email: 'sofia@mail.com' },
        },
        payments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    const created = await service.applySaleCreditDrawdownsInTx(tx, {
      tenantId: 'tenant-1',
      actorId: 'seller-1',
      actorRole: Role.VENDEDOR,
      saleId: 'sale1234-0000',
      saleHandoffCode: 'ORD-SALE1234',
      currency: 'MXN',
      subjectType: CreditSubjectType.CLIENT,
      clientId: 'client-1',
      drawdowns: [
        { facilityType: CreditFacilityType.REVOLVING, amount: 1500 },
        {
          facilityType: CreditFacilityType.NON_REVOLVING,
          amount: 3000,
          title: 'Anillo Solitario $3,000 (30d)',
        },
      ],
    });

    // Only the REVOLVING drawdown updates CreditAccount.revolvingUsed (1000 -> 2500)
    expect(tx.creditAccount.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.creditAccount.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { revolvingUsed: expect.anything() },
      }),
    );
    expect(Number(tx.creditAccount.updateMany.mock.calls[0][0].data.revolvingUsed)).toBe(2500);
    expect(created).toHaveLength(2);
    expect(created[0]).toMatchObject({ facilityType: CreditFacilityType.REVOLVING, principalAmount: 1500, termDays: 30 });
    expect(created[1]).toMatchObject({
      facilityType: CreditFacilityType.NON_REVOLVING,
      principalAmount: 3000,
      title: 'Anillo Solitario $3,000 (30d)',
      termDays: 30,
    });
  });

  it('restores revolving availability when paying REVOLVING obligation, but keeps revolvingUsed untouched when paying NON_REVOLVING', async () => {
    // 1) Pay REVOLVING obligation
    tx.creditPayment.findFirst.mockResolvedValue(null);
    tx.creditObligation.findFirst.mockResolvedValue({
      id: 'obli-rev-1',
      tenantId: 'tenant-1',
      accountId: 'acc-1',
      saleId: 'sale-rev-1',
      facilityType: CreditFacilityType.REVOLVING,
      principalAmount: 2000,
      paidAmount: 0,
      balanceDue: 2000,
      dueAt: new Date(Date.now() + 10 * 86_400_000),
      status: CreditObligationStatus.OPEN,
      account: { id: 'acc-1', revolvingUsed: 2500 },
      sale: { id: 'sale-rev-1', paidAmount: 0, creditedAmount: 2000 },
    });
    tx.creditObligation.updateMany.mockResolvedValue({ count: 1 });
    tx.creditPayment.create.mockResolvedValue({ id: 'cp-1' });
    tx.creditAccount.updateMany.mockResolvedValue({ count: 1 });
    tx.creditObligation.findFirstOrThrow.mockResolvedValue({
      id: 'obli-rev-1',
      tenantId: 'tenant-1',
      accountId: 'acc-1',
      saleId: 'sale-rev-1',
      facilityType: CreditFacilityType.REVOLVING,
      title: 'Revolvente 30d',
      currency: 'MXN',
      principalAmount: 2000,
      paidAmount: 1200,
      balanceDue: 800,
      termDays: 30,
      issuedAt: new Date(),
      dueAt: new Date(Date.now() + 10 * 86_400_000),
      status: CreditObligationStatus.PARTIAL,
      account: { subjectType: CreditSubjectType.RESELLER, resellerId: 'reseller-1', reseller: { name: 'Ana', email: 'ana@cared.mx' } },
      payments: [{ id: 'cp-1', amount: 1200, method: 'Transferencia', recordedAt: new Date() }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const revPayResult = await service.recordObligationPayment(
      cashierActor,
      'obli-rev-1',
      { amount: 1200, method: 'Transferencia', reference: 'SPEI-1' },
      'pay-rev-1',
    );
    expect(Number(tx.creditAccount.updateMany.mock.calls[0][0].data.revolvingUsed)).toBe(1300);
    expect(revPayResult.obligation.balanceDue).toBe(800);

    // 2) Pay NON_REVOLVING obligation ($3,000) -> does NOT modify revolvingUsed
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    tx.creditPayment.findFirst.mockResolvedValue(null);
    tx.creditObligation.findFirst.mockResolvedValue({
      id: 'obli-nonrev-1',
      tenantId: 'tenant-1',
      accountId: 'acc-1',
      saleId: 'sale-nonrev-1',
      facilityType: CreditFacilityType.NON_REVOLVING,
      principalAmount: 3000,
      paidAmount: 0,
      balanceDue: 3000,
      dueAt: new Date(Date.now() + 20 * 86_400_000),
      status: CreditObligationStatus.OPEN,
      account: { id: 'acc-1', revolvingUsed: 1300 },
      sale: { id: 'sale-nonrev-1', paidAmount: 0, creditedAmount: 3000 },
    });
    tx.creditObligation.updateMany.mockResolvedValue({ count: 1 });
    tx.creditPayment.create.mockResolvedValue({ id: 'cp-2' });
    tx.creditObligation.findFirstOrThrow.mockResolvedValue({
      id: 'obli-nonrev-1',
      tenantId: 'tenant-1',
      accountId: 'acc-1',
      saleId: 'sale-nonrev-1',
      facilityType: CreditFacilityType.NON_REVOLVING,
      title: 'Pieza $3,000',
      currency: 'MXN',
      principalAmount: 3000,
      paidAmount: 3000,
      balanceDue: 0,
      termDays: 30,
      issuedAt: new Date(),
      dueAt: new Date(Date.now() + 20 * 86_400_000),
      paidAt: new Date(),
      status: CreditObligationStatus.PAID,
      account: { subjectType: CreditSubjectType.RESELLER, resellerId: 'reseller-1', reseller: { name: 'Ana', email: 'ana@cared.mx' } },
      payments: [{ id: 'cp-2', amount: 3000, method: 'Efectivo', recordedAt: new Date() }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const nonRevResult = await service.recordObligationPayment(
      cashierActor,
      'obli-nonrev-1',
      { amount: 3000, method: 'Efectivo' },
      'pay-nonrev-1',
    );
    expect(tx.creditAccount.updateMany).not.toHaveBeenCalled();
    expect(nonRevResult.obligation.status).toBe(CreditObligationStatus.PAID);
    expect(nonRevResult.obligation.balanceDue).toBe(0);
  });

  it('rejects an abono if another abono changed the sale totals', async () => {
    tx.creditPayment.findFirst.mockResolvedValue(null);
    tx.creditObligation.findFirst.mockResolvedValue({
      id: 'obli-1', tenantId: 'tenant-1', accountId: 'acc-1', saleId: 'sale-1',
      facilityType: CreditFacilityType.NON_REVOLVING, paidAmount: 0, balanceDue: 100,
      dueAt: new Date(Date.now() + 86_400_000), status: CreditObligationStatus.OPEN,
      account: { id: 'acc-1', revolvingUsed: 0 },
      sale: { id: 'sale-1', paidAmount: 0, creditedAmount: 100 },
    });
    tx.creditObligation.updateMany.mockResolvedValue({ count: 1 });
    tx.creditPayment.create.mockResolvedValue({ id: 'payment-1' });
    tx.commerceSale.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.recordObligationPayment(
      cashierActor, 'obli-1', { amount: 50, method: 'Efectivo' }, 'abono-1',
    )).rejects.toBeInstanceOf(ConflictException);
    expect(tx.commerceSale.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ paidAmount: 0, creditedAmount: 100 }),
    }));
  });

  it('rejects reuse of an abono key for another obligation', async () => {
    tx.creditPayment.findFirst.mockResolvedValue({ id: 'payment-1', obligationId: 'obli-1' });
    await expect(service.recordObligationPayment(
      cashierActor, 'obli-2', { amount: 50, method: 'Efectivo' }, 'abono-1',
    )).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks new credit when overdue (>30d) obligations exist unless overridden by Admin', async () => {
    tx.user.findFirst.mockResolvedValue({
      id: 'reseller-1',
      name: 'Ana',
      email: 'ana@cared.mx',
      role: Role.REVENDEDOR,
    });
    tx.creditAccount.findFirst.mockResolvedValue({
      id: 'acc-1',
      tenantId: 'tenant-1',
      subjectType: CreditSubjectType.RESELLER,
      resellerId: 'reseller-1',
      revolvingLimit: 10000,
      revolvingUsed: 3000,
      currency: 'MXN',
      defaultTermDays: 30,
      status: CreditAccountStatus.ACTIVE,
    });
    tx.creditObligation.count.mockResolvedValue(1);

    await expect(
      service.applySaleCreditDrawdownsInTx(tx, {
        tenantId: 'tenant-1',
        actorId: 'seller-1',
        actorRole: Role.VENDEDOR,
        saleId: 'sale-overdue-1',
        saleHandoffCode: 'ORD-OVERDUE',
        currency: 'MXN',
        subjectType: CreditSubjectType.RESELLER,
        resellerId: 'reseller-1',
        drawdowns: [{ facilityType: CreditFacilityType.NON_REVOLVING, amount: 3000 }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    // Non-admin cannot override overdue block
    await expect(
      service.applySaleCreditDrawdownsInTx(tx, {
        tenantId: 'tenant-1',
        actorId: 'seller-1',
        actorRole: Role.VENDEDOR,
        saleId: 'sale-overdue-1',
        saleHandoffCode: 'ORD-OVERDUE',
        currency: 'MXN',
        subjectType: CreditSubjectType.RESELLER,
        resellerId: 'reseller-1',
        drawdowns: [{ facilityType: CreditFacilityType.NON_REVOLVING, amount: 3000 }],
        allowOverdueOverride: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    // Admin CAN override overdue block with audit log
    tx.creditObligation.create.mockResolvedValue({
      id: 'obli-override-1',
      tenantId: 'tenant-1',
      accountId: 'acc-1',
      saleId: 'sale-overdue-1',
      facilityType: CreditFacilityType.NON_REVOLVING,
      title: 'Pieza autorizada',
      currency: 'MXN',
      principalAmount: 3000,
      paidAmount: 0,
      balanceDue: 3000,
      termDays: 30,
      issuedAt: new Date(),
      dueAt: new Date(Date.now() + 30 * 86_400_000),
      status: CreditObligationStatus.OPEN,
      account: { subjectType: CreditSubjectType.RESELLER, resellerId: 'reseller-1', reseller: { name: 'Ana', email: 'ana@cared.mx' } },
      payments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const overridden = await service.applySaleCreditDrawdownsInTx(tx, {
      tenantId: 'tenant-1',
      actorId: 'admin-1',
      actorRole: Role.TENANT_ADMIN,
      saleId: 'sale-overdue-1',
      saleHandoffCode: 'ORD-OVERDUE',
      currency: 'MXN',
      subjectType: CreditSubjectType.RESELLER,
      resellerId: 'reseller-1',
      drawdowns: [{ facilityType: CreditFacilityType.NON_REVOLVING, amount: 3000, title: 'Pieza autorizada' }],
      allowOverdueOverride: true,
    });
    expect(overridden).toHaveLength(1);
    expect(tx.commerceAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'CREDIT_OVERDUE_OVERRIDE' }),
      }),
    );
  });

  it('scopes reseller credit lookup to the authenticated reseller', async () => {
    tx.user.findFirst.mockResolvedValue({ id: 'reseller-1', name: 'María', email: 'maria@cared.mx' });
    tx.creditAccount.findFirst.mockResolvedValue(null);

    const credit = await service.getResellerCredit(resellerActor);
    expect(tx.creditAccount.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', resellerId: 'reseller-1' },
    });
    expect(credit.account.subjectType).toBe(CreditSubjectType.RESELLER);
    expect(credit.revolvingObligations).toEqual([]);
    expect(credit.nonRevolvingObligations).toEqual([]);
  });

  it('rejects REVOLVING drawdown when exceeding revolvingAvailable while allowing NON_REVOLVING to remain independent', async () => {
    tx.client.findFirst.mockResolvedValue({
      id: 'client-1',
      name: 'Sofía Villalobos',
      phone: '6441234567',
      email: 'sofia@mail.com',
    });
    tx.creditAccount.findFirst.mockResolvedValue({
      id: 'acc-client-1',
      tenantId: 'tenant-1',
      subjectType: CreditSubjectType.CLIENT,
      clientId: 'client-1',
      revolvingLimit: 5000,
      revolvingUsed: 4200,
      currency: 'MXN',
      defaultTermDays: 30,
      status: CreditAccountStatus.ACTIVE,
    });

    await expect(
      service.applySaleCreditDrawdownsInTx(tx, {
        tenantId: 'tenant-1',
        actorId: 'seller-1',
        actorRole: Role.VENDEDOR,
        saleId: 'sale-rev-over',
        saleHandoffCode: 'ORD-REVOVER',
        currency: 'MXN',
        subjectType: CreditSubjectType.CLIENT,
        clientId: 'client-1',
        drawdowns: [{ facilityType: CreditFacilityType.REVOLVING, amount: 1500 }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks all new drawdowns when CreditAccount is SUSPENDED', async () => {
    tx.user.findFirst.mockResolvedValue({
      id: 'reseller-1',
      name: 'Ana',
      email: 'ana@cared.mx',
      role: Role.REVENDEDOR,
    });
    tx.creditAccount.findFirst.mockResolvedValue({
      id: 'acc-1',
      tenantId: 'tenant-1',
      subjectType: CreditSubjectType.RESELLER,
      resellerId: 'reseller-1',
      revolvingLimit: 10000,
      revolvingUsed: 0,
      currency: 'MXN',
      defaultTermDays: 30,
      status: CreditAccountStatus.SUSPENDED,
    });

    await expect(
      service.applySaleCreditDrawdownsInTx(tx, {
        tenantId: 'tenant-1',
        actorId: 'admin-1',
        actorRole: Role.TENANT_ADMIN,
        saleId: 'sale-suspended',
        saleHandoffCode: 'ORD-SUSP',
        currency: 'MXN',
        subjectType: CreditSubjectType.RESELLER,
        resellerId: 'reseller-1',
        drawdowns: [{ facilityType: CreditFacilityType.NON_REVOLVING, amount: 3000 }],
        allowOverdueOverride: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('replays obligation payment idempotently and rejects overpayments above balanceDue', async () => {
    tx.creditPayment.findFirst.mockResolvedValueOnce({
      id: 'cp-existing',
      obligationId: 'obli-rev-1',
    });
    tx.creditObligation.findFirstOrThrow.mockResolvedValueOnce({
      id: 'obli-rev-1',
      tenantId: 'tenant-1',
      accountId: 'acc-1',
      saleId: 'sale-1',
      facilityType: CreditFacilityType.REVOLVING,
      title: 'Revolvente 30d',
      currency: 'MXN',
      principalAmount: 2000,
      paidAmount: 1200,
      balanceDue: 800,
      termDays: 30,
      issuedAt: new Date(),
      dueAt: new Date(Date.now() + 10 * 86_400_000),
      status: CreditObligationStatus.PARTIAL,
      account: { subjectType: CreditSubjectType.RESELLER, resellerId: 'reseller-1', reseller: { name: 'Ana', email: 'ana@cared.mx' } },
      payments: [{ id: 'cp-existing', amount: 1200, method: 'Efectivo', recordedAt: new Date() }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const replay = await service.recordObligationPayment(
      cashierActor,
      'obli-rev-1',
      { amount: 1200, method: 'Efectivo' },
      'idem-repeat',
    );
    expect(replay.replayed).toBe(true);
    expect(tx.creditPayment.create).not.toHaveBeenCalled();

    tx.creditPayment.findFirst.mockResolvedValueOnce(null);
    tx.creditObligation.findFirst.mockResolvedValueOnce({
      id: 'obli-rev-1',
      tenantId: 'tenant-1',
      accountId: 'acc-1',
      saleId: 'sale-1',
      facilityType: CreditFacilityType.NON_REVOLVING,
      principalAmount: 3000,
      paidAmount: 0,
      balanceDue: 800,
      dueAt: new Date(Date.now() + 10 * 86_400_000),
      status: CreditObligationStatus.PARTIAL,
      account: { id: 'acc-1', revolvingUsed: 0 },
      sale: { id: 'sale-1', paidAmount: 0, creditedAmount: 3000 },
    });

    await expect(
      service.recordObligationPayment(
        cashierActor,
        'obli-rev-1',
        { amount: 900, method: 'Efectivo' },
        'idem-overpay',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('aggregates portfolio summary KPIs accurately across REVOLVING and NON_REVOLVING lines', async () => {
    const now = Date.now();
    tx.creditObligation.findMany.mockResolvedValue([
      {
        id: 'ob-1',
        tenantId: 'tenant-1',
        accountId: 'acc-1',
        saleId: 'sale-1',
        facilityType: CreditFacilityType.REVOLVING,
        title: 'Cargo revolvente',
        currency: 'MXN',
        principalAmount: 4000,
        paidAmount: 0,
        balanceDue: 4000,
        termDays: 30,
        issuedAt: new Date(now - 5 * 86_400_000),
        dueAt: new Date(now + 25 * 86_400_000),
        status: CreditObligationStatus.OPEN,
        account: { subjectType: CreditSubjectType.RESELLER, resellerId: 'r-1', reseller: { name: 'Carlos', email: 'c@cared.mx' } },
        payments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'ob-2',
        tenantId: 'tenant-1',
        accountId: 'acc-1',
        saleId: 'sale-2',
        facilityType: CreditFacilityType.NON_REVOLVING,
        title: 'Pieza $3,000',
        currency: 'MXN',
        principalAmount: 3000,
        paidAmount: 0,
        balanceDue: 3000,
        termDays: 30,
        issuedAt: new Date(now - 35 * 86_400_000),
        dueAt: new Date(now - 5 * 86_400_000),
        status: CreditObligationStatus.OVERDUE,
        account: { subjectType: CreditSubjectType.RESELLER, resellerId: 'r-1', reseller: { name: 'Carlos', email: 'c@cared.mx' } },
        payments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    tx.creditAccount.findMany.mockResolvedValue([
      { revolvingLimit: 10000, revolvingUsed: 4000, status: CreditAccountStatus.ACTIVE },
    ]);

    const portfolio = await service.listObligations(cashierActor);
    expect(portfolio.summary).toEqual({
      totalRevolvingLimit: 10000,
      totalRevolvingUsed: 4000,
      totalRevolvingAvailable: 6000,
      totalNonRevolvingBalance: 3000,
      totalOverdueBalance: 3000,
      overdueCount: 1,
      openCount: 2,
    });
  });
});
