import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommerceSaleStatus,
  CreditAccountStatus,
  CreditFacilityType,
  CreditLedgerEntryType,
  CreditObligationStatus,
  CreditSubjectType,
  Prisma,
  Role,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreditDrawdownDto,
  RecordCreditPaymentDto,
  UpsertCreditAccountDto,
} from './dto/commerce-credit.dto';

type Actor = { id?: string; sub?: string; tenantId?: string; role?: Role };

const MS_PER_DAY = 86_400_000;

export function roundMoney(value: unknown): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100) / 100;
}

@Injectable()
export class CreditService {
  constructor(private readonly prisma: PrismaService) {}

  private salesActor(actor: Actor) {
    const id = actor?.id || actor?.sub;
    const allowed: Role[] = [Role.VENDEDOR, Role.TENANT_ADMIN, Role.SYSTEM_ADMIN];
    if (!id || !actor?.tenantId || !actor?.role || !allowed.includes(actor.role)) {
      throw new ForbiddenException('No autorizado para gestionar cartera y crédito POS');
    }
    return { id, tenantId: actor.tenantId, role: actor.role };
  }

  private adminActor(actor: Actor) {
    const id = actor?.id || actor?.sub;
    if (
      !id ||
      !actor?.tenantId ||
      (actor.role !== Role.TENANT_ADMIN && actor.role !== Role.SYSTEM_ADMIN)
    ) {
      throw new ForbiddenException('Sólo administradores pueden configurar límites de crédito');
    }
    return { id, tenantId: actor.tenantId, role: actor.role };
  }

  private resellerPortalActor(actor: Actor) {
    const id = actor?.id || actor?.sub;
    const allowed: Role[] = [Role.REVENDEDOR, Role.TENANT_ADMIN, Role.SYSTEM_ADMIN];
    if (!id || !actor?.tenantId || !actor?.role || !allowed.includes(actor.role)) {
      throw new ForbiddenException('Sesión de revendedor inválida');
    }
    return { id, tenantId: actor.tenantId, role: actor.role };
  }

  formatObligationCode(obligationId: string) {
    return `CRD-${obligationId.slice(0, 8).toUpperCase()}`;
  }

  private formatHandoffCode(saleId?: string | null) {
    return saleId ? `ORD-${saleId.slice(0, 8).toUpperCase()}` : null;
  }

  private computeDaysRemaining(dueAt: Date, status: CreditObligationStatus, balanceDue: number) {
    if (status === CreditObligationStatus.PAID || status === CreditObligationStatus.CANCELLED || balanceDue <= 0) {
      return 0;
    }
    return Math.ceil((new Date(dueAt).getTime() - Date.now()) / MS_PER_DAY);
  }

