import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api, { resolveMediaUrl } from '../services/api';

type CommerceSaleStatus = 'DRAFT' | 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'EXPIRED';
type CommercePaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'FAILED' | 'REFUNDED';
type CommerceSalesChannel = 'JEWELRY_INTERNAL' | 'RESELLER_POS';
type StatusFilter = 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'ALL';
type ChannelFilter = 'ALL' | CommerceSalesChannel;
type TrafficFilter = 'ALL' | 'RED' | 'YELLOW' | 'GREEN';
type SortKey = 'handoffCode' | 'urgency' | 'resellerName' | 'customerName' | 'itemCount' | 'totalAmount' | 'balanceDue' | 'status' | 'createdAt';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' };
type WorkspaceTab = 'SALES' | 'CREDIT';
type CreditSubTab = 'OBLIGATIONS' | 'ACCOUNTS';
type CreditSubjectType = 'RESELLER' | 'CLIENT';
type CreditFacilityType = 'REVOLVING' | 'NON_REVOLVING';
type CreditAccountStatus = 'ACTIVE' | 'SUSPENDED';
type CreditObligationStatus = 'OPEN' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
type FinancingMode = 'CASH' | 'REVOLVING' | 'NON_REVOLVING' | 'MIXED';

const COMMISSION_STATUS_LABELS = {
    PENDING: 'Pendiente',
    PENDING_CREDIT: 'Pendiente de crédito',
    EARNED: 'Ganado',
    VOIDED: 'Anulado',
    NONE: 'Sin margen',
} as const;

type CommerceSaleItem = {
    id: string;
    productId: string;
    skuSnapshot: string;
    nameSnapshot: string;
    quantity: number;
    unitPrice: number;
    publicUnitPrice?: number | null;
    commissionUnitAmount?: number | null;
    commissionAmount?: number | null;
    lineTotal: number;
};

type CommerceSalePayment = {
    id: string;
    amount: number;
    method: string;
    status: CommercePaymentStatus;
    reference: string | null;
    paidAt?: string | null;
    recordedAt?: string | null;
    recordedByName?: string | null;
    createdAt?: string;
};

type CommerceSaleReservation = {
    id: string;
    productId: string;
    quantity: number;
    status: string;
    expiresAt: string | null;
    releasedAt?: string | null;
};

type SaleCreditObligationSummary = {
    id: string;
    code: string;
    facilityType: CreditFacilityType;
    title: string | null;
    principalAmount: number;
    paidAmount: number;
    balanceDue: number;
    dueAt: string;
    status: CreditObligationStatus;
};

type CommerceSale = {
    id: string;
    handoffCode: string;
    resellerId: string;
    resellerName: string | null;
    resellerEmail: string | null;
    clientId?: string | null;
    salesChannel: CommerceSalesChannel;
    status: CommerceSaleStatus;
    paymentStatus: CommercePaymentStatus;
    currency: string;
    customerName: string | null;
    customerPhone: string | null;
    subtotalAmount: number;
    discountAmount: number;
    totalAmount: number;
    publicTotalAmount?: number | null;
    commissionAmount?: number | null;
    commissionStatus?: 'NONE' | 'PENDING' | 'PENDING_CREDIT' | 'EARNED' | 'VOIDED';
    paidAmount: number;
    creditedAmount?: number;
    balanceDue: number;
    notes: string | null;
    cancellationReason: string | null;
    expiresAt: string | null;
    paidAt: string | null;
    cancelledAt: string | null;
    createdAt: string;
    items: CommerceSaleItem[];
    payments: CommerceSalePayment[];
    reservations: CommerceSaleReservation[];
    creditObligations?: SaleCreditObligationSummary[];
};

type CreditPaymentEntry = {
    id: string;
    obligationId: string;
    amount: number;
    method: string;
    reference: string | null;
    notes: string | null;
    recordedById?: string | null;
    recordedByName: string | null;
    recordedAt: string;
};

type CreditNoteEntry = {
    id: string;
    amount: number;
    reason: string;
    notes: string | null;
    recordedByName: string | null;
    createdAt: string;
};

type CreditObligationItem = {
    id: string;
    code: string;
    tenantId: string;
    accountId: string;
    subjectType: CreditSubjectType;
    resellerId: string | null;
    clientId: string | null;
    subjectName: string | null;
    subjectPhone: string | null;
    subjectEmail: string | null;
    saleId: string | null;
    saleHandoffCode: string | null;
    facilityType: CreditFacilityType;
    title: string;
    currency: string;
    principalAmount: number;
    paidAmount: number;
    balanceDue: number;
    termDays: number;
    issuedAt: string;
    dueAt: string;
    paidAt: string | null;
    status: CreditObligationStatus;
    daysRemaining: number;
    isOverdue: boolean;
    notes: string | null;
    createdByName: string | null;
    createdAt: string;
    updatedAt: string;
    payments: CreditPaymentEntry[];
    creditNotes?: CreditNoteEntry[];
};

type CreditAccountSummary = {
    id: string | null;
    tenantId: string;
    subjectType: CreditSubjectType;
    resellerId: string | null;
    clientId: string | null;
    subjectName: string | null;
    subjectPhone: string | null;
    subjectEmail: string | null;
    revolvingLimit: number;
    revolvingUsed: number;
    revolvingAvailable: number;
    activeNonRevolvingCount: number;
    activeNonRevolvingTotal: number;
    overdueCount: number;
    overdueAmount: number;
    currency: string;
    defaultTermDays: number;
    status: CreditAccountStatus;
    notes: string | null;
    canDrawCredit: boolean;
    canDrawRevolving: boolean;
    blockReason: string | null;
};

type CreditSubjectSummary = CreditAccountSummary & {
    obligations: CreditObligationItem[];
};

type CreditPortfolioSummary = {
    totalRevolvingLimit: number;
    totalRevolvingUsed: number;
    totalRevolvingAvailable: number;
    totalNonRevolvingBalance: number;
    totalOverdueBalance: number;
    overdueCount: number;
    openCount: number;
};

type CreditSubjectsDirectory = {
    resellers: Array<{ id: string; name: string; email: string }>;
    clients: Array<{ id: string; name: string; phone: string | null; email: string | null }>;
};

type CatalogProduct = {
    id: string;
    sku: string;
    name: string;
    category: string | null;
    imageUrl: string | null;
    unitPrice: number;
    currency: string;
    stockOnHand?: number;
    reservedQuantity?: number;
    availableQuantity?: number;
    status?: string;
};

type PosClientOption = {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
};

function getCatalogAvailable(product: CatalogProduct): number {
    if (typeof product.availableQuantity === 'number' && Number.isFinite(product.availableQuantity)) {
        return Math.max(0, product.availableQuantity);
    }
    const stock = Number(product.stockOnHand ?? 0);
    const reserved = Number(product.reservedQuantity ?? 0);
    return Math.max(0, stock - reserved);
}

type ReservationTraffic = {
    color: 'RED' | 'YELLOW' | 'GREEN' | 'NONE';
    label: string;
    minutesLeft: number | null;
    description: string;
};

const PAYMENT_METHODS = [
    { id: 'Efectivo', icon: 'payments', label: 'Efectivo' },
    { id: 'Tarjeta', icon: 'credit_card', label: 'Tarjeta' },
    { id: 'Transferencia', icon: 'account_balance', label: 'Transferencia' },
] as const;

const SALE_STATUS_LABELS: Record<CommerceSaleStatus, string> = {
    DRAFT: 'Borrador',
    PENDING_PAYMENT: 'Por cobrar',
    PAID: 'Pagada',
    CANCELLED: 'Cancelada',
    EXPIRED: 'Expirada',
};

const SALE_STATUS_BADGE: Record<CommerceSaleStatus, string> = {
    DRAFT: 'bg-muted text-muted-foreground border-border',
    PENDING_PAYMENT: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    PAID: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    CANCELLED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
    EXPIRED: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/30',
};

const CHANNEL_LABELS: Record<CommerceSalesChannel, string> = {
    RESELLER_POS: 'Revendedor',
    JEWELRY_INTERNAL: 'Caja Cared',
};

const FACILITY_LABELS: Record<CreditFacilityType, string> = {
    REVOLVING: 'Revolvente 30d',
    NON_REVOLVING: 'No Revolvente 30d (x Pieza)',
};

const OBLIGATION_STATUS_LABELS: Record<CreditObligationStatus, string> = {
    OPEN: 'Vigente',
    PARTIAL: 'Abonada',
    PAID: 'Liquidada',
    OVERDUE: 'Vencida',
    CANCELLED: 'Cancelada',
};

const OBLIGATION_STATUS_BADGE: Record<CreditObligationStatus, string> = {
    OPEN: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
    PARTIAL: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    PAID: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    OVERDUE: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
    CANCELLED: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/30',
};

function roundMoney(value: number): number {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function getLoggedUserRole(): string {
    try {
        const parsed = JSON.parse(localStorage.getItem('user') || '{}');
        return String(parsed?.role || '').toUpperCase();
    } catch {
        return '';
    }
}

function money(value: number, currency = 'MXN'): string {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: currency || 'MXN',
        maximumFractionDigits: 2,
    }).format(value || 0);
}