  private readonly obligationInclude = {
    account: {
      include: {
        reseller: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, phone: true, email: true } },
      },
    },
    sale: {
      select: {
        id: true,
        salesChannel: true,
        totalAmount: true,
        paidAmount: true,
        creditedAmount: true,
        customerName: true,
        customerPhone: true,
        createdAt: true,
      },
    },
    payments: {
      orderBy: { recordedAt: 'desc' as const },
      include: { recordedBy: { select: { id: true, name: true, email: true } } },
    },
    createdBy: { select: { id: true, name: true, email: true } },
  };

  private toAccountSummaryResponse(
    account: {
      id?: string | null;
      tenantId: string;
      subjectType: CreditSubjectType;
      resellerId?: string | null;
      clientId?: string | null;
      subjectName?: string | null;
      subjectPhone?: string | null;
      subjectEmail?: string | null;
      revolvingLimit: unknown;
      revolvingUsed: unknown;
      currency: string;
      defaultTermDays: number;
      status: CreditAccountStatus;
      notes?: string | null;
    },
    obligations: Array<{
      id: string;
      facilityType: CreditFacilityType;
      status: CreditObligationStatus;
      balanceDue: unknown;
      dueAt: Date;
      principalAmount: unknown;
      paidAmount: unknown;
      title: string;
      issuedAt: Date;
      saleId?: string | null;
      termDays: number;
    }>,
  ) {
    const revolvingLimit = roundMoney(account.revolvingLimit);
    const revolvingUsed = roundMoney(account.revolvingUsed);
    const revolvingAvailable = Math.max(0, roundMoney(revolvingLimit - revolvingUsed));

    const activeNonRevolving = obligations.filter(
      (item) =>
        item.facilityType === CreditFacilityType.NON_REVOLVING &&
        item.status !== CreditObligationStatus.PAID &&
        item.status !== CreditObligationStatus.CANCELLED &&
        roundMoney(item.balanceDue) > 0,
    );
    const now = Date.now();
    const overdueItems = obligations.filter(
      (item) =>
        item.status !== CreditObligationStatus.PAID &&
        item.status !== CreditObligationStatus.CANCELLED &&
        roundMoney(item.balanceDue) > 0 &&
        (item.status === CreditObligationStatus.OVERDUE || new Date(item.dueAt).getTime() <= now),
    );
    const overdueAmount = roundMoney(
      overdueItems.reduce((sum, item) => sum + roundMoney(item.balanceDue), 0),
    );
    const activeNonRevolvingTotal = roundMoney(
      activeNonRevolving.reduce((sum, item) => sum + roundMoney(item.balanceDue), 0),
    );

    let blockReason: string | null = null;
    if (account.status === CreditAccountStatus.SUSPENDED) {
      blockReason = 'La cuenta de crédito del sujeto está suspendida.';
    } else if (overdueItems.length > 0) {
      blockReason = `Bloqueado por ${overdueItems.length} ${overdueItems.length === 1 ? 'saldo vencido' : 'saldos vencidos'} (>30 días) por ${overdueAmount.toFixed(2)} ${account.currency}.`;
    }

    return {
      id: account.id ?? null,
      tenantId: account.tenantId,
      subjectType: account.subjectType,
      resellerId: account.resellerId ?? null,
      clientId: account.clientId ?? null,
      subjectName: account.subjectName ?? null,
      subjectPhone: account.subjectPhone ?? null,
      subjectEmail: account.subjectEmail ?? null,
      revolvingLimit,
      revolvingUsed,
      revolvingAvailable,
      activeNonRevolvingCount: activeNonRevolving.length,
      activeNonRevolvingTotal,
      overdueCount: overdueItems.length,
      overdueAmount,
      currency: account.currency || 'MXN',
      defaultTermDays: account.defaultTermDays || 30,
      status: account.status,
      notes: account.notes ?? null,
      canDrawCredit: blockReason === null,
      canDrawRevolving: blockReason === null && revolvingAvailable > 0,
      blockReason,
    };
  }

  private toObligationResponse(obligation: any) {
    const principalAmount = roundMoney(obligation.principalAmount);
    const paidAmount = roundMoney(obligation.paidAmount);
    const balanceDue = roundMoney(obligation.balanceDue);
    const daysRemaining = this.computeDaysRemaining(obligation.dueAt, obligation.status, balanceDue);
    const subjectType = obligation.account?.subjectType ?? CreditSubjectType.CLIENT;
    const subjectName =
      subjectType === CreditSubjectType.RESELLER
        ? obligation.account?.reseller?.name || obligation.account?.reseller?.email || 'Revendedor'
        : obligation.account?.client?.name || obligation.sale?.customerName || 'Cliente';
    const subjectPhone =
      subjectType === CreditSubjectType.RESELLER
        ? null
        : obligation.account?.client?.phone || obligation.sale?.customerPhone || null;
    const subjectEmail =
      subjectType === CreditSubjectType.RESELLER
        ? obligation.account?.reseller?.email || null
        : obligation.account?.client?.email || null;

    return {
      id: obligation.id,
      code: this.formatObligationCode(obligation.id),
      tenantId: obligation.tenantId,
      accountId: obligation.accountId,
      subjectType,
      resellerId: obligation.account?.resellerId ?? null,
      clientId: obligation.account?.clientId ?? null,
      subjectName,
      subjectPhone,
      subjectEmail,
      saleId: obligation.saleId ?? null,
      saleHandoffCode: this.formatHandoffCode(obligation.saleId),
      facilityType: obligation.facilityType,
      title: obligation.title,
      currency: obligation.currency || 'MXN',
      principalAmount,
      paidAmount,
      balanceDue,
      termDays: obligation.termDays,
      issuedAt: obligation.issuedAt,
      dueAt: obligation.dueAt,
      paidAt: obligation.paidAt ?? null,
      status: obligation.status,
      daysRemaining,
      isOverdue:
        balanceDue > 0 &&
        obligation.status !== CreditObligationStatus.PAID &&
        obligation.status !== CreditObligationStatus.CANCELLED &&
        (obligation.status === CreditObligationStatus.OVERDUE || daysRemaining <= 0),
      notes: obligation.notes ?? null,
      createdByName: obligation.createdBy?.name || obligation.createdBy?.email || null,
      createdAt: obligation.createdAt,
      updatedAt: obligation.updatedAt,
      payments: Array.isArray(obligation.payments)
        ? obligation.payments.map((payment: any) => ({
            id: payment.id,
            obligationId: payment.obligationId,
            amount: roundMoney(payment.amount),
            method: payment.method,
            reference: payment.reference ?? null,
            notes: payment.notes ?? null,
            recordedById: payment.recordedById ?? null,
            recordedByName: payment.recordedBy?.name || payment.recordedBy?.email || null,
            recordedAt: payment.recordedAt,
          }))
        : [],
    };
  }

  async syncOverdueObligationsInTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    accountId?: string,
  ) {
    if (!tx.creditObligation?.updateMany) return;
    await tx.creditObligation.updateMany({
      where: {
        tenantId,
        ...(accountId ? { accountId } : {}),
        status: { in: [CreditObligationStatus.OPEN, CreditObligationStatus.PARTIAL] },
        balanceDue: { gt: 0 },
        dueAt: { lte: new Date() },
      },
      data: { status: CreditObligationStatus.OVERDUE },
    });
  }

  private async resolveSubjectInTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    subjectType: CreditSubjectType,
    resellerId?: string,
    clientId?: string,
  ) {
    if (subjectType === CreditSubjectType.RESELLER) {
      const targetId = String(resellerId || '').trim();
      if (!targetId) throw new BadRequestException('resellerId es obligatorio para crédito de revendedor');
      const user = await tx.user.findFirst({
        where: { id: targetId, tenantId },
        select: { id: true, name: true, email: true, role: true },
      });
      if (!user) throw new NotFoundException('Revendedor no encontrado en esta organización');
      return {
        subjectType,
        resellerId: user.id,
        clientId: null as string | null,
        subjectName: user.name || user.email,
        subjectPhone: null as string | null,
        subjectEmail: user.email,
      };
    }

    const targetId = String(clientId || '').trim();
    if (!targetId) throw new BadRequestException('clientId es obligatorio para crédito a cliente');
    const client = await tx.client.findFirst({
      where: { id: targetId, tenantId },
      select: { id: true, name: true, phone: true, email: true },
    });
    if (!client) throw new NotFoundException('Cliente no encontrado en esta organización');
    return {
      subjectType,
      resellerId: null as string | null,
      clientId: client.id,
      subjectName: client.name,
      subjectPhone: client.phone ?? null,
      subjectEmail: client.email ?? null,
    };
  }

  async getSubjectSummary(
    actor: Actor,
    query: { resellerId?: string; clientId?: string },
  ) {
    const { tenantId } = this.salesActor(actor);
    const resellerId = String(query.resellerId || '').trim();
    const clientId = String(query.clientId || '').trim();
    if ((!resellerId && !clientId) || (resellerId && clientId)) {
      throw new BadRequestException('Especifica resellerId o clientId para consultar su línea de crédito');
    }

    const subjectType = resellerId ? CreditSubjectType.RESELLER : CreditSubjectType.CLIENT;

    return this.prisma.$transaction(async (tx) => {
      const subject = await this.resolveSubjectInTx(tx, tenantId, subjectType, resellerId, clientId);
      const account = await tx.creditAccount.findFirst({
        where: {
          tenantId,
          ...(resellerId ? { resellerId } : { clientId }),
        },
      });

      if (!account) {
        return {
          ...this.toAccountSummaryResponse(
            {
              tenantId,
              subjectType,
              resellerId: subject.resellerId,
              clientId: subject.clientId,
              subjectName: subject.subjectName,
              subjectPhone: subject.subjectPhone,
              subjectEmail: subject.subjectEmail,
              revolvingLimit: 0,
              revolvingUsed: 0,
              currency: 'MXN',
              defaultTermDays: 30,
              status: CreditAccountStatus.ACTIVE,
              notes: null,
            },
            [],
          ),
          obligations: [],
        };
      }

      await this.syncOverdueObligationsInTx(tx, tenantId, account.id);
      const obligations = await tx.creditObligation.findMany({
        where: { accountId: account.id, tenantId },
        orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
        include: this.obligationInclude,
      });

      return {
        ...this.toAccountSummaryResponse(
          {
            ...account,
            subjectName: subject.subjectName,
            subjectPhone: subject.subjectPhone,
            subjectEmail: subject.subjectEmail,
          },
          obligations,
        ),
        obligations: obligations.map((item) => this.toObligationResponse(item)),
      };
    });
  }

  async listAccounts(
    actor: Actor,
    filters?: {
      subjectType?: CreditSubjectType;
      q?: string;
      onlyOverdue?: boolean;
    },
  ) {
    const { tenantId } = this.salesActor(actor);

    const { accounts, resellers, clients } = await this.prisma.$transaction(async (tx) => {
      await this.syncOverdueObligationsInTx(tx, tenantId);
      const [foundAccounts, foundResellers, foundClients] = await Promise.all([
        tx.creditAccount.findMany({
          where: {
            tenantId,
            ...(filters?.subjectType ? { subjectType: filters.subjectType } : {}),
          },
          include: {
            reseller: { select: { id: true, name: true, email: true } },
            client: { select: { id: true, name: true, phone: true, email: true } },
            obligations: {
              where: { status: { notIn: [CreditObligationStatus.CANCELLED] } },
              orderBy: { dueAt: 'asc' },
            },
          },
          orderBy: [{ updatedAt: 'desc' }],
        }),
        tx.user.findMany({
          where: { tenantId, role: Role.REVENDEDOR },
          select: { id: true, name: true, email: true },
          orderBy: { name: 'asc' },
        }),
        tx.client.findMany({
          where: { tenantId },
          select: { id: true, name: true, phone: true, email: true },
          orderBy: { name: 'asc' },
        }),
      ]);
      return {
        accounts: foundAccounts,
        resellers: foundResellers,
        clients: foundClients,
      };
    });

    const mapped = accounts.map((account) => {
      const subjectName =
        account.subjectType === CreditSubjectType.RESELLER
          ? account.reseller?.name || account.reseller?.email || 'Revendedor'
          : account.client?.name || 'Cliente';
      const subjectPhone =
        account.subjectType === CreditSubjectType.RESELLER ? null : account.client?.phone ?? null;
      const subjectEmail =
        account.subjectType === CreditSubjectType.RESELLER
          ? account.reseller?.email ?? null
          : account.client?.email ?? null;
      return this.toAccountSummaryResponse(
        { ...account, subjectName, subjectPhone, subjectEmail },
        account.obligations,
      );
    });

    const needle = (filters?.q || '').trim().toLowerCase();
    const filtered = mapped.filter((item) => {
      if (filters?.onlyOverdue && item.overdueCount === 0) return false;
      if (!needle) return true;
      return [item.subjectName, item.subjectPhone, item.subjectEmail, item.notes].some((value) =>
        String(value || '').toLowerCase().includes(needle),
      );
    });

    return {
      items: filtered,
      subjects: {
        resellers: resellers.map((r) => ({ id: r.id, name: r.name || r.email, email: r.email })),
        clients,
      },
    };
  }

  async upsertAccount(actor: Actor, input: UpsertCreditAccountDto) {
    const session = this.adminActor(actor);
    const revolvingLimit = roundMoney(input.revolvingLimit);
    if (!Number.isFinite(revolvingLimit) || revolvingLimit < 0) {
      throw new BadRequestException('El límite revolvente debe ser mayor o igual a 0');
    }
    const defaultTermDays = input.defaultTermDays ?? 30;

    return this.prisma.$transaction(async (tx) => {
      const subject = await this.resolveSubjectInTx(
        tx,
        session.tenantId,
        input.subjectType,
        input.resellerId,
        input.clientId,
      );

      const existing = await tx.creditAccount.findFirst({
        where: {
          tenantId: session.tenantId,
          ...(subject.resellerId
            ? { resellerId: subject.resellerId }
            : { clientId: subject.clientId! }),
        },
        include: { obligations: true },
      });

      if (existing) {
        const currentUsed = roundMoney(existing.revolvingUsed);
        if (revolvingLimit < currentUsed) {
          throw new ConflictException(
            `El límite revolvente (${revolvingLimit.toFixed(2)}) no puede ser menor al cupo actualmente utilizado (${currentUsed.toFixed(2)}).`,
          );
        }

        const claim = await tx.creditAccount.updateMany({
          where: {
            id: existing.id,
            tenantId: session.tenantId,
            revolvingUsed: { lte: new Prisma.Decimal(revolvingLimit) },
          },
          data: {
            revolvingLimit: new Prisma.Decimal(revolvingLimit),
            defaultTermDays,
            status: input.status ?? existing.status,
            notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
          },
        });
        if (claim.count !== 1) {
          throw new ConflictException('El cupo utilizado cambiÃ³; vuelve a intentar actualizar el lÃ­mite');
        }
        const updated = await tx.creditAccount.findFirstOrThrow({
          where: { id: existing.id, tenantId: session.tenantId },
          include: { obligations: true },
        });

        await tx.creditLedgerEntry.create({
          data: {
            tenantId: session.tenantId,
            accountId: updated.id,
            actorId: session.id,
            type: CreditLedgerEntryType.LIMIT_UPDATED,
            facilityType: CreditFacilityType.REVOLVING,
            amount: new Prisma.Decimal(revolvingLimit),
            balanceAfter: new Prisma.Decimal(revolvingLimit),
            revolvingUsedAfter: updated.revolvingUsed,
            notes: input.notes?.trim() || `Límite revolvente actualizado a ${revolvingLimit.toFixed(2)} (${defaultTermDays}d)`,
          },
        });

        await tx.commerceAuditLog.create({
          data: {
            tenantId: session.tenantId,
            actorId: session.id,
            entityType: 'CREDIT_ACCOUNT',
            entityId: updated.id,
            action: 'CREDIT_LIMIT_UPDATED',
            payload: {
              subjectType: subject.subjectType,
              subjectName: subject.subjectName,
              revolvingLimit,
              defaultTermDays,
              status: updated.status,
            },
          },
        });

        return this.toAccountSummaryResponse(
          {
            ...updated,
            subjectName: subject.subjectName,
            subjectPhone: subject.subjectPhone,
            subjectEmail: subject.subjectEmail,
          },
          updated.obligations,
        );
      }

      const created = await tx.creditAccount.create({
        data: {
          tenantId: session.tenantId,
          subjectType: subject.subjectType,
          resellerId: subject.resellerId,
          clientId: subject.clientId,
          revolvingLimit: new Prisma.Decimal(revolvingLimit),
          revolvingUsed: new Prisma.Decimal(0),
          currency: 'MXN',
          defaultTermDays,
          status: input.status ?? CreditAccountStatus.ACTIVE,
          notes: input.notes?.trim() || null,
        },
      });

      await tx.creditLedgerEntry.create({
        data: {
          tenantId: session.tenantId,
          accountId: created.id,
          actorId: session.id,
          type: CreditLedgerEntryType.LIMIT_UPDATED,
          facilityType: CreditFacilityType.REVOLVING,
          amount: new Prisma.Decimal(revolvingLimit),
          balanceAfter: new Prisma.Decimal(revolvingLimit),
          revolvingUsedAfter: new Prisma.Decimal(0),
          notes: input.notes?.trim() || `Apertura de línea revolvente (${defaultTermDays}d)`,
        },
      });

      await tx.commerceAuditLog.create({
        data: {
          tenantId: session.tenantId,
          actorId: session.id,
          entityType: 'CREDIT_ACCOUNT',
          entityId: created.id,
          action: 'CREDIT_ACCOUNT_CREATED',
          payload: {
            subjectType: subject.subjectType,
            subjectName: subject.subjectName,
            revolvingLimit,
            defaultTermDays,
            status: created.status,
          },
        },
      });

      return this.toAccountSummaryResponse(
        {
          ...created,
          subjectName: subject.subjectName,
          subjectPhone: subject.subjectPhone,
          subjectEmail: subject.subjectEmail,
        },
        [],
      );
    });
  }

  async applySaleCreditDrawdownsInTx(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      actorId: string;
      actorRole: Role;
      saleId: string;
      saleHandoffCode: string;
      currency: string;
      subjectType: CreditSubjectType;
      resellerId?: string | null;
      clientId?: string | null;
      drawdowns: CreditDrawdownDto[];
      allowOverdueOverride?: boolean;
      idempotencyKey?: string;
    },
  ) {
    if (!params.drawdowns.length) return [];

    const subject = await this.resolveSubjectInTx(
      tx,
      params.tenantId,
      params.subjectType,
      params.resellerId ?? undefined,
      params.clientId ?? undefined,
    );

    let account = await tx.creditAccount.findFirst({
      where: {
        tenantId: params.tenantId,
        ...(subject.resellerId ? { resellerId: subject.resellerId } : { clientId: subject.clientId! }),
      },
    });

    const usesRevolving = params.drawdowns.some(
      (d) => d.facilityType === CreditFacilityType.REVOLVING,
    );

    if (!account) {
      if (usesRevolving) {
        throw new ConflictException(
          `${subject.subjectName} no tiene una línea de crédito revolvente autorizada. Asigna un límite o utiliza una Línea No Revolvente.`,
        );
      }
      account = await tx.creditAccount.create({
        data: {
          tenantId: params.tenantId,
          subjectType: subject.subjectType,
          resellerId: subject.resellerId,
          clientId: subject.clientId,
          revolvingLimit: new Prisma.Decimal(0),
          revolvingUsed: new Prisma.Decimal(0),
          currency: params.currency || 'MXN',
          defaultTermDays: 30,
          status: CreditAccountStatus.ACTIVE,
        },
      });
    }

    if (account.status === CreditAccountStatus.SUSPENDED) {
      throw new ForbiddenException(
        `La cuenta de crédito de ${subject.subjectName} está suspendida y no permite nuevas disposiciones.`,
      );
    }

    await this.syncOverdueObligationsInTx(tx, params.tenantId, account.id);

    const overdueCount = await tx.creditObligation.count({
      where: {
        tenantId: params.tenantId,
        accountId: account.id,
        status: CreditObligationStatus.OVERDUE,
        balanceDue: { gt: 0 },
      },
    });

    const isAdmin = params.actorRole === Role.TENANT_ADMIN || params.actorRole === Role.SYSTEM_ADMIN;
    if (overdueCount > 0) {
      if (!params.allowOverdueOverride) {
        throw new ConflictException(
          `${subject.subjectName} tiene ${overdueCount} ${overdueCount === 1 ? 'saldo vencido' : 'saldos vencidos'} (>30 días). Liquida la mora antes de otorgar más crédito o solicita autorización de Administrador.`,
        );
      }
      if (!isAdmin) {
        throw new ForbiddenException(
          'Sólo un Administrador puede autorizar crédito a un sujeto con saldo vencido (>30 días).',
        );
      }
    }

    const createdObligations: any[] = [];
    let currentRevolvingUsed = roundMoney(account.revolvingUsed);
    const revolvingLimit = roundMoney(account.revolvingLimit);

    for (const [index, drawdown] of params.drawdowns.entries()) {
      const amount = roundMoney(drawdown.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('El monto de disposición de crédito debe ser mayor a 0');
      }

      const termDays = drawdown.termDays ?? account.defaultTermDays ?? 30;
      const issuedAt = new Date();
      const dueAt = new Date(issuedAt.getTime() + termDays * MS_PER_DAY);

      if (drawdown.facilityType === CreditFacilityType.REVOLVING) {
        const available = Math.max(0, roundMoney(revolvingLimit - currentRevolvingUsed));
        if (amount > available) {
          throw new ConflictException(
            `Cupo revolvente insuficiente para ${subject.subjectName}. Disponible: ${available.toFixed(2)} ${params.currency}.`,
          );
        }

        const nextUsed = roundMoney(currentRevolvingUsed + amount);
        const claimedAccount = await tx.creditAccount.updateMany({
          where: {
            id: account.id,
            tenantId: params.tenantId,
            status: CreditAccountStatus.ACTIVE,
            revolvingUsed: account.revolvingUsed,
            revolvingLimit: account.revolvingLimit,
          },
          data: { revolvingUsed: new Prisma.Decimal(nextUsed) },
        });
        if (claimedAccount.count !== 1) {
          throw new ConflictException('El cupo de crédito cambió concurrentemente; vuelve a intentar');
        }
        currentRevolvingUsed = nextUsed;
        account = { ...account, revolvingUsed: new Prisma.Decimal(nextUsed) };
      }

      const defaultTitle =
        drawdown.facilityType === CreditFacilityType.REVOLVING
          ? `Crédito Revolvente ${termDays}d · ${params.saleHandoffCode}`
          : `Línea No Revolvente ${termDays}d · ${params.saleHandoffCode}`;
      const title = drawdown.title?.trim() || defaultTitle;

      const obligation = await tx.creditObligation.create({
        data: {
          tenantId: params.tenantId,
          accountId: account.id,
          saleId: params.saleId,
          facilityType: drawdown.facilityType,
          title,
          currency: params.currency || 'MXN',
          principalAmount: new Prisma.Decimal(amount),
          paidAmount: new Prisma.Decimal(0),
          balanceDue: new Prisma.Decimal(amount),
          termDays,
          issuedAt,
          dueAt,
          status: CreditObligationStatus.OPEN,
          notes: drawdown.notes?.trim() || null,
          idempotencyKey: params.idempotencyKey
            ? `${params.saleId}:${createHash('sha256').update(params.idempotencyKey).digest('hex')}:${index}`
            : `${params.saleId}:${index}`,
          createdById: params.actorId,
        },
        include: this.obligationInclude,
      });

      await tx.creditLedgerEntry.create({
        data: {
          tenantId: params.tenantId,
          accountId: account.id,
          obligationId: obligation.id,
          actorId: params.actorId,
          type: CreditLedgerEntryType.DRAWDOWN,
          facilityType: drawdown.facilityType,
          amount: new Prisma.Decimal(amount),
          balanceAfter: new Prisma.Decimal(amount),
          revolvingUsedAfter: new Prisma.Decimal(currentRevolvingUsed),
          notes: title,
          metadata: {
            saleId: params.saleId,
            handoffCode: params.saleHandoffCode,
            termDays,
            overdueOverrideApplied: overdueCount > 0 && Boolean(params.allowOverdueOverride),
          },
        },
      });

      createdObligations.push(obligation);
    }

    if (overdueCount > 0 && params.allowOverdueOverride) {
      await tx.commerceAuditLog.create({
        data: {
          tenantId: params.tenantId,
          actorId: params.actorId,
          entityType: 'CREDIT_ACCOUNT',
          entityId: account.id,
          action: 'CREDIT_OVERDUE_OVERRIDE',
          payload: {
            saleId: params.saleId,
            handoffCode: params.saleHandoffCode,
            overdueCount,
            subjectName: subject.subjectName,
          },
        },
      });
    }

    await tx.commerceAuditLog.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId,
        entityType: 'SALE',
        entityId: params.saleId,
        action: 'SALE_CREDITED',
        payload: {
          handoffCode: params.saleHandoffCode,
          subjectType: params.subjectType,
          subjectName: subject.subjectName,
          obligations: createdObligations.map((item) => ({
            id: item.id,
            code: this.formatObligationCode(item.id),
            facilityType: item.facilityType,
            amount: roundMoney(item.principalAmount),
          })),
        },
      },
    });

    return createdObligations.map((item) => this.toObligationResponse(item));
  }

  async listObligations(
    actor: Actor,
    filters?: {
      facilityType?: CreditFacilityType;
      status?: CreditObligationStatus;
      subjectType?: CreditSubjectType;
      q?: string;
    },
  ) {
    const { tenantId } = this.salesActor(actor);

    const { obligations, accounts } = await this.prisma.$transaction(async (tx) => {
      await this.syncOverdueObligationsInTx(tx, tenantId);
      const [foundObligations, foundAccounts] = await Promise.all([
        tx.creditObligation.findMany({
          where: {
            tenantId,
            ...(filters?.facilityType ? { facilityType: filters.facilityType } : {}),
            ...(filters?.status ? { status: filters.status } : {}),
            ...(filters?.subjectType ? { account: { subjectType: filters.subjectType } } : {}),
          },
          include: this.obligationInclude,
          orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
        }),
        tx.creditAccount.findMany({
          where: { tenantId },
          select: { revolvingLimit: true, revolvingUsed: true, status: true },
        }),
      ]);
      return { obligations: foundObligations, accounts: foundAccounts };
    });

    const formatted = obligations.map((item) => this.toObligationResponse(item));
    const needle = (filters?.q || '').trim().toLowerCase();
    const filtered = !needle
      ? formatted
      : formatted.filter((item) =>
          [
            item.code,
            item.title,
            item.subjectName,
            item.subjectPhone,
            item.subjectEmail,
            item.saleHandoffCode,
          ].some((value) => String(value || '').toLowerCase().includes(needle)),
        );

    const totalRevolvingLimit = roundMoney(
      accounts.reduce((sum, acc) => sum + roundMoney(acc.revolvingLimit), 0),
    );
    const totalRevolvingUsed = roundMoney(
      accounts.reduce((sum, acc) => sum + roundMoney(acc.revolvingUsed), 0),
    );
    const totalNonRevolvingBalance = roundMoney(
      formatted
        .filter(
          (item) =>
            item.facilityType === CreditFacilityType.NON_REVOLVING &&
            item.status !== CreditObligationStatus.PAID &&
            item.status !== CreditObligationStatus.CANCELLED,
        )
        .reduce((sum, item) => sum + item.balanceDue, 0),
    );
    const overdueItems = formatted.filter(
      (item) => item.status === CreditObligationStatus.OVERDUE && item.balanceDue > 0,
    );
    const totalOverdueBalance = roundMoney(
      overdueItems.reduce((sum, item) => sum + item.balanceDue, 0),
    );

    return {
      summary: {
        totalRevolvingLimit,
        totalRevolvingUsed,
        totalRevolvingAvailable: Math.max(0, roundMoney(totalRevolvingLimit - totalRevolvingUsed)),
        totalNonRevolvingBalance,
        totalOverdueBalance,
        overdueCount: overdueItems.length,
        openCount: formatted.filter(
          (item) =>
            item.status !== CreditObligationStatus.PAID &&
            item.status !== CreditObligationStatus.CANCELLED,
        ).length,
      },
      items: filtered,
    };
  }

  async getObligation(actor: Actor, id: string) {
    const { tenantId } = this.salesActor(actor);

    const obligation = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.creditObligation.findFirst({
        where: { id, tenantId },
        select: { id: true, accountId: true },
      });
      if (!existing) throw new NotFoundException('Obligación crediticia no encontrada');
      await this.syncOverdueObligationsInTx(tx, tenantId, existing.accountId);
      return tx.creditObligation.findFirstOrThrow({
        where: { id, tenantId },
        include: this.obligationInclude,
      });
    });

    return this.toObligationResponse(obligation);
  }

  async recordObligationPayment(
    actor: Actor,
    obligationId: string,
    input: RecordCreditPaymentDto,
    idempotencyKey?: string,
  ) {
    const session = this.salesActor(actor);
    const key = String(idempotencyKey || '').trim() || null;
    const amount = roundMoney(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('El monto del abono debe ser mayor a 0');
    }
    const method = String(input.method || '').trim();
    if (!method) {
      throw new BadRequestException('El método de pago es obligatorio');
    }

    return this.prisma.$transaction(async (tx) => {
      if (key) {
        const priorPayment = await tx.creditPayment.findFirst({
          where: { tenantId: session.tenantId, idempotencyKey: key },
          select: { id: true, obligationId: true },
        });
        if (priorPayment) {
          if (priorPayment.obligationId !== obligationId) {
            throw new ConflictException('La clave de reintento ya pertenece a otro abono');
          }
          const existingObligation = await tx.creditObligation.findFirstOrThrow({
            where: { id: priorPayment.obligationId, tenantId: session.tenantId },
            include: this.obligationInclude,
          });
          return {
            obligation: this.toObligationResponse(existingObligation),
            replayed: true,
          };
        }
      }

      const obligation = await tx.creditObligation.findFirst({
        where: { id: obligationId, tenantId: session.tenantId },
        include: {
          account: true,
          sale: { select: { id: true, paidAmount: true, creditedAmount: true } },
        },
      });
      if (!obligation) {
        throw new NotFoundException('Obligación crediticia no encontrada');
      }
      if (
        obligation.status === CreditObligationStatus.PAID ||
        obligation.status === CreditObligationStatus.CANCELLED
      ) {
        throw new ConflictException('Esta línea de crédito ya fue liquidada o cancelada');
      }

      const currentBalance = roundMoney(obligation.balanceDue);
      if (amount > currentBalance) {
        throw new BadRequestException(
          `El abono (${amount.toFixed(2)}) excede el saldo pendiente (${currentBalance.toFixed(2)})`,
        );
      }

      const nextPaid = roundMoney(Number(obligation.paidAmount) + amount);
      const nextBalance = roundMoney(currentBalance - amount);
      const now = new Date();
      const nextStatus =
        nextBalance === 0
          ? CreditObligationStatus.PAID
          : new Date(obligation.dueAt).getTime() <= now.getTime()
            ? CreditObligationStatus.OVERDUE
            : CreditObligationStatus.PARTIAL;

      const updatedClaim = await tx.creditObligation.updateMany({
        where: {
          id: obligation.id,
          tenantId: session.tenantId,
          balanceDue: obligation.balanceDue,
        },
        data: {
          paidAmount: new Prisma.Decimal(nextPaid),
          balanceDue: new Prisma.Decimal(nextBalance),
          status: nextStatus,
          ...(nextBalance === 0 ? { paidAt: now } : {}),
        },
      });
      if (updatedClaim.count !== 1) {
        throw new ConflictException('El saldo de la obligación cambió; vuelve a intentar');
      }

      const payment = await tx.creditPayment.create({
        data: {
          tenantId: session.tenantId,
          obligationId: obligation.id,
          amount: new Prisma.Decimal(amount),
          method,
          reference: input.reference?.trim() || null,
          notes: input.notes?.trim() || null,
          idempotencyKey: key,
          recordedById: session.id,
        },
      });

      let nextRevolvingUsed = roundMoney(obligation.account.revolvingUsed);
      if (obligation.facilityType === CreditFacilityType.REVOLVING) {
        nextRevolvingUsed = Math.max(0, roundMoney(nextRevolvingUsed - amount));
        const accountClaim = await tx.creditAccount.updateMany({
          where: {
            id: obligation.accountId,
            tenantId: session.tenantId,
            revolvingUsed: obligation.account.revolvingUsed,
          },
          data: { revolvingUsed: new Prisma.Decimal(nextRevolvingUsed) },
        });
        if (accountClaim.count !== 1) {
          throw new ConflictException('El cupo revolvente cambió durante el abono; vuelve a intentar');
        }
      }

      if (obligation.saleId && obligation.sale) {
        const saleCredited = roundMoney(obligation.sale.creditedAmount);
        const creditReduction = Math.min(saleCredited, amount);
        const nextSalePaid = roundMoney(Number(obligation.sale.paidAmount) + amount);
        const nextSaleCredited = Math.max(0, roundMoney(saleCredited - creditReduction));
        const saleClaim = await tx.commerceSale.updateMany({
          where: {
            id: obligation.sale.id,
            tenantId: session.tenantId,
            status: CommerceSaleStatus.PAID,
            paidAmount: obligation.sale.paidAmount,
            creditedAmount: obligation.sale.creditedAmount,
          },
          data: {
            paidAmount: new Prisma.Decimal(nextSalePaid),
            creditedAmount: new Prisma.Decimal(nextSaleCredited),
          },
        });
        if (saleClaim.count !== 1) {
          throw new ConflictException('El saldo de la venta cambiÃ³; vuelve a intentar el abono');
        }
      }

      await tx.creditLedgerEntry.create({
        data: {
          tenantId: session.tenantId,
          accountId: obligation.accountId,
          obligationId: obligation.id,
          actorId: session.id,
          type: CreditLedgerEntryType.PAYMENT,
          facilityType: obligation.facilityType,
          amount: new Prisma.Decimal(-amount),
          balanceAfter: new Prisma.Decimal(nextBalance),
          revolvingUsedAfter: new Prisma.Decimal(nextRevolvingUsed),
          notes: input.notes?.trim() || `Abono (${method})${input.reference?.trim() ? ` · ${input.reference.trim()}` : ''}`,
          metadata: {
            paymentId: payment.id,
            method,
            reference: input.reference?.trim() || null,
            revolvingReleased: obligation.facilityType === CreditFacilityType.REVOLVING ? amount : 0,
          },
        },
      });

      await tx.commerceAuditLog.create({
        data: {
          tenantId: session.tenantId,
          actorId: session.id,
          entityType: 'CREDIT_OBLIGATION',
          entityId: obligation.id,
          action: nextStatus === CreditObligationStatus.PAID ? 'CREDIT_OBLIGATION_PAID' : 'CREDIT_PAYMENT_RECORDED',
          payload: {
            code: this.formatObligationCode(obligation.id),
            facilityType: obligation.facilityType,
            amount,
            method,
            balanceAfter: nextBalance,
            revolvingUsedAfter: nextRevolvingUsed,
          },
        },
      });

      const refreshed = await tx.creditObligation.findFirstOrThrow({
        where: { id: obligation.id, tenantId: session.tenantId },
        include: this.obligationInclude,
      });

      return {
        obligation: this.toObligationResponse(refreshed),
        replayed: false,
      };
    });
  }

  async getResellerCredit(actor: Actor) {
    const session = this.resellerPortalActor(actor);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: session.id, tenantId: session.tenantId },
        select: { id: true, name: true, email: true },
      });

      const account = await tx.creditAccount.findFirst({
        where: { tenantId: session.tenantId, resellerId: session.id },
      });

      if (!account) {
        return {
          account: this.toAccountSummaryResponse(
            {
              tenantId: session.tenantId,
              subjectType: CreditSubjectType.RESELLER,
              resellerId: session.id,
              clientId: null,
              subjectName: user?.name || user?.email || 'Revendedor',
              subjectEmail: user?.email ?? null,
              revolvingLimit: 0,
              revolvingUsed: 0,
              currency: 'MXN',
              defaultTermDays: 30,
              status: CreditAccountStatus.ACTIVE,
              notes: null,
            },
            [],
          ),
          revolvingObligations: [],
          nonRevolvingObligations: [],
        };
      }

      await this.syncOverdueObligationsInTx(tx, session.tenantId, account.id);
      const obligations = await tx.creditObligation.findMany({
        where: { accountId: account.id, tenantId: session.tenantId },
        include: this.obligationInclude,
        orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
      });

      const formatted = obligations.map((item) => this.toObligationResponse(item));

      return {
        account: this.toAccountSummaryResponse(
          {
            ...account,
            subjectName: user?.name || user?.email || 'Revendedor',
            subjectEmail: user?.email ?? null,
          },
          obligations,
        ),
        revolvingObligations: formatted.filter(
          (item) => item.facilityType === CreditFacilityType.REVOLVING,
        ),
        nonRevolvingObligations: formatted.filter(
          (item) => item.facilityType === CreditFacilityType.NON_REVOLVING,
        ),
      };
    });
  }
}