function formatDateTime(value: string | null | undefined): string {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function formatDateShort(value: string | null | undefined): string {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString('es-MX', { dateStyle: 'medium' });
}

function getInitials(name: string | null | undefined): string {
    const clean = (name || '').trim();
    if (!clean) return 'CM';
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function displayOperatorName(name: string | null | undefined, email?: string | null): string {
    const raw = String(name || email || '').trim();
    if (!raw) return 'Mostrador';
    if (raw.includes('@')) {
        return raw
            .split('@')[0]
            .replace(/[._-]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return raw;
}

function getReservationTraffic(sale: CommerceSale, nowMs: number): ReservationTraffic {
    if (sale.status !== 'PENDING_PAYMENT') {
        if (sale.status === 'PAID') {
            return {
                color: 'NONE',
                label: sale.paidAt ? `Pagada ${formatDateTime(sale.paidAt)}` : 'Liquidada',
                minutesLeft: null,
                description: 'Orden cobrada y descontada de inventario',
            };
        }
        if (sale.status === 'CANCELLED') {
            return {
                color: 'NONE',
                label: 'Reserva liberada',
                minutesLeft: null,
                description: sale.cancellationReason || 'Orden cancelada',
            };
        }
        return {
            color: 'NONE',
            label: 'Tiempo agotado',
            minutesLeft: null,
            description: 'La reserva de 30 minutos venció',
        };
    }

    if (!sale.expiresAt) {
        return {
            color: 'GREEN',
            label: 'Reserva activa',
            minutesLeft: 30,
            description: 'Orden pendiente de cobro',
        };
    }

    const diffMs = new Date(sale.expiresAt).getTime() - nowMs;
    const mins = Math.ceil(diffMs / 60000);

    if (mins <= 0) {
        return {
            color: 'RED',
            label: 'Vencida',
            minutesLeft: 0,
            description: 'La reserva alcanzó su tiempo límite',
        };
    }
    if (mins <= 10) {
        return {
            color: 'RED',
            label: `${mins} min · Crítico`,
            minutesLeft: mins,
            description: `La reserva vence en ${mins} minutos`,
        };
    }
    if (mins <= 20) {
        return {
            color: 'YELLOW',
            label: `${mins} min · Por vencer`,
            minutesLeft: mins,
            description: `Reserva vigente por ${mins} minutos más`,
        };
    }
    return {
        color: 'GREEN',
        label: `${mins} min · En tiempo`,
        minutesLeft: mins,
        description: `Reserva recién creada (${mins} min restantes)`,
    };
}

function createIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type CreditFinancingPanelProps = {
    totalAmount: number;
    currency?: string;
    hasSubject: boolean;
    subjectHint: string;
    creditSummary: CreditSubjectSummary | null;
    creditLoading: boolean;
    financingMode: FinancingMode;
    onFinancingModeChange: (mode: FinancingMode) => void;
    mixedFacility: CreditFacilityType;
    onMixedFacilityChange: (facility: CreditFacilityType) => void;
    cashAmount: string;
    onCashAmountChange: (val: string) => void;
    payMethod: string;
    onPayMethodChange: (method: string) => void;
    payReference: string;
    onPayReferenceChange: (ref: string) => void;
    nonRevolvingTitle: string;
    onNonRevolvingTitleChange: (title: string) => void;
    isCreditAdmin: boolean;
    allowOverdueOverride: boolean;
    onAllowOverdueOverrideChange: (val: boolean) => void;
    cashInputId: string;
    refInputId: string;
    titleInputId: string;
    allowPartialCash?: boolean;
};

const CreditFinancingPanel: React.FC<CreditFinancingPanelProps> = ({
    totalAmount,
    currency = 'MXN',
    hasSubject,
    subjectHint,
    creditSummary,
    creditLoading,
    financingMode,
    onFinancingModeChange,
    mixedFacility,
    onMixedFacilityChange,
    cashAmount,
    onCashAmountChange,
    payMethod,
    onPayMethodChange,
    payReference,
    onPayReferenceChange,
    nonRevolvingTitle,
    onNonRevolvingTitleChange,
    isCreditAdmin,
    allowOverdueOverride,
    onAllowOverdueOverrideChange,
    cashInputId,
    refInputId,
    titleInputId,
    allowPartialCash = false,
}) => {
    const parsedCash = roundMoney(Number(cashAmount) || 0);
    const usesCredit = financingMode !== 'CASH';
    const selectedFacility: CreditFacilityType | null =
        financingMode === 'REVOLVING'
            ? 'REVOLVING'
            : financingMode === 'NON_REVOLVING'
              ? 'NON_REVOLVING'
              : financingMode === 'MIXED'
                ? mixedFacility
                : null;

    const creditedPortion =
        financingMode === 'REVOLVING' || financingMode === 'NON_REVOLVING'
            ? roundMoney(totalAmount)
            : financingMode === 'MIXED'
              ? roundMoney(Math.max(0, totalAmount - parsedCash))
              : 0;

    const revolvingPct =
        creditSummary && creditSummary.revolvingLimit > 0
            ? Math.min(100, Math.round((creditSummary.revolvingUsed / creditSummary.revolvingLimit) * 100))
            : 0;

    const exceedsRevolving =
        selectedFacility === 'REVOLVING' &&
        creditSummary !== null &&
        creditedPortion > creditSummary.revolvingAvailable + 0.001;

    return (
        <div className="space-y-3.5">
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">
                    Modalidad de liquidación
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {([
                        { id: 'CASH', label: 'Contado / Caja', icon: 'payments', requiresSubject: false },
                        { id: 'REVOLVING', label: 'Revolvente 30d', icon: 'autorenew', requiresSubject: true },
                        { id: 'NON_REVOLVING', label: 'No Revolvente 30d', icon: 'receipt_long', requiresSubject: true },
                        { id: 'MIXED', label: 'Mixto + Crédito', icon: 'splitscreen', requiresSubject: true },
                    ] as const).map((option) => {
                        const active = financingMode === option.id;
                        const disabled = option.requiresSubject && !hasSubject;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => onFinancingModeChange(option.id)}
                                className={`px-2.5 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                    active
                                        ? 'bg-red-600 text-white border-red-600 shadow-md'
                                        : 'bg-background text-muted-foreground border-border hover:text-foreground'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[16px]">{option.icon}</span>
                                <span className="leading-tight">{option.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {!hasSubject ? (
                <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">info</span>
                    <span>{subjectHint}</span>
                </div>
            ) : (
                <div className="rounded-2xl border border-border bg-muted/30 p-3.5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-red-500">account_balance_wallet</span>
                            <span className="text-[11px] font-black uppercase tracking-widest text-foreground">
                                Estado Crediticio · {creditSummary?.subjectName || 'Cargando…'}
                            </span>
                        </div>
                        {creditSummary && (
                            <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                    creditSummary.status === 'ACTIVE'
                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                        : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                }`}
                            >
                                {creditSummary.status === 'ACTIVE' ? 'Cuenta Activa' : 'Suspendida'}
                            </span>
                        )}
                    </div>

                    {creditLoading ? (
                        <p className="text-xs text-muted-foreground">Consultando línea revolvente y vencimientos a 30 días…</p>
                    ) : creditSummary ? (
                        <>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="rounded-xl bg-background/70 border border-border px-3 py-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Límite Revolvente</p>
                                    <p className="font-black text-foreground mt-0.5">{money(creditSummary.revolvingLimit, currency)}</p>
                                </div>
                                <div className="rounded-xl bg-background/70 border border-border px-3 py-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Disponible</p>
                                    <p className={`font-black mt-0.5 ${creditSummary.revolvingAvailable > 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                        {money(creditSummary.revolvingAvailable, currency)}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-background/70 border border-border px-3 py-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">No Revolvente Activo</p>
                                    <p className="font-black text-amber-500 mt-0.5">
                                        {creditSummary.activeNonRevolvingCount} · {money(creditSummary.activeNonRevolvingTotal, currency)}
                                    </p>
                                </div>
                            </div>

                            {creditSummary.revolvingLimit > 0 && (
                                <div className="space-y-1">
                                    <div className="h-1.5 w-full rounded-full bg-background overflow-hidden border border-border">
                                        <div
                                            className={`h-full transition-all ${revolvingPct >= 90 ? 'bg-rose-500' : 'bg-red-500'}`}
                                            style={{ width: `${revolvingPct}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground flex justify-between">
                                        <span>Uso revolvente: {money(creditSummary.revolvingUsed, currency)} ({revolvingPct}%)</span>
                                        <span>Plazo estándar: {creditSummary.defaultTermDays} días</span>
                                    </p>
                                </div>
                            )}

                            {!creditSummary.canDrawCredit && creditSummary.blockReason && (
                                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-400 space-y-1.5">
                                    <p className="font-bold flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px]">warning</span>
                                        <span>{creditSummary.blockReason}</span>
                                    </p>
                                    {isCreditAdmin && usesCredit && creditSummary.status === 'ACTIVE' && (
                                        <label className="flex items-center gap-2 text-[11px] font-bold text-foreground cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={allowOverdueOverride}
                                                onChange={(e) => onAllowOverdueOverrideChange(e.target.checked)}
                                            />
                                            Autorizar excepción de mora (TENANT_ADMIN)
                                        </label>
                                    )}
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            )}

            {(financingMode === 'CASH' || financingMode === 'MIXED') && (
                <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-3.5">
                    <div className="grid grid-cols-3 gap-2">
                        {PAYMENT_METHODS.map((method) => {
                            const active = payMethod === method.id;
                            return (
                                <button
                                    key={method.id}
                                    type="button"
                                    onClick={() => onPayMethodChange(method.id)}
                                    className={`h-10 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                        active
                                            ? 'bg-red-600 text-white border-red-600 shadow-md'
                                            : 'bg-background text-muted-foreground border-border hover:text-foreground'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">{method.icon}</span>
                                    <span>{method.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {financingMode === 'MIXED' || allowPartialCash ? (
                            <div>
                                <label
                                    className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1"
                                    htmlFor={cashInputId}
                                >
                                    {financingMode === 'MIXED'
                                        ? `Enganche / Contado hoy (${currency})`
                                        : `Monto a cobrar (${currency})`}
                                </label>
                                <input
                                    id={cashInputId}
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={financingMode === 'MIXED' ? Math.max(0.01, roundMoney(totalAmount - 0.01)) : totalAmount}
                                    value={cashAmount}
                                    onChange={(e) => onCashAmountChange(e.target.value)}
                                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-black focus:border-red-500 focus:outline-none"
                                    required
                                />
                            </div>
                        ) : (
                            <div className="rounded-xl border border-border bg-background px-3 py-2 flex flex-col justify-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cobro en caja</span>
                                <span className="text-sm font-black text-foreground">{money(totalAmount, currency)}</span>
                            </div>
                        )}
                        <div>
                            <label
                                className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1"
                                htmlFor={refInputId}
                            >
                                Referencia / Voucher
                            </label>
                            <input
                                id={refInputId}
                                type="text"
                                value={payReference}
                                onChange={(e) => onPayReferenceChange(e.target.value)}
                                placeholder="Opcional (ej. AUT-9821)"
                                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm focus:border-red-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>
            )}

            {financingMode === 'MIXED' && (
                <div className="rounded-2xl border border-border bg-muted/20 p-3.5 space-y-2.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Destino del saldo restante ({money(creditedPortion, currency)}) a 30 días
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {([
                            { id: 'REVOLVING', label: 'A Revolvente 30d' },
                            { id: 'NON_REVOLVING', label: 'A Línea No Revolvente (Pieza)' },
                        ] as const).map((target) => (
                            <button
                                key={target.id}
                                type="button"
                                onClick={() => onMixedFacilityChange(target.id)}
                                className={`h-10 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    mixedFacility === target.id
                                        ? 'bg-foreground text-background border-foreground'
                                        : 'bg-background text-muted-foreground border-border hover:text-foreground'
                                }`}
                            >
                                {target.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {selectedFacility === 'NON_REVOLVING' && (
                <div>
                    <label
                        className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1"
                        htmlFor={titleInputId}
                    >
                        Pieza o concepto de línea no revolvente (30 días)
                    </label>
                    <input
                        id={titleInputId}
                        type="text"
                        value={nonRevolvingTitle}
                        onChange={(e) => onNonRevolvingTitleChange(e.target.value)}
                        placeholder="Ej. Anillo Diamante Solitario · Línea 30 días"
                        className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm focus:border-red-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                        Línea independiente por operación a 30 días: no consume el límite revolvente ni se libera al abonarse.
                    </p>
                </div>
            )}

            {exceedsRevolving && creditSummary && (
                <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-400">
                    El monto ({money(creditedPortion, currency)}) excede el disponible revolvente ({money(creditSummary.revolvingAvailable, currency)}). Usa{' '}
                    <strong>No Revolvente 30d</strong> para esta pieza o reduce con un enganche en modo <strong>Mixto</strong>.
                </div>
            )}

            {usesCredit && creditedPortion > 0 && !exceedsRevolving && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-500 flex items-center justify-between">
                    <span className="font-bold">
                        Se abrirá {selectedFacility === 'REVOLVING' ? 'cargo revolvente' : 'línea no revolvente'} a 30 días
                    </span>
                    <span className="font-black">{money(creditedPortion, currency)}</span>
                </div>
            )}
        </div>
    );
};

const PosSales: React.FC = () => {
    const location = useLocation();
    const userRole = useMemo(() => getLoggedUserRole(), []);
    const isCreditAdmin = userRole === 'TENANT_ADMIN' || userRole === 'SYSTEM_ADMIN';

    const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>(() =>
        new URLSearchParams(location.search).get('workspace') === 'credit' ? 'CREDIT' : 'SALES',
    );
    const [sales, setSales] = useState<CommerceSale[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        setWorkspaceTab(new URLSearchParams(location.search).get('workspace') === 'credit' ? 'CREDIT' : 'SALES');
    }, [location.search]);

    // Filters & table controls
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING_PAYMENT');
    const [channelFilter, setChannelFilter] = useState<ChannelFilter>('ALL');
    const [trafficFilter, setTrafficFilter] = useState<TrafficFilter>('ALL');
    const [query, setQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
    const [pageSize, setPageSize] = useState<number>(25);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Drawer selection & settlement form state
    const [drawerSaleId, setDrawerSaleId] = useState<string | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState<string>('Efectivo');
    const [payReference, setPayReference] = useState('');
    const [settleNotes, setSettleNotes] = useState('');
    const [settling, setSettling] = useState(false);
    const [settleFinancingMode, setSettleFinancingMode] = useState<FinancingMode>('CASH');
    const [settleMixedFacility, setSettleMixedFacility] = useState<CreditFacilityType>('REVOLVING');
    const [settleNonRevolvingTitle, setSettleNonRevolvingTitle] = useState('');
    const [settleClientIdOverride, setSettleClientIdOverride] = useState<string>('');
    const [settleAllowOverdueOverride, setSettleAllowOverdueOverride] = useState(false);
    const [settleCreditSummary, setSettleCreditSummary] = useState<CreditSubjectSummary | null>(null);
    const [settleCreditLoading, setSettleCreditLoading] = useState(false);
    const settleRequestRef = useRef<{ fingerprint: string; key: string } | null>(null);

    // Cancellation state
    const [cancelReason, setCancelReason] = useState('');
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [actionError, setActionError] = useState('');

    // Direct walk-in sale modal state
    const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
    const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [directClients, setDirectClients] = useState<PosClientOption[]>([]);
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const [directCart, setDirectCart] = useState<Record<string, number>>({});
    const [directClientId, setDirectClientId] = useState<string | null>(null);
    const [directCustomerName, setDirectCustomerName] = useState('');
    const [directCustomerPhone, setDirectCustomerPhone] = useState('');
    const [directMethod, setDirectMethod] = useState<string>('Efectivo');
    const [directReference, setDirectReference] = useState('');
    const [directCashAmount, setDirectCashAmount] = useState('');
    const [directNotes, setDirectNotes] = useState('');
    const [directCollectNow, setDirectCollectNow] = useState(true);
    const [directFinancingMode, setDirectFinancingMode] = useState<FinancingMode>('CASH');
    const [directMixedFacility, setDirectMixedFacility] = useState<CreditFacilityType>('REVOLVING');
    const [directNonRevolvingTitle, setDirectNonRevolvingTitle] = useState('');
    const [directAllowOverdueOverride, setDirectAllowOverdueOverride] = useState(false);
    const [directCreditSummary, setDirectCreditSummary] = useState<CreditSubjectSummary | null>(null);
    const [directCreditLoading, setDirectCreditLoading] = useState(false);
    const [directSubmitting, setDirectSubmitting] = useState(false);
    const [directError, setDirectError] = useState('');

    // Dual Credit Portfolio ("Crédito y Cartera (30d)") state
    const [creditSubTab, setCreditSubTab] = useState<CreditSubTab>('OBLIGATIONS');
    const [creditLoading, setCreditLoading] = useState(false);
    const [creditError, setCreditError] = useState('');
    const [creditPortfolioSummary, setCreditPortfolioSummary] = useState<CreditPortfolioSummary>({
        totalRevolvingLimit: 0,
        totalRevolvingUsed: 0,
        totalRevolvingAvailable: 0,
        totalNonRevolvingBalance: 0,
        totalOverdueBalance: 0,
        overdueCount: 0,
        openCount: 0,
    });
    const [creditObligations, setCreditObligations] = useState<CreditObligationItem[]>([]);
    const [creditAccounts, setCreditAccounts] = useState<CreditAccountSummary[]>([]);
    const [creditSubjects, setCreditSubjects] = useState<CreditSubjectsDirectory>({ resellers: [], clients: [] });
    const [creditFacilityFilter, setCreditFacilityFilter] = useState<'ALL' | CreditFacilityType>('ALL');
    const [creditStatusFilter, setCreditStatusFilter] = useState<'ALL' | 'OPEN_GROUP' | CreditObligationStatus>('OPEN_GROUP');
    const [creditSubjectTypeFilter, setCreditSubjectTypeFilter] = useState<'ALL' | CreditSubjectType>('ALL');
    const [creditQuery, setCreditQuery] = useState('');

    // Obligation Repayment Drawer
    const [selectedObligationId, setSelectedObligationId] = useState<string | null>(null);
    const [obligationPayAmount, setObligationPayAmount] = useState('');
    const [obligationPayMethod, setObligationPayMethod] = useState<string>('Efectivo');
    const [obligationPayReference, setObligationPayReference] = useState('');
    const [obligationPayNotes, setObligationPayNotes] = useState('');
    const [obligationPaySubmitting, setObligationPaySubmitting] = useState(false);
    const [creditNoteAmount, setCreditNoteAmount] = useState('');
    const [creditNoteReason, setCreditNoteReason] = useState('');
    const [creditNoteNotes, setCreditNoteNotes] = useState('');
    const [creditNoteSubmitting, setCreditNoteSubmitting] = useState(false);
    const [creditNoteError, setCreditNoteError] = useState('');
    const [obligationPayError, setObligationPayError] = useState('');
    const obligationPayRef = useRef<{ fingerprint: string; key: string } | null>(null);

    // Revolving Account Limit Modal (Admin)
    const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
    const [limitSubjectType, setLimitSubjectType] = useState<CreditSubjectType>('RESELLER');
    const [limitSubjectId, setLimitSubjectId] = useState('');
    const [limitAmount, setLimitAmount] = useState('50000');
    const [limitTermDays, setLimitTermDays] = useState('30');
    const [limitStatus, setLimitStatus] = useState<CreditAccountStatus>('ACTIVE');
    const [limitNotes, setLimitNotes] = useState('');
    const [limitSubmitting, setLimitSubmitting] = useState(false);
    const [limitError, setLimitError] = useState('');

    // Live countdown refresh every 30s
    useEffect(() => {
        const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
        return () => window.clearInterval(timer);
    }, []);

    const loadSales = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get<CommerceSale[]>('/commerce/sales');
            const rows = Array.isArray(response.data) ? response.data : [];
            setSales(rows);
            setNowMs(Date.now());
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'No fue posible cargar las órdenes de Caja POS.';
            setError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setLoading(false);
        }
    }, []);

    const loadCreditPortfolio = useCallback(async () => {
        setCreditLoading(true);
        setCreditError('');
        try {
            const statusParam =
                creditStatusFilter === 'ALL' || creditStatusFilter === 'OPEN_GROUP'
                    ? undefined
                    : creditStatusFilter;
            const [obligationsRes, accountsRes] = await Promise.all([
                api.get<{ summary: CreditPortfolioSummary; items: CreditObligationItem[] }>(
                    '/commerce/credit/obligations',
                    {
                        params: {
                            facilityType: creditFacilityFilter === 'ALL' ? undefined : creditFacilityFilter,
                            status: statusParam,
                            subjectType: creditSubjectTypeFilter === 'ALL' ? undefined : creditSubjectTypeFilter,
                            q: creditQuery.trim() || undefined,
                        },
                    },
                ),
                api.get<{ items: CreditAccountSummary[]; subjects: CreditSubjectsDirectory }>(
                    '/commerce/credit/accounts',
                    {
                        params: {
                            subjectType: creditSubjectTypeFilter === 'ALL' ? undefined : creditSubjectTypeFilter,
                            q: creditQuery.trim() || undefined,
                        },
                    },
                ),
            ]);
            if (obligationsRes.data?.summary) {
                setCreditPortfolioSummary(obligationsRes.data.summary);
            }
            const rawItems = Array.isArray(obligationsRes.data?.items) ? obligationsRes.data.items : [];
            const filteredItems =
                creditStatusFilter === 'OPEN_GROUP'
                    ? rawItems.filter((item) => item.status !== 'PAID' && item.status !== 'CANCELLED')
                    : rawItems;
            setCreditObligations(filteredItems);
            setCreditAccounts(Array.isArray(accountsRes.data?.items) ? accountsRes.data.items : []);
            if (accountsRes.data?.subjects) {
                setCreditSubjects(accountsRes.data.subjects);
            }
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'No fue posible cargar la cartera de crédito.';
            setCreditError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setCreditLoading(false);
        }
    }, [creditFacilityFilter, creditStatusFilter, creditSubjectTypeFilter, creditQuery]);

    const loadSubjectCreditSummary = useCallback(
        async (
            params: { resellerId?: string; clientId?: string },
            setSummary: React.Dispatch<React.SetStateAction<CreditSubjectSummary | null>>,
            setFetching: React.Dispatch<React.SetStateAction<boolean>>,
        ) => {
            if (!params.resellerId && !params.clientId) {
                setSummary(null);
                return;
            }
            setFetching(true);
            try {
                const res = await api.get<CreditSubjectSummary>('/commerce/credit/subject-summary', { params });
                setSummary(res.data || null);
            } catch {
                setSummary(null);
            } finally {
                setFetching(false);
            }
        },
        [],
    );

    useEffect(() => {
        void loadSales();
        void loadCreditPortfolio();
    }, [loadSales, loadCreditPortfolio]);

    const selectedSale = useMemo(
        () => (drawerSaleId ? sales.find((sale) => sale.id === drawerSaleId) || null : null),
        [sales, drawerSaleId],
    );

    const selectedObligation = useMemo(
        () =>
            selectedObligationId
                ? creditObligations.find((item) => item.id === selectedObligationId) || null
                : null,
        [creditObligations, selectedObligationId],
    );

    useEffect(() => {
        if (!selectedObligation) {
            setObligationPayAmount('');
            setObligationPayReference('');
            setObligationPayNotes('');
            setObligationPayError('');
            return;
        }
        setObligationPayAmount(selectedObligation.balanceDue > 0 ? String(roundMoney(selectedObligation.balanceDue)) : '');
        setObligationPayReference('');
        setObligationPayNotes('');
        setObligationPayError('');
        setCreditNoteAmount('');
        setCreditNoteReason('');
        setCreditNoteNotes('');
        setCreditNoteError('');
    }, [selectedObligation?.id, selectedObligation?.balanceDue]);

    useEffect(() => {
        if (!selectedSale) {
            setPayAmount('');
            setPayReference('');
            setSettleNotes('');
            setCancelReason('');
            setActionError('');
            setSettleFinancingMode('CASH');
            setSettleMixedFacility('REVOLVING');
            setSettleNonRevolvingTitle('');
            setSettleClientIdOverride('');
            setSettleAllowOverdueOverride(false);
            setSettleCreditSummary(null);
            return;
        }
        setPayAmount(selectedSale.balanceDue > 0 ? String(roundMoney(selectedSale.balanceDue)) : '');
        setPayReference('');
        setSettleNotes('');
        setCancelReason('');
        setActionError('');
        setSettleFinancingMode('CASH');
        setSettleMixedFacility('REVOLVING');
        setSettleAllowOverdueOverride(false);
        const initialTitle = selectedSale.items
            .map((i) => `${i.quantity}x ${i.nameSnapshot}`)
            .join(', ')
            .slice(0, 120);
        setSettleNonRevolvingTitle(initialTitle);
        setSettleClientIdOverride(selectedSale.clientId || '');

        if (selectedSale.salesChannel === 'JEWELRY_INTERNAL' && directClients.length === 0) {
            void api
                .get<PosClientOption[]>('/clients')
                .then((res) => setDirectClients(Array.isArray(res.data) ? res.data : []))
                .catch(() => {});
        }
    }, [selectedSale?.id, selectedSale?.balanceDue]);

    useEffect(() => {
        if (!selectedSale || selectedSale.status !== 'PENDING_PAYMENT') {
            setSettleCreditSummary(null);
            return;
        }
        const effectiveClientId = settleClientIdOverride || selectedSale.clientId || '';
        if (selectedSale.salesChannel === 'RESELLER_POS' && !settleClientIdOverride) {
            void loadSubjectCreditSummary(
                { resellerId: selectedSale.resellerId },
                setSettleCreditSummary,
                setSettleCreditLoading,
            );
        } else if (effectiveClientId) {
            void loadSubjectCreditSummary(
                { clientId: effectiveClientId },
                setSettleCreditSummary,
                setSettleCreditLoading,
            );
        } else {
            setSettleCreditSummary(null);
        }
    }, [
        selectedSale?.id,
        selectedSale?.status,
        selectedSale?.salesChannel,
        selectedSale?.resellerId,
        selectedSale?.clientId,
        settleClientIdOverride,
        loadSubjectCreditSummary,
    ]);

    useEffect(() => {
        if (!directClientId) {
            setDirectCreditSummary(null);
            setDirectFinancingMode('CASH');
            setDirectAllowOverdueOverride(false);
            return;
        }
        if (!isDirectModalOpen) return;
        void loadSubjectCreditSummary({ clientId: directClientId }, setDirectCreditSummary, setDirectCreditLoading);
    }, [isDirectModalOpen, directClientId, loadSubjectCreditSummary]);

    // Close Drawers/Modals on Escape
    useEffect(() => {
        if (!drawerSaleId && !selectedObligationId && !isLimitModalOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (drawerSaleId && !settling && !cancellingId) setDrawerSaleId(null);
            if (selectedObligationId && !obligationPaySubmitting) setSelectedObligationId(null);
            if (isLimitModalOpen && !limitSubmitting) setIsLimitModalOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        drawerSaleId,
        settling,
        cancellingId,
        selectedObligationId,
        obligationPaySubmitting,
        isLimitModalOpen,
        limitSubmitting,
    ]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, channelFilter, trafficFilter, query, pageSize]);

    const statusCounts = useMemo(() => {
        return sales.reduce(
            (acc, sale) => {
                acc.ALL += 1;
                acc[sale.status] = (acc[sale.status] || 0) + 1;
                return acc;
            },
            { ALL: 0, DRAFT: 0, PENDING_PAYMENT: 0, PAID: 0, CANCELLED: 0, EXPIRED: 0 } as Record<StatusFilter | CommerceSaleStatus, number>,
        );
    }, [sales]);

    const summary = useMemo(() => {
        return sales.reduce(
            (acc, sale) => {
                if (sale.status === 'PENDING_PAYMENT') {
                    acc.pendingCount += 1;
                    acc.pendingBalance += Number(sale.balanceDue || 0);
                    acc.reservedUnits += sale.reservations
                        .filter((res) => res.status === 'ACTIVE')
                        .reduce((sum, res) => sum + Number(res.quantity || 0), 0);
                    const traffic = getReservationTraffic(sale, nowMs);
                    if (traffic.color === 'RED') acc.criticalCount += 1;
                } else if (sale.status === 'PAID') {
                    acc.paidCount += 1;
                    acc.paidTotal += Number(sale.totalAmount || 0);
                }
                return acc;
            },
            { pendingCount: 0, pendingBalance: 0, criticalCount: 0, paidCount: 0, paidTotal: 0, reservedUnits: 0 },
        );
    }, [sales, nowMs]);

    const filteredAndSortedSales = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const filtered = sales.filter((sale) => {
            if (statusFilter !== 'ALL' && sale.status !== statusFilter) return false;
            if (channelFilter !== 'ALL' && sale.salesChannel !== channelFilter) return false;
            if (trafficFilter !== 'ALL') {
                const traffic = getReservationTraffic(sale, nowMs);
                if (traffic.color !== trafficFilter) return false;
            }
            if (!needle) return true;
            const haystacks = [
                sale.handoffCode,
                sale.id,
                sale.customerName,
                sale.customerPhone,
                sale.resellerName,
                sale.resellerEmail,
                sale.notes,
                ...sale.items.flatMap((item) => [item.skuSnapshot, item.nameSnapshot]),
            ];
            return haystacks.some((value) => String(value || '').toLowerCase().includes(needle));
        });

        const directionMultiplier = sortConfig.direction === 'asc' ? 1 : -1;
        return [...filtered].sort((a, b) => {
            switch (sortConfig.key) {
                case 'handoffCode':
                    return a.handoffCode.localeCompare(b.handoffCode) * directionMultiplier;
                case 'urgency': {
                    const aMin = getReservationTraffic(a, nowMs).minutesLeft ?? 999999;
                    const bMin = getReservationTraffic(b, nowMs).minutesLeft ?? 999999;
                    return (aMin - bMin) * directionMultiplier;
                }
                case 'resellerName':
                    return displayOperatorName(a.resellerName, a.resellerEmail)
                        .localeCompare(displayOperatorName(b.resellerName, b.resellerEmail)) * directionMultiplier;
                case 'customerName':
                    return String(a.customerName || 'ZZZ').localeCompare(String(b.customerName || 'ZZZ')) * directionMultiplier;
                case 'itemCount': {
                    const aCount = a.items.reduce((sum, i) => sum + i.quantity, 0);
                    const bCount = b.items.reduce((sum, i) => sum + i.quantity, 0);
                    return (aCount - bCount) * directionMultiplier;
                }
                case 'totalAmount':
                    return (Number(a.totalAmount) - Number(b.totalAmount)) * directionMultiplier;
                case 'balanceDue':
                    return (Number(a.balanceDue) - Number(b.balanceDue)) * directionMultiplier;
                case 'status':
                    return a.status.localeCompare(b.status) * directionMultiplier;
                case 'createdAt':
                default:
                    return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * directionMultiplier;
            }
        });
    }, [sales, statusFilter, channelFilter, trafficFilter, query, sortConfig, nowMs]);

    const totalPages = Math.max(1, Math.ceil(filteredAndSortedSales.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedSales = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return filteredAndSortedSales.slice(start, start + pageSize);
    }, [filteredAndSortedSales, safePage, pageSize]);

    const requestSort = (key: SortKey) => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    const getSortIcon = (key: SortKey) => {
        if (sortConfig.key !== key) {
            return <span className="material-symbols-outlined text-[14px] opacity-0 group-hover/th:opacity-40 transition-opacity">unfold_more</span>;
        }
        return sortConfig.direction === 'asc' ? (
            <span className="material-symbols-outlined text-[14px] text-red-500">arrow_upward</span>
        ) : (
            <span className="material-symbols-outlined text-[14px] text-red-500">arrow_downward</span>
        );
    };

    const copyHandoffCode = (code: string, event?: React.MouseEvent) => {
        if (event) event.stopPropagation();
        if (navigator.clipboard?.writeText) {
            void navigator.clipboard.writeText(code).then(() => {
                setCopiedCode(code);
                window.setTimeout(() => setCopiedCode((current) => (current === code ? null : current)), 2000);
            });
        }
    };

    const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;
        const normalized = query.trim().toUpperCase();
        if (!normalized) return;
        const exactMatch = sales.find((sale) => sale.handoffCode.toUpperCase() === normalized);
        if (exactMatch) {
            setDrawerSaleId(exactMatch.id);
            return;
        }
        if (filteredAndSortedSales.length === 1) {
            setDrawerSaleId(filteredAndSortedSales[0].id);
        }
    };

    const buildFinancingPayload = (params: {
        mode: FinancingMode;
        totalAmount: number;
        cashAmountRaw: string;
        method: string;
        reference: string;
        mixedFacility: CreditFacilityType;
        nonRevolvingTitle: string;
        allowOverdueOverride: boolean;
        allowPartialCash: boolean;
    }): {
        payments?: Array<{ amount: number; method: string; reference?: string }>;
        creditDrawdowns?: Array<{ facilityType: CreditFacilityType; amount: number; title?: string }>;
        allowOverdueOverride?: boolean;
        error?: string;
    } => {
        const total = roundMoney(params.totalAmount);
        if (total <= 0) {
            return { error: 'El total debe ser mayor a 0.' };
        }
        if (params.mode === 'CASH') {
            const cash = params.allowPartialCash ? roundMoney(Number(params.cashAmountRaw)) : total;
            if (!Number.isFinite(cash) || cash <= 0) {
                return { error: 'Ingresa un monto de pago válido mayor a 0.' };
            }
            if (cash > total) {
                return { error: `El monto (${money(cash)}) excede el saldo pendiente (${money(total)}).` };
            }
            return {
                payments: [
                    {
                        amount: cash,
                        method: params.method,
                        reference: params.reference.trim() || undefined,
                    },
                ],
            };
        }

        if (params.mode === 'REVOLVING' || params.mode === 'NON_REVOLVING') {
            return {
                creditDrawdowns: [
                    {
                        facilityType: params.mode,
                        amount: total,
                        title:
                            params.mode === 'NON_REVOLVING'
                                ? params.nonRevolvingTitle.trim() || undefined
                                : undefined,
                    },
                ],
                allowOverdueOverride: params.allowOverdueOverride || undefined,
            };
        }

        const cash = roundMoney(Number(params.cashAmountRaw));
        if (!Number.isFinite(cash) || cash <= 0 || cash >= total) {
            return { error: 'En modalidad mixta el enganche en caja debe ser mayor a 0 y menor al total.' };
        }
        const remainder = roundMoney(total - cash);
        return {
            payments: [
                {
                    amount: cash,
                    method: params.method,
                    reference: params.reference.trim() || undefined,
                },
            ],
            creditDrawdowns: [
                {
                    facilityType: params.mixedFacility,
                    amount: remainder,
                    title:
                        params.mixedFacility === 'NON_REVOLVING'
                            ? params.nonRevolvingTitle.trim() || undefined
                            : undefined,
                },
            ],
            allowOverdueOverride: params.allowOverdueOverride || undefined,
        };
    };

    const handleSettle = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedSale) return;
        setActionError('');

        const built = buildFinancingPayload({
            mode: settleFinancingMode,
            totalAmount: selectedSale.balanceDue,
            cashAmountRaw: payAmount,
            method: payMethod,
            reference: payReference,
            mixedFacility: settleMixedFacility,
            nonRevolvingTitle: settleNonRevolvingTitle,
            allowOverdueOverride: settleAllowOverdueOverride,
            allowPartialCash: true,
        });
        if (built.error) {
            setActionError(built.error);
            return;
        }

        const effectiveClientId =
            settleClientIdOverride && settleClientIdOverride !== (selectedSale.clientId || '')
                ? settleClientIdOverride
                : undefined;

        setSettling(true);
        const paymentNotes = settleNotes.trim();
        const fingerprint = JSON.stringify({
            saleId: selectedSale.id,
            payments: built.payments || [],
            creditDrawdowns: built.creditDrawdowns || [],
            clientId: effectiveClientId || selectedSale.clientId || null,
            allowOverdueOverride: Boolean(built.allowOverdueOverride),
            notes: paymentNotes,
        });
        if (settleRequestRef.current?.fingerprint !== fingerprint) {
            settleRequestRef.current = { fingerprint, key: createIdempotencyKey() };
        }
        const idempotencyKey = settleRequestRef.current.key;
        try {
            const response = await api.post<CommerceSale>(
                `/commerce/sales/${selectedSale.id}/settle`,
                {
                    payments: built.payments,
                    creditDrawdowns: built.creditDrawdowns,
                    clientId: effectiveClientId || (selectedSale.clientId || undefined),
                    allowOverdueOverride: built.allowOverdueOverride,
                    notes: paymentNotes || undefined,
                },
                {
                    headers: { 'Idempotency-Key': idempotencyKey },
                },
            );
            const updated = response.data;
            settleRequestRef.current = null;
            setSales((prev) => prev.map((sale) => (sale.id === updated.id ? updated : sale)));
            setNotice(
                updated.status === 'PAID'
                    ? (updated.creditedAmount || 0) > 0
                        ? `Orden ${updated.handoffCode} liquidada (${money(updated.paidAmount, updated.currency)} en caja · ${money(updated.creditedAmount || 0, updated.currency)} a crédito 30d). Inventario descontado y Kardex actualizado.`
                        : `Orden ${updated.handoffCode} liquidada (${money(updated.totalAmount, updated.currency)}). Inventario descontado y registrado en Kardex.`
                    : `Abono registrado en ${updated.handoffCode}. Saldo pendiente: ${money(updated.balanceDue, updated.currency)}.`,
            );
            if (updated.status === 'PAID') {
                setDrawerSaleId(null);
            }
            void loadSales();
            void loadCreditPortfolio();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'No fue posible registrar el cobro.';
            setActionError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setSettling(false);
        }
    };

    const handleCancelSale = async (targetSale: CommerceSale, customReason?: string) => {
        setActionError('');
        setCancellingId(targetSale.id);
        try {
            const response = await api.post<CommerceSale>(`/commerce/sales/${targetSale.id}/cancel`, {
                reason: (customReason ?? cancelReason).trim() || undefined,
            });
            const updated = response.data;
            setSales((prev) => prev.map((sale) => (sale.id === updated.id ? updated : sale)));
            setNotice(`Orden ${updated.handoffCode} cancelada y reserva de inventario liberada.`);
            if (drawerSaleId === targetSale.id) {
                setDrawerSaleId(null);
            }
            void loadSales();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'No fue posible cancelar la orden.';
            if (drawerSaleId === targetSale.id) {
                setActionError(Array.isArray(message) ? message.join(', ') : String(message));
            } else {
                setError(Array.isArray(message) ? message.join(', ') : String(message));
            }
        } finally {
            setCancellingId(null);
        }
    };

    const openDirectModal = async () => {
        setIsDirectModalOpen(true);
        setDirectError('');
        setCatalogSearch('');
        setShowClientSuggestions(false);
        setDirectFinancingMode('CASH');
        setDirectMixedFacility('REVOLVING');
        setDirectCashAmount('');
        setDirectNonRevolvingTitle('');
        setDirectAllowOverdueOverride(false);
        setDirectCreditSummary(null);
        setCatalogLoading(true);
        try {
            const [catalogRes, clientsRes] = await Promise.all([
                api.get<CatalogProduct[]>('/commerce/catalog'),
                api.get<PosClientOption[]>('/clients').catch(() => ({ data: [] as PosClientOption[] })),
            ]);
            setCatalog(Array.isArray(catalogRes.data) ? catalogRes.data : []);
            setDirectClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'No fue posible cargar el catálogo POS.';
            setDirectError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setCatalogLoading(false);
        }
    };

    const matchingClients = useMemo(() => {
        const needle = directCustomerName.trim().toLowerCase();
        if (!needle) return directClients.slice(0, 6);
        return directClients
            .filter((client) =>
                [client.name, client.phone, client.email].some((v) =>
                    String(v || '').toLowerCase().includes(needle),
                ),
            )
            .slice(0, 6);
    }, [directClients, directCustomerName]);

    const filteredCatalog = useMemo(() => {
        const needle = catalogSearch.trim().toLowerCase();
        if (!needle) return catalog;
        return catalog.filter((product) =>
            [product.sku, product.name, product.category].some((val) =>
                String(val || '').toLowerCase().includes(needle),
            ),
        );
    }, [catalog, catalogSearch]);

    const directItems = useMemo(() => {
        return catalog
            .filter((product) => (directCart[product.id] || 0) > 0)
            .map((product) => ({
                product,
                quantity: directCart[product.id],
                lineTotal: Number(product.unitPrice || 0) * directCart[product.id],
            }));
    }, [catalog, directCart]);

    const directTotal = useMemo(
        () => directItems.reduce((sum, item) => sum + item.lineTotal, 0),
        [directItems],
    );

    const handleCreateDirectSale = async (event: React.FormEvent) => {
        event.preventDefault();
        if (directItems.length === 0) {
            setDirectError('Selecciona al menos una pieza para registrar la venta.');
            return;
        }
        setDirectError('');

        let built: ReturnType<typeof buildFinancingPayload> | null = null;
        if (directCollectNow) {
            const fallbackTitle = directItems
                .map((entry) => `${entry.quantity}x ${entry.product.name}`)
                .join(', ')
                .slice(0, 120);
            built = buildFinancingPayload({
                mode: directFinancingMode,
                totalAmount: directTotal,
                cashAmountRaw: directCashAmount,
                method: directMethod,
                reference: directReference,
                mixedFacility: directMixedFacility,
                nonRevolvingTitle: directNonRevolvingTitle || fallbackTitle,
                allowOverdueOverride: directAllowOverdueOverride,
                allowPartialCash: false,
            });
            if (built.error) {
                setDirectError(built.error);
                return;
            }
            if (directFinancingMode !== 'CASH' && !directClientId) {
                setDirectError('Selecciona un cliente registrado para otorgar crédito a 30 días.');
                return;
            }
        }

        setDirectSubmitting(true);
        try {
            const payload = {
                items: directItems.map((entry) => ({
                    productId: entry.product.id,
                    quantity: entry.quantity,
                })),
                customerName: directCustomerName.trim() || undefined,
                customerPhone: directCustomerPhone.trim() || undefined,
                clientId: directClientId || undefined,
                notes: directNotes.trim() || undefined,
                payments: built?.payments,
                creditDrawdowns: built?.creditDrawdowns,
                allowOverdueOverride: built?.allowOverdueOverride,
            };
            const response = await api.post<CommerceSale>('/commerce/sales', payload, {
                headers: { 'Idempotency-Key': createIdempotencyKey() },
            });
            const created = response.data;
            setIsDirectModalOpen(false);
            setDirectCart({});
            setDirectClientId(null);
            setDirectCustomerName('');
            setDirectCustomerPhone('');
            setDirectReference('');
            setDirectCashAmount('');
            setDirectNotes('');
            setDirectFinancingMode('CASH');
            setDirectNonRevolvingTitle('');
            setDirectAllowOverdueOverride(false);
            setStatusFilter(created.status === 'PAID' ? 'PAID' : 'PENDING_PAYMENT');
            setNotice(
                created.status === 'PAID'
                    ? (created.creditedAmount || 0) > 0
                        ? `Venta directa ${created.handoffCode} aplicada (${money(created.paidAmount, created.currency)} contado · ${money(created.creditedAmount || 0, created.currency)} crédito 30d).`
                        : `Venta directa ${created.handoffCode} cobrada por ${money(created.totalAmount, created.currency)}.`
                    : `Orden ${created.handoffCode} creada con reserva de inventario por 30 min.`,
            );
            void loadSales();
            void loadCreditPortfolio();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'No fue posible registrar la venta directa.';
            setDirectError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setDirectSubmitting(false);
        }
    };

    const handleRecordObligationPayment = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedObligation) return;
        setObligationPayError('');
        const amount = roundMoney(Number(obligationPayAmount));
        if (!Number.isFinite(amount) || amount <= 0) {
            setObligationPayError('Ingresa un monto de abono válido mayor a 0.');
            return;
        }
        if (amount > roundMoney(selectedObligation.balanceDue)) {
            setObligationPayError(`El abono (${money(amount)}) excede el saldo vencido/pendiente (${money(selectedObligation.balanceDue)}).`);
            return;
        }

        setObligationPaySubmitting(true);
        const fingerprint = [
            selectedObligation.id,
            amount.toFixed(2),
            obligationPayMethod,
            obligationPayReference.trim(),
            obligationPayNotes.trim(),
        ].join('|');
        if (obligationPayRef.current?.fingerprint !== fingerprint) {
            obligationPayRef.current = { fingerprint, key: createIdempotencyKey() };
        }
        try {
            const response = await api.post<{ obligation: CreditObligationItem; replayed: boolean }>(
                `/commerce/credit/obligations/${selectedObligation.id}/payments`,
                {
                    amount,
                    method: obligationPayMethod,
                    reference: obligationPayReference.trim() || undefined,
                    notes: obligationPayNotes.trim() || undefined,
                },
                {
                    headers: { 'Idempotency-Key': obligationPayRef.current.key },
                },
            );
            const updated = response.data.obligation;
            obligationPayRef.current = null;
            setNotice(
                updated.facilityType === 'REVOLVING'
                    ? `Abono ${money(amount, updated.currency)} aplicado a ${updated.code}. Cupo revolvente restaurado inmediatamente.`
                    : `Abono ${money(amount, updated.currency)} aplicado a línea no revolvente ${updated.code}. Saldo: ${money(updated.balanceDue, updated.currency)}.`,
            );
            if (updated.status === 'PAID') {
                setSelectedObligationId(null);
            }
            void loadCreditPortfolio();
            void loadSales();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'No fue posible registrar el abono al crédito.';
            setObligationPayError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setObligationPaySubmitting(false);
        }
    };

    const openLimitModal = (preset?: CreditAccountSummary) => {
        setLimitError('');
        if (preset) {
            setLimitSubjectType(preset.subjectType);
            setLimitSubjectId((preset.subjectType === 'RESELLER' ? preset.resellerId : preset.clientId) || '');
            setLimitAmount(String(preset.revolvingLimit || 0));
            setLimitTermDays(String(preset.defaultTermDays || 30));
            setLimitStatus(preset.status || 'ACTIVE');
            setLimitNotes(preset.notes || '');
        } else {
            const firstReseller = creditSubjects.resellers[0]?.id || '';
            const firstClient = creditSubjects.clients[0]?.id || '';
            const initialType: CreditSubjectType = firstReseller ? 'RESELLER' : 'CLIENT';
            setLimitSubjectType(initialType);
            setLimitSubjectId(initialType === 'RESELLER' ? firstReseller : firstClient);
            setLimitAmount('50000');
            setLimitTermDays('30');
            setLimitStatus('ACTIVE');
            setLimitNotes('');
        }
        setIsLimitModalOpen(true);
    };

    const handleCreateCreditNote = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedObligation) return;
        const amount = roundMoney(Number(creditNoteAmount));
        if (!Number.isFinite(amount) || amount <= 0 || amount > roundMoney(selectedObligation.balanceDue)) {
            setCreditNoteError('Ingresa un importe válido que no exceda el saldo pendiente.');
            return;
        }
        if (creditNoteReason.trim().length < 3) {
            setCreditNoteError('Indica el motivo de la nota de crédito.');
            return;
        }
        setCreditNoteSubmitting(true);
        setCreditNoteError('');
        try {
            await api.post(`/commerce/credit/obligations/${selectedObligation.id}/credit-notes`, {
                amount,
                reason: creditNoteReason.trim(),
                notes: creditNoteNotes.trim() || undefined,
            });
            setCreditNoteAmount('');
            setCreditNoteReason('');
            setCreditNoteNotes('');
            await loadCreditPortfolio();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'No fue posible emitir la nota de crédito.';
            setCreditNoteError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setCreditNoteSubmitting(false);
        }
    };

    const handleSaveCreditAccount = async (event: React.FormEvent) => {
        event.preventDefault();
        setLimitError('');
        if (!limitSubjectId) {
            setLimitError('Selecciona un revendedor o cliente registrado.');
            return;
        }
        const parsedLimit = roundMoney(Number(limitAmount));
        const parsedTerm = Math.max(1, Math.min(365, Math.round(Number(limitTermDays) || 30)));
        if (!Number.isFinite(parsedLimit) || parsedLimit < 0) {
            setLimitError('Ingresa un límite revolvente válido (0 o mayor).');
            return;
        }
        setLimitSubmitting(true);
        try {
            const response = await api.put<CreditAccountSummary>('/commerce/credit/accounts', {
                subjectType: limitSubjectType,
                resellerId: limitSubjectType === 'RESELLER' ? limitSubjectId : undefined,
                clientId: limitSubjectType === 'CLIENT' ? limitSubjectId : undefined,
                revolvingLimit: parsedLimit,
                defaultTermDays: parsedTerm,
                status: limitStatus,
                notes: limitNotes.trim() || undefined,
            });
            setIsLimitModalOpen(false);
            setNotice(
                `Cuenta revolvente actualizada para ${response.data.subjectName || 'el sujeto'}: Límite ${money(response.data.revolvingLimit, response.data.currency)} (${response.data.defaultTermDays} días).`,
            );
            void loadCreditPortfolio();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'No fue posible guardar la línea revolvente.';
            setLimitError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setLimitSubmitting(false);
        }
    };

    const hasActiveFilters = statusFilter !== 'PENDING_PAYMENT' || channelFilter !== 'ALL' || trafficFilter !== 'ALL' || Boolean(query.trim());

    const HeaderTh: React.FC<{ label: string; sortKey: SortKey; align?: 'left' | 'right' | 'center' }> = ({
        label,
        sortKey,
        align = 'left',
    }) => (
        <th
            onClick={() => requestSort(sortKey)}
            className={`px-5 py-4 text-${align} group/th cursor-pointer hover:bg-zinc-100/60 dark:hover:bg-white/[0.02] transition-colors select-none`}
        >
            <div className={`inline-flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
                <span className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                    {label}
                </span>
                {getSortIcon(sortKey)}
            </div>
        </th>
    );

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-background p-4 sm:p-6 lg:p-8 text-foreground transition-colors duration-300">
            <div className="w-full max-w-[1600px] mx-auto space-y-6">
                {/* Header estilo Orders.tsx */}
                <header className="flex flex-col gap-5">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-[0.25em]">
                                <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                                Omnichannel OMS · Caja Cared
                            </div>
                            <h1 className="text-foreground text-3xl font-black tracking-tight font-display transition-colors">
                                {workspaceTab === 'SALES' ? 'Órdenes de Venta POS' : 'Crédito y Cartera (30d)'}
                            </h1>
                            <p className="text-muted-foreground text-sm transition-colors">
                                {workspaceTab === 'SALES'
                                    ? 'Gestiona, filtra y liquida de forma ágil los pases de revendedores y ventas de mostrador.'
                                    : 'Control dual de líneas revolventes permanentes y créditos individuales por pieza a 30 días.'}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    void loadSales();
                                    void loadCreditPortfolio();
                                }}
                                disabled={loading || creditLoading}
                                className="flex items-center gap-2 h-11 px-4 rounded-xl border border-border bg-card text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-red-500 disabled:opacity-50 transition-all cursor-pointer"
                            >
                                <span
                                    className={`material-symbols-outlined text-[18px] ${loading || creditLoading ? 'animate-spin' : ''}`}
                                    aria-hidden="true"
                                >
                                    refresh
                                </span>
                                <span>{loading || creditLoading ? 'Actualizando…' : 'Actualizar'}</span>
                            </button>
                            {workspaceTab === 'CREDIT' && isCreditAdmin ? (
                                <button
                                    type="button"
                                    onClick={() => openLimitModal()}
                                    className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add_card</span>
                                    <span>Asignar Límite Revolvente</span>
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => void openDirectModal()}
                                className="flex items-center gap-2 bg-foreground text-background hover:opacity-90 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add_shopping_cart</span>
                                <span>Nueva Venta Directa</span>
                            </button>
                        </div>
                    </div>

                    {/* Selector de Módulo: Órdenes de Venta vs Crédito y Cartera */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
                        <button
                            type="button"
                            onClick={() => setWorkspaceTab('SALES')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border cursor-pointer ${
                                workspaceTab === 'SALES'
                                    ? 'bg-foreground text-background border-foreground shadow-sm'
                                    : 'bg-card text-muted-foreground border-border hover:text-foreground'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
                            <span>Órdenes de Venta</span>
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-500/15 text-red-500">
                                {statusCounts.PENDING_PAYMENT || 0}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setWorkspaceTab('CREDIT')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border cursor-pointer ${
                                workspaceTab === 'CREDIT'
                                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                    : 'bg-card text-muted-foreground border-border hover:text-foreground'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                            <span>Crédito y Cartera (30d)</span>
                            {creditPortfolioSummary.overdueCount > 0 ? (
                                <span
                                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                        workspaceTab === 'CREDIT'
                                            ? 'bg-white text-red-600'
                                            : 'bg-rose-500 text-white animate-pulse'
                                    }`}
                                >
                                    {creditPortfolioSummary.overdueCount} venc.
                                </span>
                            ) : (
                                <span
                                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                        workspaceTab === 'CREDIT'
                                            ? 'bg-white/20 text-white'
                                            : 'bg-muted text-muted-foreground'
                                    }`}
                                >
                                    {creditPortfolioSummary.openCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {workspaceTab === 'SALES' && (
                    <>
                    {/* Cinta de KPIs ejecutivos */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                        <div className="bg-card rounded-2xl border border-border px-5 py-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Por cobrar</p>
                                <p className="text-2xl font-black mt-1 text-amber-500 dark:text-amber-400">
                                    {money(summary.pendingBalance)}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                                    {summary.pendingCount} {summary.pendingCount === 1 ? 'orden activa' : 'órdenes activas'}
                                </p>
                            </div>
                            <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
                            </div>
                        </div>

                        <div className="bg-card rounded-2xl border border-border px-5 py-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reservas críticas (&lt;10m)</p>
                                <p className={`text-2xl font-black mt-1 ${summary.criticalCount > 0 ? 'text-rose-500' : 'text-foreground'}`}>
                                    {summary.criticalCount}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                                    Prioridad de atención en caja
                                </p>
                            </div>
                            <div className={`size-10 rounded-xl border flex items-center justify-center ${
                                summary.criticalCount > 0
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                                    : 'bg-muted border-border text-muted-foreground'
                            }`}>
                                <span className="material-symbols-outlined text-[20px]">timer</span>
                            </div>
                        </div>

                        <div className="bg-card rounded-2xl border border-border px-5 py-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Piezas reservadas</p>
                                <p className="text-2xl font-black mt-1 text-foreground">{summary.reservedUnits}</p>
                                <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                                    Apartadas temporalmente (30m)
                                </p>
                            </div>
                            <div className="size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                                <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                            </div>
                        </div>

                        <div className="bg-card rounded-2xl border border-border px-5 py-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cobradas ({summary.paidCount})</p>
                                <p className="text-2xl font-black mt-1 text-emerald-500 dark:text-emerald-400">
                                    {money(summary.paidTotal)}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                                    Liquidadas y en Kardex
                                </p>
                            </div>
                            <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                <span className="material-symbols-outlined text-[20px]">verified</span>
                            </div>
                        </div>
                    </div>

                    {/* Barra de búsqueda, píldoras de estado y semáforo estilo Reparaciones */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="relative w-full max-w-md group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined text-muted-foreground group-focus-within:text-foreground transition-colors">
                                    search
                                </span>
                            </div>
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                className="block w-full pl-11 pr-9 py-3 border border-border rounded-xl bg-muted/50 text-foreground placeholder-muted-foreground focus:border-red-500 outline-none text-sm transition-all shadow-sm"
                                placeholder="Buscar por folio (ej. ORD-35D93A27 + Enter), cliente, revendedor o SKU..."
                                type="text"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 size-5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                                    title="Limpiar búsqueda"
                                >
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {([
                                { id: 'PENDING_PAYMENT', label: 'Por Cobrar' },
                                { id: 'PAID', label: 'Pagadas' },
                                { id: 'CANCELLED', label: 'Canceladas' },
                                { id: 'EXPIRED', label: 'Expiradas' },
                                { id: 'ALL', label: 'Todas' },
                            ] as { id: StatusFilter; label: string }[]).map((tab) => {
                                const isActive = statusFilter === tab.id;
                                const count = statusCounts[tab.id] || 0;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setStatusFilter(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border shadow-sm whitespace-nowrap cursor-pointer ${
                                            isActive
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md font-black shadow-emerald-600/20'
                                                : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80 hover:text-foreground'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                            isActive ? 'bg-white/20 text-white' : 'bg-background/70 text-muted-foreground'
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}

                            {/* Selector de Canal */}
                            <select
                                aria-label="Canal de venta"
                                value={channelFilter}
                                onChange={(event) => setChannelFilter(event.target.value as ChannelFilter)}
                                className="h-10 rounded-xl bg-muted border border-border px-3 text-xs font-bold uppercase tracking-widest text-foreground focus:border-red-500 focus:outline-none cursor-pointer"
                            >
                                <option value="ALL">Todos los canales</option>
                                <option value="RESELLER_POS">Revendedor</option>
                                <option value="JEWELRY_INTERNAL">Caja Cared</option>
                            </select>

                            {/* Semáforo de Vigencia (RF-03 adaptado a reservas POS) */}
                            <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter('PENDING_PAYMENT');
                                        setTrafficFilter(trafficFilter === 'RED' ? 'ALL' : 'RED');
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shadow-xs cursor-pointer whitespace-nowrap ${
                                        trafficFilter === 'RED'
                                            ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/30'
                                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                                    }`}
                                    title="Reservas con menos de 10 minutos restantes"
                                >
                                    <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
                                    <span>&lt; 10m</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter('PENDING_PAYMENT');
                                        setTrafficFilter(trafficFilter === 'YELLOW' ? 'ALL' : 'YELLOW');
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shadow-xs cursor-pointer whitespace-nowrap ${
                                        trafficFilter === 'YELLOW'
                                            ? 'bg-amber-500 text-black border-amber-500 shadow-md ring-2 ring-amber-500/30'
                                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                    }`}
                                    title="Reservas entre 10 y 20 minutos restantes"
                                >
                                    <span className="size-2 rounded-full bg-amber-500" />
                                    <span>10–20m</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter('PENDING_PAYMENT');
                                        setTrafficFilter(trafficFilter === 'GREEN' ? 'ALL' : 'GREEN');
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shadow-xs cursor-pointer whitespace-nowrap ${
                                        trafficFilter === 'GREEN'
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
                                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                    }`}
                                    title="Reservas con más de 20 minutos restantes"
                                >
                                    <span className="size-2 rounded-full bg-emerald-500" />
                                    <span>&gt; 20m</span>
                                </button>
                            </div>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter('PENDING_PAYMENT');
                                        setChannelFilter('ALL');
                                        setTrafficFilter('ALL');
                                        setQuery('');
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all whitespace-nowrap cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[16px]">filter_list_off</span>
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </div>
                    </>
                    )}

                    {workspaceTab === 'CREDIT' && (
                    <>
                    {/* KPIs de Cartera Dual (30 días) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                        <div className="bg-card rounded-2xl border border-border px-5 py-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Revolvente Disponible</p>
                                <p className="text-2xl font-black mt-1 text-emerald-500 dark:text-emerald-400">
                                    {money(creditPortfolioSummary.totalRevolvingAvailable)}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                                    Límite total: {money(creditPortfolioSummary.totalRevolvingLimit)}
                                </p>
                            </div>
                            <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                <span className="material-symbols-outlined text-[20px]">autorenew</span>
                            </div>
                        </div>

                        <div className="bg-card rounded-2xl border border-border px-5 py-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Revolvente Utilizado</p>
                                <p className="text-2xl font-black mt-1 text-foreground">
                                    {money(creditPortfolioSummary.totalRevolvingUsed)}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                                    Se libera al cobrar abonos
                                </p>
                            </div>
                            <div className="size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                                <span className="material-symbols-outlined text-[20px]">credit_score</span>
                            </div>
                        </div>

                        <div className="bg-card rounded-2xl border border-border px-5 py-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No Revolvente Activo (x Pieza)</p>
                                <p className="text-2xl font-black mt-1 text-amber-500 dark:text-amber-400">
                                    {money(creditPortfolioSummary.totalNonRevolvingBalance)}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                                    Líneas individuales a 30 días
                                </p>
                            </div>
                            <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                            </div>
                        </div>

                        <div className="bg-card rounded-2xl border border-border px-5 py-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cartera Vencida (&gt;30d)</p>
                                <p className={`text-2xl font-black mt-1 ${creditPortfolioSummary.overdueCount > 0 ? 'text-rose-500' : 'text-foreground'}`}>
                                    {money(creditPortfolioSummary.totalOverdueBalance)}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                                    {creditPortfolioSummary.overdueCount} {creditPortfolioSummary.overdueCount === 1 ? 'obligación vencida' : 'obligaciones vencidas'}
                                </p>
                            </div>
                            <div
                                className={`size-10 rounded-xl border flex items-center justify-center ${
                                    creditPortfolioSummary.overdueCount > 0
                                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                                        : 'bg-muted border-border text-muted-foreground'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[20px]">event_busy</span>
                            </div>
                        </div>
                    </div>

                    {/* Filtros y Sub-tabs de Cartera */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setCreditSubTab('OBLIGATIONS')}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all cursor-pointer ${
                                    creditSubTab === 'OBLIGATIONS'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                        : 'bg-muted text-muted-foreground border-transparent hover:text-foreground'
                                }`}
                            >
                                Obligaciones a 30 días ({creditObligations.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreditSubTab('ACCOUNTS')}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all cursor-pointer ${
                                    creditSubTab === 'ACCOUNTS'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                        : 'bg-muted text-muted-foreground border-transparent hover:text-foreground'
                                }`}
                            >
                                Cuentas y Límites Revolventes ({creditAccounts.length})
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="relative w-64">
                                <input
                                    type="text"
                                    value={creditQuery}
                                    onChange={(e) => setCreditQuery(e.target.value)}
                                    placeholder="Buscar sujeto, folio CR- o ORD-..."
                                    className="w-full h-10 rounded-xl border border-border bg-muted/50 px-3.5 text-xs text-foreground placeholder-muted-foreground focus:border-red-500 focus:outline-none"
                                />
                            </div>
                            <select
                                aria-label="Tipo de sujeto"
                                value={creditSubjectTypeFilter}
                                onChange={(e) => setCreditSubjectTypeFilter(e.target.value as 'ALL' | CreditSubjectType)}
                                className="h-10 rounded-xl bg-muted border border-border px-3 text-xs font-bold text-foreground focus:border-red-500 focus:outline-none"
                            >
                                <option value="ALL">Revendedores y Clientes</option>
                                <option value="RESELLER">Solo Revendedores</option>
                                <option value="CLIENT">Solo Clientes</option>
                            </select>
                            {creditSubTab === 'OBLIGATIONS' && (
                                <>
                                    <select
                                        aria-label="Modalidad de crédito"
                                        value={creditFacilityFilter}
                                        onChange={(e) => setCreditFacilityFilter(e.target.value as 'ALL' | CreditFacilityType)}
                                        className="h-10 rounded-xl bg-muted border border-border px-3 text-xs font-bold text-foreground focus:border-red-500 focus:outline-none"
                                    >
                                        <option value="ALL">Todas las modalidades</option>
                                        <option value="REVOLVING">Revolvente 30d</option>
                                        <option value="NON_REVOLVING">No Revolvente 30d (x Pieza)</option>
                                    </select>
                                    <select
                                        aria-label="Estado de obligación"
                                        value={creditStatusFilter}
                                        onChange={(e) =>
                                            setCreditStatusFilter(
                                                e.target.value as 'ALL' | 'OPEN_GROUP' | CreditObligationStatus,
                                            )
                                        }
                                        className="h-10 rounded-xl bg-muted border border-border px-3 text-xs font-bold text-foreground focus:border-red-500 focus:outline-none"
                                    >
                                        <option value="OPEN_GROUP">Activas (Vigentes + Vencidas)</option>
                                        <option value="OVERDUE">Solo Vencidas</option>
                                        <option value="OPEN">Vigentes</option>
                                        <option value="PARTIAL">Abonadas parciales</option>
                                        <option value="PAID">Liquidadas</option>
                                        <option value="ALL">Todas</option>
                                    </select>
                                </>
                            )}
                        </div>
                    </div>
                    </>
                    )}
                </header>

                {notice && (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3.5 flex items-center justify-between gap-4 text-sm text-emerald-600 dark:text-emerald-400">
                        <div className="flex items-center gap-2.5 font-semibold">
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            <span>{notice}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setNotice('')}
                            className="text-xs font-black uppercase tracking-widest hover:opacity-80 cursor-pointer"
                        >
                            Cerrar
                        </button>
                    </div>
                )}

                {(error || (workspaceTab === 'CREDIT' && creditError)) && (
                    <div role="alert" className="rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-3.5 text-sm text-red-500">
                        {workspaceTab === 'CREDIT' && creditError ? creditError : error}
                    </div>
                )}

                {workspaceTab === 'SALES' ? (
                <>
                {/* Grid Full-Width estilo OrdersTable.tsx */}
                <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 rounded-[32px] overflow-hidden backdrop-blur-sm shadow-sm dark:shadow-2xl transition-colors">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse min-w-[1080px]">
                            <thead>
                                <tr className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/60 transition-colors">
                                    <HeaderTh label="Folio" sortKey="handoffCode" />
                                    <HeaderTh label="Semáforo / Vigencia" sortKey="urgency" />
                                    <HeaderTh label="Canal / Operador" sortKey="resellerName" />
                                    <HeaderTh label="Cliente" sortKey="customerName" />
                                    <HeaderTh label="Artículos" sortKey="itemCount" />
                                    <HeaderTh label="Total" sortKey="totalAmount" align="right" />
                                    <HeaderTh label="Pagado / Saldo" sortKey="balanceDue" align="right" />
                                    <HeaderTh label="Estado" sortKey="status" align="center" />
                                    <th className="px-5 py-4 text-right text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                                {loading && sales.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-20 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                                            Cargando órdenes de venta…
                                        </td>
                                    </tr>
                                ) : paginatedSales.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-20 text-center">
                                            <p className="text-zinc-400 dark:text-zinc-500 text-xs font-black uppercase tracking-widest">
                                                No hay órdenes de venta que coincidan con los filtros actuales
                                            </p>
                                            {statusFilter !== 'ALL' && sales.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setStatusFilter('ALL');
                                                        setTrafficFilter('ALL');
                                                    }}
                                                    className="mt-3 px-4 py-2 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted transition-all cursor-pointer"
                                                >
                                                    Ver todas las órdenes ({sales.length})
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedSales.map((sale) => {
                                        const traffic = getReservationTraffic(sale, nowMs);
                                        const totalPieces = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                                        const firstItem = sale.items[0];
                                        const extraItemsCount = Math.max(0, sale.items.length - 1);
                                        const paidPct = sale.totalAmount > 0
                                            ? Math.min(100, Math.round((sale.paidAmount / sale.totalAmount) * 100))
                                            : 0;
                                        const isSelected = drawerSaleId === sale.id;

                                        return (
                                            <tr
                                                key={sale.id}
                                                onClick={() => setDrawerSaleId(sale.id)}
                                                className={`group transition-colors cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-red-500/[0.06] dark:bg-red-500/[0.09]'
                                                        : 'hover:bg-zinc-50 dark:hover:bg-white/[0.02]'
                                                }`}
                                            >
                                                {/* 1. Folio */}
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs font-black tracking-wider text-zinc-900 dark:text-white group-hover:text-red-500 transition-colors">
                                                            {sale.handoffCode}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => copyHandoffCode(sale.handoffCode, e)}
                                                            className="size-6 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center justify-center transition-colors"
                                                            title="Copiar folio"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">
                                                                {copiedCode === sale.handoffCode ? 'check' : 'content_copy'}
                                                            </span>
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                        {formatDateTime(sale.createdAt)}
                                                    </p>
                                                </td>

                                                {/* 2. Semáforo de Vigencia */}
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    {traffic.color === 'RED' && (
                                                        <div
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                                            title={traffic.description}
                                                        >
                                                            <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
                                                            <span>{traffic.label}</span>
                                                        </div>
                                                    )}
                                                    {traffic.color === 'YELLOW' && (
                                                        <div
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                                            title={traffic.description}
                                                        >
                                                            <span className="size-2 rounded-full bg-amber-500" />
                                                            <span>{traffic.label}</span>
                                                        </div>
                                                    )}
                                                    {traffic.color === 'GREEN' && (
                                                        <div
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                                            title={traffic.description}
                                                        >
                                                            <span className="size-2 rounded-full bg-emerald-500" />
                                                            <span>{traffic.label}</span>
                                                        </div>
                                                    )}
                                                    {traffic.color === 'NONE' && (
                                                        <span className="text-[11px] font-semibold text-muted-foreground" title={traffic.description}>
                                                            {traffic.label}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* 3. Canal / Operador */}
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                                                            sale.salesChannel === 'RESELLER_POS'
                                                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                                                                : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-border'
                                                        }`}>
                                                            {CHANNEL_LABELS[sale.salesChannel]}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-1">
                                                        <span className="material-symbols-outlined text-[14px] text-indigo-500">assignment_ind</span>
                                                        <span>{displayOperatorName(sale.resellerName, sale.resellerEmail)}</span>
                                                    </div>
                                                </td>

                                                {/* 4. Cliente */}
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="size-7 rounded-full flex items-center justify-center text-[9px] font-black border border-zinc-200 dark:border-zinc-800 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 shrink-0">
                                                            {getInitials(sale.customerName)}
                                                        </div>
                                                        <div>
                                                            <p className="text-zinc-900 dark:text-white text-xs font-bold uppercase tracking-tight">
                                                                {sale.customerName || 'Cliente mostrador'}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground font-mono">
                                                                {sale.customerPhone || 'Sin teléfono'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* 5. Artículos */}
                                                <td className="px-5 py-4">
                                                    {firstItem ? (
                                                        <div className="max-w-[250px]">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[10px] font-black">
                                                                    {totalPieces} {totalPieces === 1 ? 'pza' : 'pzas'}
                                                                </span>
                                                                <span className="text-zinc-800 dark:text-zinc-200 text-xs font-bold truncate">
                                                                    {firstItem.nameSnapshot}
                                                                </span>
                                                                {extraItemsCount > 0 && (
                                                                    <span className="text-[10px] font-black text-red-500 shrink-0">
                                                                        +{extraItemsCount} más
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                                                                {sale.items.map((i) => `${i.quantity}× ${i.skuSnapshot}`).join(', ')}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </td>

                                                {/* 6. Total */}
                                                <td className="px-5 py-4 text-right whitespace-nowrap">
                                                    <span className="text-zinc-900 dark:text-white font-black text-xs tracking-tight">
                                                        {money(sale.totalAmount, sale.currency)}
                                                    </span>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                        {sale.currency}
                                                    </p>
                                                </td>

                                                {/* 7. Pagado / Saldo */}
                                                <td className="px-5 py-4 text-right whitespace-nowrap">
                                                    {sale.status === 'PAID' || sale.balanceDue <= 0 ? (
                                                        <div className="inline-flex flex-col items-end gap-1">
                                                            <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-500">
                                                                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                                                Liquidada
                                                            </span>
                                                            {(sale.creditedAmount || 0) > 0 && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 border border-indigo-500/30">
                                                                    A crédito 30d: {money(sale.creditedAmount || 0, sale.currency)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex flex-col items-end">
                                                            <span className="text-xs font-black text-amber-500 dark:text-amber-400">
                                                                Saldo: {money(sale.balanceDue, sale.currency)}
                                                            </span>
                                                            {sale.paidAmount > 0 ? (
                                                                <div className="flex items-center gap-1.5 mt-1">
                                                                    <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-emerald-500"
                                                                            style={{ width: `${paidPct}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-emerald-500">
                                                                        {paidPct}%
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-muted-foreground">Sin abonos</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* 8. Estado */}
                                                <td className="px-5 py-4 text-center whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${SALE_STATUS_BADGE[sale.status]}`}>
                                                        {SALE_STATUS_LABELS[sale.status]}
                                                    </span>
                                                </td>

                                                {/* 9. Acciones Rápidas */}
                                                <td
                                                    className="px-5 py-4 text-right whitespace-nowrap"
                                                    onClick={(event) => event.stopPropagation()}
                                                >
                                                    <div className="inline-flex items-center justify-end gap-1.5">
                                                        {sale.status === 'PENDING_PAYMENT' ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDrawerSaleId(sale.id)}
                                                                    className="h-8 px-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 inline-flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">payments</span>
                                                                    <span>Cobrar</span>
                                                                </button>
                                                                {sale.paidAmount === 0 && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={cancellingId === sale.id}
                                                                        onClick={() => {
                                                                            if (window.confirm(`¿Cancelar la orden ${sale.handoffCode} y liberar su inventario reservado?`)) {
                                                                                void handleCancelSale(sale, 'Cancelada desde tabla Caja POS');
                                                                            }
                                                                        }}
                                                                        className="size-8 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 inline-flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
                                                                        title="Cancelar y liberar reserva"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => setDrawerSaleId(sale.id)}
                                                                className="h-8 px-3 rounded-xl border border-border bg-background hover:border-foreground/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                                                            >
                                                                Ver detalle
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pie de tabla y paginación para alto volumen */}
                    <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/60 dark:bg-zinc-900/40 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                            <span>
                                Mostrando{' '}
                                <strong className="text-foreground">
                                    {filteredAndSortedSales.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
                                </strong>
                                –
                                <strong className="text-foreground">
                                    {Math.min(safePage * pageSize, filteredAndSortedSales.length)}
                                </strong>{' '}
                                de <strong className="text-foreground">{filteredAndSortedSales.length}</strong> órdenes
                            </span>
                            <select
                                aria-label="Filas por página"
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                className="h-8 rounded-lg border border-border bg-background px-2 text-[11px] font-bold text-foreground"
                            >
                                <option value={25}>25 / pág.</option>
                                <option value={50}>50 / pág.</option>
                                <option value={100}>100 / pág.</option>
                            </select>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={safePage <= 1}
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    className="h-8 px-3 rounded-lg border border-border bg-background text-foreground font-bold disabled:opacity-40 cursor-pointer"
                                >
                                    Anterior
                                </button>
                                <span className="font-bold text-foreground px-2">
                                    Página {safePage} de {totalPages}
                                </span>
                                <button
                                    type="button"
                                    disabled={safePage >= totalPages}
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    className="h-8 px-3 rounded-lg border border-border bg-background text-foreground font-bold disabled:opacity-40 cursor-pointer"
                                >
                                    Siguiente
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                </>
                ) : (
                <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 rounded-[32px] overflow-hidden backdrop-blur-sm shadow-sm dark:shadow-2xl transition-colors">
                    {creditSubTab === 'OBLIGATIONS' ? (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full border-collapse min-w-[1120px]">
                                <thead>
                                    <tr className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/60">
                                        <th className="px-5 py-4 text-left text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Folio Crédito</th>
                                        <th className="px-5 py-4 text-left text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Sujeto / Contacto</th>
                                        <th className="px-5 py-4 text-left text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Modalidad</th>
                                        <th className="px-5 py-4 text-left text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Pieza / Concepto</th>
                                        <th className="px-5 py-4 text-left text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Venta POS</th>
                                        <th className="px-5 py-4 text-right text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Original / Saldo</th>
                                        <th className="px-5 py-4 text-left text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Vencimiento (30d)</th>
                                        <th className="px-5 py-4 text-center text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Estado</th>
                                        <th className="px-5 py-4 text-right text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                                    {creditLoading && creditObligations.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-20 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                                                Cargando obligaciones a 30 días…
                                            </td>
                                        </tr>
                                    ) : creditObligations.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-20 text-center text-muted-foreground text-xs font-black uppercase tracking-widest">
                                                No hay obligaciones que coincidan con el filtro seleccionado
                                            </td>
                                        </tr>
                                    ) : (
                                        creditObligations.map((obligation) => (
                                            <tr
                                                key={obligation.id}
                                                onClick={() => setSelectedObligationId(obligation.id)}
                                                className="hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                                            >
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <span className="font-mono text-xs font-black text-foreground">{obligation.code}</span>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                        {formatDateShort(obligation.issuedAt)}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                                obligation.subjectType === 'RESELLER'
                                                                    ? 'bg-red-500/10 text-red-500 border-red-500/30'
                                                                    : 'bg-sky-500/10 text-sky-500 border-sky-500/30'
                                                            }`}
                                                        >
                                                            {obligation.subjectType === 'RESELLER' ? 'Revendedor' : 'Cliente'}
                                                        </span>
                                                        <span className="text-xs font-bold text-foreground truncate max-w-[180px]">
                                                            {obligation.subjectName || '—'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                                                        {obligation.subjectPhone || obligation.subjectEmail || '—'}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                                            obligation.facilityType === 'REVOLVING'
                                                                ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30'
                                                                : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                                        }`}
                                                    >
                                                        {FACILITY_LABELS[obligation.facilityType]}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <p className="text-xs font-semibold text-foreground max-w-[220px] truncate" title={obligation.title}>
                                                        {obligation.title}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    {obligation.saleHandoffCode ? (
                                                        <span className="font-mono text-xs font-bold text-muted-foreground">
                                                            {obligation.saleHandoffCode}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-right whitespace-nowrap">
                                                    <p className="text-xs font-black text-foreground">
                                                        Saldo: {money(obligation.balanceDue, obligation.currency)}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                        De {money(obligation.principalAmount, obligation.currency)}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <p className="text-xs font-bold text-foreground">{formatDateShort(obligation.dueAt)}</p>
                                                    <p
                                                        className={`text-[10px] font-black mt-0.5 ${
                                                            obligation.status === 'PAID'
                                                                ? 'text-emerald-500'
                                                                : obligation.isOverdue || obligation.daysRemaining < 0
                                                                  ? 'text-rose-500'
                                                                  : obligation.daysRemaining <= 5
                                                                    ? 'text-amber-500'
                                                                    : 'text-muted-foreground'
                                                        }`}
                                                    >
                                                        {obligation.status === 'PAID'
                                                            ? `Pagada ${formatDateShort(obligation.paidAt)}`
                                                            : obligation.daysRemaining < 0
                                                              ? `Vencida hace ${Math.abs(obligation.daysRemaining)}d`
                                                              : `${obligation.daysRemaining}d restantes`}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4 text-center whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${OBLIGATION_STATUS_BADGE[obligation.status]}`}
                                                    >
                                                        {OBLIGATION_STATUS_LABELS[obligation.status]}
                                                    </span>
                                                </td>
                                                <td
                                                    className="px-5 py-4 text-right whitespace-nowrap"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedObligationId(obligation.id)}
                                                        className={`h-8 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                                            obligation.status !== 'PAID' && obligation.status !== 'CANCELLED'
                                                                ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                                                                : 'border border-border bg-background text-muted-foreground hover:text-foreground'
                                                        }`}
                                                    >
                                                        {obligation.status !== 'PAID' && obligation.status !== 'CANCELLED' ? 'Abonar' : 'Detalle'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full border-collapse min-w-[1040px]">
                                <thead>
                                    <tr className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/60">
                                        <th className="px-5 py-4 text-left text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Sujeto / Contacto</th>
                                        <th className="px-5 py-4 text-right text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Límite Revolvente</th>
                                        <th className="px-5 py-4 text-right text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Utilizado</th>
                                        <th className="px-5 py-4 text-right text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Disponible</th>
                                        <th className="px-5 py-4 text-right text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">No Revolvente Activo</th>
                                        <th className="px-5 py-4 text-right text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Vencido (&gt;30d)</th>
                                        <th className="px-5 py-4 text-center text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Estado</th>
                                        <th className="px-5 py-4 text-right text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                                    {creditLoading && creditAccounts.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-20 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                                                Cargando cuentas de crédito…
                                            </td>
                                        </tr>
                                    ) : creditAccounts.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-20 text-center text-muted-foreground text-xs font-black uppercase tracking-widest">
                                                No hay cuentas crediticias configuradas con ese criterio
                                            </td>
                                        </tr>
                                    ) : (
                                        creditAccounts.map((acc) => (
                                            <tr key={acc.id || `${acc.subjectType}-${acc.resellerId || acc.clientId}`} className="hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                                acc.subjectType === 'RESELLER'
                                                                    ? 'bg-red-500/10 text-red-500 border-red-500/30'
                                                                    : 'bg-sky-500/10 text-sky-500 border-sky-500/30'
                                                            }`}
                                                        >
                                                            {acc.subjectType === 'RESELLER' ? 'Revendedor' : 'Cliente'}
                                                        </span>
                                                        <span className="text-xs font-bold text-foreground">{acc.subjectName || '—'}</span>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                                        {acc.subjectPhone || acc.subjectEmail || '—'} · Plazo {acc.defaultTermDays}d
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4 text-right font-black text-xs text-foreground">
                                                    {money(acc.revolvingLimit, acc.currency)}
                                                </td>
                                                <td className="px-5 py-4 text-right font-black text-xs text-amber-500">
                                                    {money(acc.revolvingUsed, acc.currency)}
                                                </td>
                                                <td className="px-5 py-4 text-right font-black text-xs text-emerald-500">
                                                    {money(acc.revolvingAvailable, acc.currency)}
                                                </td>
                                                <td className="px-5 py-4 text-right text-xs font-bold text-foreground">
                                                    {acc.activeNonRevolvingCount} · {money(acc.activeNonRevolvingTotal, acc.currency)}
                                                </td>
                                                <td className="px-5 py-4 text-right text-xs font-black">
                                                    <span className={acc.overdueCount > 0 ? 'text-rose-500' : 'text-muted-foreground'}>
                                                        {acc.overdueCount > 0 ? `${acc.overdueCount} · ${money(acc.overdueAmount, acc.currency)}` : 'Al corriente'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-center whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                                                            acc.status === 'ACTIVE'
                                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                                                : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                                        }`}
                                                    >
                                                        {acc.status === 'ACTIVE' ? 'Activa' : 'Suspendida'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setCreditQuery(acc.subjectName || '');
                                                                setCreditSubTab('OBLIGATIONS');
                                                            }}
                                                            className="h-8 px-3 rounded-xl border border-border bg-background text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground cursor-pointer"
                                                        >
                                                            Líneas
                                                        </button>
                                                        {isCreditAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openLimitModal(acc)}
                                                                className="h-8 px-3 rounded-xl bg-foreground text-background text-[10px] font-black uppercase tracking-widest hover:opacity-90 cursor-pointer"
                                                            >
                                                                Editar límite
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                )}
            </div>

            {/* Drawer Lateral Deslizante de Liquidación / Detalle */}
            {selectedSale && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => !settling && !cancellingId && setDrawerSaleId(null)}
                    />
                    <aside
                        aria-label={`Detalle de orden ${selectedSale.handoffCode}`}
                        className="relative z-10 w-full max-w-xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
                    >
                        <div className="p-6 border-b border-border flex items-start justify-between gap-4 shrink-0">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
                                        Pase de Orden · {CHANNEL_LABELS[selectedSale.salesChannel]}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${SALE_STATUS_BADGE[selectedSale.status]}`}>
                                        {SALE_STATUS_LABELS[selectedSale.status]}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <h2 className="text-2xl font-black font-mono tracking-tight">{selectedSale.handoffCode}</h2>
                                    <button
                                        type="button"
                                        onClick={(e) => copyHandoffCode(selectedSale.handoffCode, e)}
                                        className="px-2 py-1 rounded-lg border border-border text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                                    >
                                        {copiedCode === selectedSale.handoffCode ? 'Copiado' : 'Copiar'}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Creada: {formatDateTime(selectedSale.createdAt)} · Operador: {displayOperatorName(selectedSale.resellerName, selectedSale.resellerEmail)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDrawerSaleId(null)}
                                className="size-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                                aria-label="Cerrar panel de orden"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
                                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente</p>
                                    <p className="font-bold mt-1 text-base">{selectedSale.customerName || 'Cliente mostrador'}</p>
                                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                        {selectedSale.customerPhone || 'Sin teléfono'}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        {selectedSale.status === 'PENDING_PAYMENT' ? 'Vigencia de reserva' : 'Resolución'}
                                    </p>
                                    <p className="font-bold mt-1 text-base">
                                        {getReservationTraffic(selectedSale, nowMs).label}
                                    </p>
                                    {selectedSale.notes && (
                                        <p className="text-xs text-muted-foreground mt-1">Nota: {selectedSale.notes}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2.5">
                                    Piezas en la orden (precio congelado)
                                </h3>
                                <div className="rounded-2xl border border-border overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left">Artículo</th>
                                                <th className="px-3 py-2.5 text-center">Cant.</th>
                                                <th className="px-3 py-2.5 text-right">Unitario</th>
                                                <th className="px-4 py-2.5 text-right">Importe</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {selectedSale.items.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="px-4 py-3">
                                                        <p className="font-bold text-xs">{item.nameSnapshot}</p>
                                                        <p className="text-[10px] font-mono text-muted-foreground">{item.skuSnapshot}</p>
                                                    </td>
                                                    <td className="px-3 py-3 text-center font-black text-xs">{item.quantity}</td>
                                                    <td className="px-3 py-3 text-right text-xs">{money(item.unitPrice, selectedSale.currency)}</td>
                                                    <td className="px-4 py-3 text-right font-black text-xs">{money(item.lineTotal, selectedSale.currency)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total de la orden</span>
                                    <span className="font-black">{money(selectedSale.totalAmount, selectedSale.currency)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Cobrado en caja</span>
                                    <span className="font-black text-emerald-500">{money(selectedSale.paidAmount, selectedSale.currency)}</span>
                                </div>
                                {(selectedSale.creditedAmount || 0) > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Financiado a crédito (30d)</span>
                                        <span className="font-black text-indigo-500">{money(selectedSale.creditedAmount || 0, selectedSale.currency)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t border-border pt-2.5 text-base font-black">
                                    <span>Saldo por cobrar</span>
                                    <span className={selectedSale.balanceDue > 0 ? 'text-amber-500' : 'text-emerald-500'}>
                                        {money(selectedSale.balanceDue, selectedSale.currency)}
                                    </span>
                                </div>
                            </div>

                            {isCreditAdmin && selectedSale.salesChannel === 'RESELLER_POS' && selectedSale.commissionStatus && selectedSale.commissionStatus !== 'NONE' && (
                                <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2 text-sm">
                                    <h3 className="font-black">Margen de reventa</h3>
                                    <div className="flex justify-between"><span>Precio público (P1)</span><strong>{money(selectedSale.publicTotalAmount || 0, selectedSale.currency)}</strong></div>
                                    <div className="flex justify-between"><span>Margen revendedor</span><strong>{money(selectedSale.commissionAmount || 0, selectedSale.currency)}</strong></div>
                                    <div className="flex justify-between"><span>Estado</span><strong>{COMMISSION_STATUS_LABELS[selectedSale.commissionStatus]}</strong></div>
                                </div>
                            )}

                            {selectedSale.creditObligations && selectedSale.creditObligations.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                                        Líneas de crédito generadas (30 días)
                                    </h3>
                                    <ul className="space-y-2">
                                        {selectedSale.creditObligations.map((ob) => (
                                            <li
                                                key={ob.id}
                                                className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-2.5 text-xs bg-muted/20"
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-black">{ob.code}</span>
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-500 border border-indigo-500/30">
                                                            {FACILITY_LABELS[ob.facilityType]}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${OBLIGATION_STATUS_BADGE[ob.status]}`}>
                                                            {OBLIGATION_STATUS_LABELS[ob.status]}
                                                        </span>
                                                    </div>
                                                    <p className="text-muted-foreground text-[11px] truncate mt-0.5">
                                                        {ob.title || 'Cargo a crédito'} · Vence: {formatDateShort(ob.dueAt)}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="font-black text-foreground">Saldo: {money(ob.balanceDue, selectedSale.currency)}</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setDrawerSaleId(null);
                                                            setWorkspaceTab('CREDIT');
                                                            setCreditSubTab('OBLIGATIONS');
                                                            setCreditStatusFilter('ALL');
                                                            setSelectedObligationId(ob.id);
                                                        }}
                                                        className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:underline mt-0.5 cursor-pointer"
                                                    >
                                                        Gestionar abono →
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {selectedSale.payments.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                                        Historial de pagos en caja
                                    </h3>
                                    <ul className="space-y-2">
                                        {selectedSale.payments.map((payment) => (
                                            <li
                                                key={payment.id}
                                                className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5 text-xs"
                                            >
                                                <div>
                                                    <span className="font-black uppercase">{payment.method}</span>
                                                    {payment.reference ? ` · Ref: ${payment.reference}` : ''}
                                                    <p className="text-muted-foreground text-[11px]">
                                                        {formatDateTime(payment.paidAt || payment.recordedAt || payment.createdAt)}
                                                    </p>
                                                </div>
                                                <span className="font-black text-emerald-500">
                                                    {money(payment.amount, selectedSale.currency)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {actionError && (
                                <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                                    {actionError}
                                </div>
                            )}

                            {selectedSale.status === 'PENDING_PAYMENT' && (
                                <form id="settle-sale-form" onSubmit={handleSettle} className="space-y-4 border-t border-border pt-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                                            Liquidar en Caja Cared
                                        </h3>
                                        {(settleFinancingMode === 'CASH' || settleFinancingMode === 'MIXED') && (
                                            <div className="flex items-center gap-1.5">
                                                {settleFinancingMode === 'CASH' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPayAmount(String(roundMoney(selectedSale.balanceDue)))}
                                                        className="px-2.5 py-1 rounded-lg border border-border bg-muted/60 hover:bg-muted text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                                    >
                                                        100% Saldo
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setPayAmount(String(roundMoney(selectedSale.balanceDue / 2)))}
                                                    className="px-2.5 py-1 rounded-lg border border-border bg-muted/60 hover:bg-muted text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                                >
                                                    50%
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {selectedSale.salesChannel === 'JEWELRY_INTERNAL' && !selectedSale.clientId && (
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1" htmlFor="settle-client-link">
                                                Vincular cliente registrado (requerido si aplicas crédito 30d)
                                            </label>
                                            <select
                                                id="settle-client-link"
                                                value={settleClientIdOverride}
                                                onChange={(e) => setSettleClientIdOverride(e.target.value)}
                                                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-red-500 focus:outline-none"
                                            >
                                                <option value="">Mostrador sin cuenta asignada (sólo contado)</option>
                                                {directClients.map((client) => (
                                                    <option key={client.id} value={client.id}>
                                                        {client.name}{client.phone ? ` · ${client.phone}` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <CreditFinancingPanel
                                        totalAmount={selectedSale.balanceDue}
                                        currency={selectedSale.currency}
                                        hasSubject={
                                            selectedSale.salesChannel === 'RESELLER_POS' ||
                                            Boolean(settleClientIdOverride || selectedSale.clientId)
                                        }
                                        subjectHint="Esta orden es de mostrador sin cliente registrado vinculado. Selecciona uno arriba para habilitar crédito a 30 días."
                                        creditSummary={settleCreditSummary}
                                        creditLoading={settleCreditLoading}
                                        financingMode={settleFinancingMode}
                                        onFinancingModeChange={(mode) => {
                                            setSettleFinancingMode(mode);
                                            if (mode === 'MIXED') {
                                                setPayAmount(String(roundMoney(selectedSale.balanceDue * 0.3)));
                                            } else if (mode === 'CASH') {
                                                setPayAmount(String(roundMoney(selectedSale.balanceDue)));
                                            }
                                        }}
                                        mixedFacility={settleMixedFacility}
                                        onMixedFacilityChange={setSettleMixedFacility}
                                        cashAmount={payAmount}
                                        onCashAmountChange={setPayAmount}
                                        payMethod={payMethod}
                                        onPayMethodChange={setPayMethod}
                                        payReference={payReference}
                                        onPayReferenceChange={setPayReference}
                                        nonRevolvingTitle={settleNonRevolvingTitle}
                                        onNonRevolvingTitleChange={setSettleNonRevolvingTitle}
                                        isCreditAdmin={isCreditAdmin}
                                        allowOverdueOverride={settleAllowOverdueOverride}
                                        onAllowOverdueOverrideChange={setSettleAllowOverdueOverride}
                                        cashInputId="settle-amount"
                                        refInputId="settle-reference"
                                        titleInputId="settle-credit-title"
                                        allowPartialCash
                                    />

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1" htmlFor="settle-notes">
                                            Observaciones de caja
                                        </label>
                                        <input
                                            id="settle-notes"
                                            type="text"
                                            value={settleNotes}
                                            onChange={(event) => setSettleNotes(event.target.value)}
                                            placeholder="Opcional"
                                            className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm focus:border-red-500 focus:outline-none"
                                        />
                                    </div>

                                    {selectedSale.paidAmount === 0 && (
                                        <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row gap-2">
                                            <input
                                                type="text"
                                                value={cancelReason}
                                                onChange={(event) => setCancelReason(event.target.value)}
                                                placeholder="Motivo de cancelación (opcional)"
                                                className="flex-1 h-10 rounded-xl border border-border bg-background px-3 text-xs focus:border-red-500 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                disabled={cancellingId === selectedSale.id}
                                                onClick={() => void handleCancelSale(selectedSale)}
                                                className="h-10 px-4 rounded-xl border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 text-[11px] font-black uppercase tracking-widest disabled:opacity-50 transition-all cursor-pointer"
                                            >
                                                {cancellingId === selectedSale.id ? 'Cancelando…' : 'Cancelar y liberar reserva'}
                                            </button>
                                        </div>
                                    )}
                                </form>
                            )}
                        </div>

                        {selectedSale.status === 'PENDING_PAYMENT' && (
                            <div className="p-5 border-t border-border bg-muted/20 shrink-0 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDrawerSaleId(null)}
                                    disabled={settling}
                                    className="px-5 h-12 rounded-xl border border-border text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                    Cerrar
                                </button>
                                <button
                                    type="submit"
                                    form="settle-sale-form"
                                    disabled={settling}
                                    className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-red-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                    <span>
                                        {settling
                                            ? 'Procesando liquidación…'
                                            : settleFinancingMode === 'CASH'
                                              ? 'Registrar Cobro y Descontar Inventario'
                                              : 'Autorizar Crédito 30d y Descontar Inventario'}
                                    </span>
                                </button>
                            </div>
                        )}
                    </aside>
                </div>
            )}

            {/* Modal de Nueva Venta Directa (Maestro: Cliente -> Detalle: Artículos) */}
            {isDirectModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5 shrink-0">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Caja directa · Maestro-Detalle</p>
                                <h2 className="text-xl font-black mt-1">Nueva venta directa en piso</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => !directSubmitting && setIsDirectModalOpen(false)}
                                className="h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                                aria-label="Cerrar modal de venta directa"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateDirectSale} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {directError && (
                                <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                                    {directError}
                                </div>
                            )}

                            {/* 1. MAESTRO: CLIENTE */}
                            <section className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="size-6 rounded-lg bg-red-600 text-white text-[11px] font-black inline-flex items-center justify-center">1</span>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                                            Maestro · Datos del Cliente
                                        </h3>
                                    </div>
                                    {(directCustomerName || directCustomerPhone) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDirectClientId(null);
                                                setDirectCustomerName('');
                                                setDirectCustomerPhone('');
                                            }}
                                            className="text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            Limpiar cliente
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                                    <div className="relative">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1" htmlFor="direct-customer-name">
                                            Cliente / Mostrador
                                        </label>
                                        <input
                                            id="direct-customer-name"
                                            type="text"
                                            value={directCustomerName}
                                            onFocus={() => setShowClientSuggestions(true)}
                                            onBlur={() => window.setTimeout(() => setShowClientSuggestions(false), 160)}
                                            onChange={(event) => {
                                                setDirectClientId(null);
                                                setDirectCustomerName(event.target.value);
                                                setShowClientSuggestions(true);
                                            }}
                                            placeholder="Buscar cliente registrado o escribir nombre..."
                                            className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold focus:border-red-500 focus:outline-none"
                                        />
                                        {showClientSuggestions && matchingClients.length > 0 && (
                                            <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-border bg-card shadow-xl max-h-44 overflow-y-auto divide-y divide-border">
                                                {matchingClients.map((client) => (
                                                    <button
                                                        key={client.id}
                                                        type="button"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setDirectClientId(client.id);
                                                            setDirectCustomerName(client.name);
                                                            setDirectCustomerPhone(client.phone || '');
                                                            setShowClientSuggestions(false);
                                                        }}
                                                        className="w-full text-left px-3.5 py-2.5 hover:bg-muted/60 flex items-center justify-between gap-2 cursor-pointer"
                                                    >
                                                        <span className="text-xs font-bold text-foreground truncate">{client.name}</span>
                                                        <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                                                            {client.phone || 'Sin teléfono'}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1" htmlFor="direct-customer-phone">
                                            Teléfono
                                        </label>
                                        <input
                                            id="direct-customer-phone"
                                            type="tel"
                                            value={directCustomerPhone}
                                            onChange={(event) => {
                                                setDirectClientId(null);
                                                setDirectCustomerPhone(event.target.value);
                                            }}
                                            placeholder="Ej. 644 123 4567"
                                            className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1" htmlFor="direct-notes">
                                        Observaciones de la orden (opcional)
                                    </label>
                                    <input
                                        id="direct-notes"
                                        type="text"
                                        value={directNotes}
                                        onChange={(event) => setDirectNotes(event.target.value)}
                                        placeholder="Grabado, entrega en estuche, notas especiales..."
                                        className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </section>

                            {/* 2. DETALLE: ARTÍCULOS */}
                            <section className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="size-6 rounded-lg bg-foreground text-background text-[11px] font-black inline-flex items-center justify-center">2</span>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                                            Detalle · Artículos de la Orden ({directItems.reduce((sum, i) => sum + i.quantity, 0)})
                                        </h3>
                                    </div>
                                    <div className="w-full sm:w-72">
                                        <input
                                            type="search"
                                            value={catalogSearch}
                                            onChange={(e) => setCatalogSearch(e.target.value)}
                                            placeholder="Buscar por nombre, SKU o categoría..."
                                            className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {directItems.length > 0 && (
                                    <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.04] overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                <tr>
                                                    <th className="px-4 py-2 text-left">Artículo seleccionado</th>
                                                    <th className="px-3 py-2 text-center">Cant.</th>
                                                    <th className="px-3 py-2 text-right">Importe</th>
                                                    <th className="px-3 py-2 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {directItems.map(({ product, quantity, lineTotal }) => {
                                                    const avail = getCatalogAvailable(product);
                                                    return (
                                                        <tr key={product.id}>
                                                            <td className="px-4 py-2.5">
                                                                <p className="font-bold text-foreground">{product.name}</p>
                                                                <p className="text-[10px] font-mono text-muted-foreground">
                                                                    {product.sku} · {money(product.unitPrice, product.currency)} c/u
                                                                </p>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                <div className="inline-flex items-center gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setDirectCart((prev) => ({
                                                                                ...prev,
                                                                                [product.id]: Math.max(0, (prev[product.id] || 0) - 1),
                                                                            }))
                                                                        }
                                                                        className="h-7 w-7 rounded-lg border border-border font-bold cursor-pointer"
                                                                    >
                                                                        -
                                                                    </button>
                                                                    <span className="w-5 text-center font-black">{quantity}</span>
                                                                    <button
                                                                        type="button"
                                                                        disabled={quantity >= avail}
                                                                        onClick={() =>
                                                                            setDirectCart((prev) => ({
                                                                                ...prev,
                                                                                [product.id]: Math.min(avail, (prev[product.id] || 0) + 1),
                                                                            }))
                                                                        }
                                                                        className="h-7 w-7 rounded-lg border border-border font-bold disabled:opacity-40 cursor-pointer"
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-black">
                                                                {money(lineTotal, product.currency)}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setDirectCart((prev) => {
                                                                            const copy = { ...prev };
                                                                            delete copy[product.id];
                                                                            return copy;
                                                                        })
                                                                    }
                                                                    className="text-muted-foreground hover:text-rose-500 cursor-pointer"
                                                                    title="Quitar artículo"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                                    {catalogLoading ? (
                                        <p className="text-sm text-muted-foreground">Cargando catálogo disponible…</p>
                                    ) : filteredCatalog.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No hay piezas activas disponibles con ese criterio.</p>
                                    ) : (
                                        filteredCatalog.map((product) => {
                                            const avail = getCatalogAvailable(product);
                                            const qty = directCart[product.id] || 0;
                                            const remaining = Math.max(0, avail - qty);
                                            return (
                                                <div
                                                    key={product.id}
                                                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                                                        avail === 0 ? 'border-border/60 bg-muted/10 opacity-60' : 'border-border bg-muted/20'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {product.imageUrl ? (
                                                            <img
                                                                src={resolveMediaUrl(product.imageUrl)}
                                                                alt={product.name}
                                                                className="h-11 w-11 rounded-lg object-cover shrink-0 border border-border"
                                                            />
                                                        ) : (
                                                            <div className="h-11 w-11 rounded-lg border border-border bg-muted grid place-items-center text-xs font-bold shrink-0">
                                                                {product.sku.slice(0, 3)}
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-sm truncate">{product.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                <span className="font-mono">{product.sku}</span> ·{' '}
                                                                <span className={remaining > 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                                                                    {avail === 0 ? 'Agotado (0)' : `Disp: ${remaining}`}
                                                                </span>{' '}
                                                                · <strong className="text-foreground">{money(product.unitPrice, product.currency)}</strong>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDirectCart((prev) => ({
                                                                    ...prev,
                                                                    [product.id]: Math.max(0, (prev[product.id] || 0) - 1),
                                                                }))
                                                            }
                                                            disabled={qty === 0}
                                                            className="h-8 w-8 rounded-lg border border-border font-bold disabled:opacity-40 cursor-pointer"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="w-6 text-center text-sm font-black">{qty}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDirectCart((prev) => ({
                                                                    ...prev,
                                                                    [product.id]: Math.min(avail, (prev[product.id] || 0) + 1),
                                                                }))
                                                            }
                                                            disabled={qty >= avail}
                                                            className="h-8 w-8 rounded-lg border border-border font-bold disabled:opacity-40 cursor-pointer"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </section>

                            {/* 3. COBRO Y FINANCIAMIENTO DUAL */}
                            <section className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3.5">
                                <label className="flex items-center gap-2.5 text-sm font-bold cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={directCollectNow}
                                        onChange={(event) => setDirectCollectNow(event.target.checked)}
                                    />
                                    Aplicar cobro o crédito a 30 días inmediatamente ({money(directTotal)})
                                </label>

                                {directCollectNow ? (
                                    <CreditFinancingPanel
                                        totalAmount={directTotal}
                                        hasSubject={Boolean(directClientId)}
                                        subjectHint="Para otorgar crédito revolvente o por pieza a 30 días en mostrador, selecciona un cliente registrado de la lista en el paso 1."
                                        creditSummary={directCreditSummary}
                                        creditLoading={directCreditLoading}
                                        financingMode={directFinancingMode}
                                        onFinancingModeChange={(mode) => {
                                            setDirectFinancingMode(mode);
                                            if (mode === 'MIXED' && directTotal > 0) {
                                                setDirectCashAmount(String(roundMoney(directTotal * 0.3)));
                                            }
                                            if ((mode === 'NON_REVOLVING' || mode === 'MIXED') && !directNonRevolvingTitle && directItems.length > 0) {
                                                setDirectNonRevolvingTitle(
                                                    directItems.map((e) => `${e.quantity}x ${e.product.name}`).join(', ').slice(0, 120),
                                                );
                                            }
                                        }}
                                        mixedFacility={directMixedFacility}
                                        onMixedFacilityChange={setDirectMixedFacility}
                                        cashAmount={directCashAmount}
                                        onCashAmountChange={setDirectCashAmount}
                                        payMethod={directMethod}
                                        onPayMethodChange={setDirectMethod}
                                        payReference={directReference}
                                        onPayReferenceChange={setDirectReference}
                                        nonRevolvingTitle={directNonRevolvingTitle}
                                        onNonRevolvingTitleChange={setDirectNonRevolvingTitle}
                                        isCreditAdmin={isCreditAdmin}
                                        allowOverdueOverride={directAllowOverdueOverride}
                                        onAllowOverdueOverrideChange={setDirectAllowOverdueOverride}
                                        cashInputId="direct-cash-amount"
                                        refInputId="direct-reference"
                                        titleInputId="direct-credit-title"
                                        allowPartialCash={false}
                                    />
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        Se creará la orden en estado Por cobrar con reserva de inventario por 30 minutos para el cliente seleccionado.
                                    </p>
                                )}
                            </section>

                            <div className="flex items-center justify-between border-t border-border pt-4">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        {directCustomerName.trim() ? `Cliente: ${directCustomerName.trim()}` : 'Cliente mostrador'}
                                    </span>
                                    <p className="text-xl font-black">Total: {money(directTotal)}</p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={directSubmitting || directItems.length === 0}
                                    className="h-11 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50 cursor-pointer shadow-lg shadow-red-600/20"
                                >
                                    {directSubmitting
                                        ? 'Guardando…'
                                        : !directCollectNow
                                          ? 'Reservar orden'
                                          : directFinancingMode === 'CASH'
                                            ? 'Cobrar ahora'
                                            : 'Autorizar crédito 30d'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Drawer de Abonos y Detalle de Obligación a 30 Días */}
            {selectedObligation && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => !obligationPaySubmitting && setSelectedObligationId(null)}
                    />
                    <aside
                        aria-label={`Detalle de obligación ${selectedObligation.code}`}
                        className="relative z-10 w-full max-w-xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
                    >
                        <div className="p-6 border-b border-border flex items-start justify-between gap-4 shrink-0">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                            selectedObligation.facilityType === 'REVOLVING'
                                                ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30'
                                                : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                        }`}
                                    >
                                        {FACILITY_LABELS[selectedObligation.facilityType]}
                                    </span>
                                    <span
                                        className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${OBLIGATION_STATUS_BADGE[selectedObligation.status]}`}
                                    >
                                        {OBLIGATION_STATUS_LABELS[selectedObligation.status]}
                                    </span>
                                </div>
                                <h2 className="text-2xl font-black font-mono tracking-tight mt-1">{selectedObligation.code}</h2>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Emitida: {formatDateTime(selectedObligation.issuedAt)} · Vence: {formatDateShort(selectedObligation.dueAt)} ({selectedObligation.termDays}d)
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => !obligationPaySubmitting && setSelectedObligationId(null)}
                                className="size-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                                aria-label="Cerrar detalle de crédito"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
                                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        {selectedObligation.subjectType === 'RESELLER' ? 'Revendedor' : 'Cliente'}
                                    </p>
                                    <p className="font-bold mt-1 text-base">{selectedObligation.subjectName || '—'}</p>
                                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                        {selectedObligation.subjectPhone || selectedObligation.subjectEmail || 'Sin contacto'}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pieza / Venta POS</p>
                                    <p className="font-bold mt-1 text-sm">{selectedObligation.title}</p>
                                    {selectedObligation.saleHandoffCode && (
                                        <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                            Orden: {selectedObligation.saleHandoffCode}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Monto financiado original</span>
                                    <span className="font-black">{money(selectedObligation.principalAmount, selectedObligation.currency)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Abonado acumulado</span>
                                    <span className="font-black text-emerald-500">{money(selectedObligation.paidAmount, selectedObligation.currency)}</span>
                                </div>
                                <div className="flex justify-between border-t border-border pt-2.5 text-base font-black">
                                    <span>Saldo pendiente</span>
                                    <span className={selectedObligation.balanceDue > 0 ? 'text-amber-500' : 'text-emerald-500'}>
                                        {money(selectedObligation.balanceDue, selectedObligation.currency)}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground flex items-start gap-2.5">
                                <span className="material-symbols-outlined text-[18px] text-red-500 shrink-0 mt-0.5">info</span>
                                <span>
                                    {selectedObligation.facilityType === 'REVOLVING'
                                        ? 'Crédito Revolvente (30d): cada abono registrado restaura inmediatamente la disponibilidad de su límite revolvente.'
                                        : 'Línea No Revolvente por pieza (30d): funciona de forma paralela e independiente al cupo revolvente; al liquidarse concluye sin reactivar saldo.'}
                                </span>
                            </div>

                            {selectedObligation.payments.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                                        Historial de abonos ({selectedObligation.payments.length})
                                    </h3>
                                    <ul className="space-y-2">
                                        {selectedObligation.payments.map((payment) => (
                                            <li
                                                key={payment.id}
                                                className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5 text-xs"
                                            >
                                                <div>
                                                    <span className="font-black uppercase">{payment.method}</span>
                                                    {payment.reference ? ` · Ref: ${payment.reference}` : ''}
                                                    <p className="text-muted-foreground text-[11px]">
                                                        {formatDateTime(payment.recordedAt)}
                                                        {payment.recordedByName ? ` · Por: ${payment.recordedByName}` : ''}
                                                    </p>
                                                </div>
                                                <span className="font-black text-emerald-500">
                                                    {money(payment.amount, selectedObligation.currency)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {(selectedObligation.creditNotes || []).length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                                        Notas de crédito ({selectedObligation.creditNotes?.length || 0})
                                    </h3>
                                    <ul className="space-y-2">
                                        {(selectedObligation.creditNotes || []).map((note) => (
                                            <li key={note.id} className="flex items-center justify-between rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-2.5 text-xs">
                                                <div>
                                                    <span className="font-black uppercase">{note.reason}</span>
                                                    <p className="text-muted-foreground text-[11px]">{formatDateTime(note.createdAt)}{note.recordedByName ? ` · Por: ${note.recordedByName}` : ''}</p>
                                                </div>
                                                <span className="font-black text-indigo-500">−{money(note.amount, selectedObligation.currency)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {obligationPayError && (
                                <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                                    {obligationPayError}
                                </div>
                            )}

                            {isCreditAdmin && selectedObligation.status !== 'PAID' && selectedObligation.status !== 'CANCELLED' && (
                                <form onSubmit={handleCreateCreditNote} className="space-y-3 border-t border-border pt-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Emitir nota de crédito</h3>
                                        <span className="text-[10px] text-indigo-500 font-bold">Reduce saldo y libera cupo</span>
                                    </div>
                                    {creditNoteError && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">{creditNoteError}</div>}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <input type="number" step="0.01" min="0.01" max={selectedObligation.balanceDue} value={creditNoteAmount} onChange={(e) => setCreditNoteAmount(e.target.value)} placeholder={`Monto · ${selectedObligation.currency}`} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-black focus:border-indigo-500 focus:outline-none" required />
                                        <input type="text" value={creditNoteReason} onChange={(e) => setCreditNoteReason(e.target.value)} placeholder="Motivo obligatorio" className="h-11 rounded-xl border border-border bg-background px-3 text-sm focus:border-indigo-500 focus:outline-none" required />
                                    </div>
                                    <input type="text" value={creditNoteNotes} onChange={(e) => setCreditNoteNotes(e.target.value)} placeholder="Observaciones opcionales" className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm focus:border-indigo-500 focus:outline-none" />
                                    <button type="submit" disabled={creditNoteSubmitting} className="w-full h-11 rounded-xl border border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-xs font-black uppercase tracking-widest hover:bg-indigo-500/20 disabled:opacity-50">{creditNoteSubmitting ? 'Emitiendo nota…' : 'Aplicar nota de crédito'}</button>
                                </form>
                            )}

                            {selectedObligation.status !== 'PAID' && selectedObligation.status !== 'CANCELLED' && (
                                <form id="credit-payment-form" onSubmit={handleRecordObligationPayment} className="space-y-4 border-t border-border pt-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                                            Registrar abono a crédito
                                        </h3>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setObligationPayAmount(String(roundMoney(selectedObligation.balanceDue)))}
                                                className="px-2.5 py-1 rounded-lg border border-border bg-muted/60 hover:bg-muted text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                            >
                                                100% Saldo
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setObligationPayAmount(String(roundMoney(selectedObligation.balanceDue / 2)))}
                                                className="px-2.5 py-1 rounded-lg border border-border bg-muted/60 hover:bg-muted text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                            >
                                                50%
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        {PAYMENT_METHODS.map((method) => (
                                            <button
                                                key={method.id}
                                                type="button"
                                                onClick={() => setObligationPayMethod(method.id)}
                                                className={`h-11 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                                    obligationPayMethod === method.id
                                                        ? 'bg-red-600 text-white border-red-600 shadow-md'
                                                        : 'bg-background text-muted-foreground border-border hover:text-foreground'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-[16px]">{method.icon}</span>
                                                <span>{method.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1" htmlFor="obligation-pay-amount">
                                                Monto a abonar ({selectedObligation.currency})
                                            </label>
                                            <input
                                                id="obligation-pay-amount"
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                max={selectedObligation.balanceDue}
                                                value={obligationPayAmount}
                                                onChange={(e) => setObligationPayAmount(e.target.value)}
                                                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-black focus:border-red-500 focus:outline-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1" htmlFor="obligation-pay-ref">
                                                Referencia / Folio
                                            </label>
                                            <input
                                                id="obligation-pay-ref"
                                                type="text"
                                                value={obligationPayReference}
                                                onChange={(e) => setObligationPayReference(e.target.value)}
                                                placeholder="Opcional"
                                                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm focus:border-red-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1" htmlFor="obligation-pay-notes">
                                            Observaciones del abono
                                        </label>
                                        <input
                                            id="obligation-pay-notes"
                                            type="text"
                                            value={obligationPayNotes}
                                            onChange={(e) => setObligationPayNotes(e.target.value)}
                                            placeholder="Opcional"
                                            className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                </form>
                            )}
                        </div>

                        {selectedObligation.status !== 'PAID' && selectedObligation.status !== 'CANCELLED' && (
                            <div className="p-5 border-t border-border bg-muted/20 shrink-0 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSelectedObligationId(null)}
                                    disabled={obligationPaySubmitting}
                                    className="px-5 h-12 rounded-xl border border-border text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                    Cerrar
                                </button>
                                <button
                                    type="submit"
                                    form="credit-payment-form"
                                    disabled={obligationPaySubmitting}
                                    className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-red-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[18px]">payments</span>
                                    <span>{obligationPaySubmitting ? 'Registrando abono…' : 'Registrar Abono al Crédito'}</span>
                                </button>
                            </div>
                        )}
                    </aside>
                </div>
            )}

            {/* Modal Admin para Configurar Límite Revolvente */}
            {isLimitModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Administración de Crédito</p>
                                <h2 className="text-xl font-black mt-1">Configurar Línea Revolvente (30 días)</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => !limitSubmitting && setIsLimitModalOpen(false)}
                                className="h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                                aria-label="Cerrar modal de límite revolvente"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveCreditAccount} className="p-6 space-y-4">
                            {limitError && (
                                <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                                    {limitError}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                {([
                                    { id: 'RESELLER', label: 'Revendedor B2B' },
                                    { id: 'CLIENT', label: 'Cliente Cared' },
                                ] as const).map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => {
                                            setLimitSubjectType(tab.id);
                                            const firstId =
                                                tab.id === 'RESELLER'
                                                    ? creditSubjects.resellers[0]?.id || ''
                                                    : creditSubjects.clients[0]?.id || '';
                                            setLimitSubjectId(firstId);
                                        }}
                                        className={`h-10 rounded-xl border text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
                                            limitSubjectType === tab.id
                                                ? 'bg-red-600 text-white border-red-600'
                                                : 'bg-background text-muted-foreground border-border hover:text-foreground'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1" htmlFor="limit-subject-id">
                                    {limitSubjectType === 'RESELLER' ? 'Revendedor' : 'Cliente registrado'}
                                </label>
                                <select
                                    id="limit-subject-id"
                                    value={limitSubjectId}
                                    onChange={(e) => setLimitSubjectId(e.target.value)}
                                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-red-500 focus:outline-none"
                                    required
                                >
                                    <option value="">Selecciona un sujeto…</option>
                                    {limitSubjectType === 'RESELLER'
                                        ? creditSubjects.resellers.map((entry) => (
                                              <option key={entry.id} value={entry.id}>
                                                  {entry.name} ({entry.email || entry.id})
                                              </option>
                                          ))
                                        : creditSubjects.clients.map((entry) => (
                                              <option key={entry.id} value={entry.id}>
                                                  {entry.name} ({entry.phone || entry.email || entry.id})
                                              </option>
                                          ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1" htmlFor="limit-amount">
                                        Límite Revolvente (MXN)
                                    </label>
                                    <input
                                        id="limit-amount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={limitAmount}
                                        onChange={(e) => setLimitAmount(e.target.value)}
                                        className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-black focus:border-red-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1" htmlFor="limit-term">
                                        Plazo (días)
                                    </label>
                                    <input
                                        id="limit-term"
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={limitTermDays}
                                        onChange={(e) => setLimitTermDays(e.target.value)}
                                        className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-black focus:border-red-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1" htmlFor="limit-status">
                                        Estatus
                                    </label>
                                    <select
                                        id="limit-status"
                                        value={limitStatus}
                                        onChange={(e) => setLimitStatus(e.target.value as CreditAccountStatus)}
                                        className="w-full h-11 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground focus:border-red-500 focus:outline-none"
                                    >
                                        <option value="ACTIVE">Activa</option>
                                        <option value="SUSPENDED">Suspendida</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1" htmlFor="limit-notes">
                                    Notas / Condiciones acordadas
                                </label>
                                <input
                                    id="limit-notes"
                                    type="text"
                                    value={limitNotes}
                                    onChange={(e) => setLimitNotes(e.target.value)}
                                    placeholder="Opcional (ej. Línea permanente autorizada por dirección)"
                                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsLimitModalOpen(false)}
                                    disabled={limitSubmitting}
                                    className="h-11 px-4 rounded-xl border border-border text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={limitSubmitting}
                                    className="h-11 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50 cursor-pointer shadow-lg shadow-red-600/20"
                                >
                                    {limitSubmitting ? 'Guardando…' : 'Guardar Límite Revolvente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PosSales;
