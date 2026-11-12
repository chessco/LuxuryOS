import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api, { resolveMediaUrl } from '../services/api';

type CommerceSaleStatus = 'DRAFT' | 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'EXPIRED';
type CommercePaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'FAILED' | 'REFUNDED';
type CommerceSalesChannel = 'JEWELRY_INTERNAL' | 'RESELLER_POS';
type StatusFilter = 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'ALL';
type ChannelFilter = 'ALL' | CommerceSalesChannel;
type TrafficFilter = 'ALL' | 'RED' | 'YELLOW' | 'GREEN';
type SortKey = 'handoffCode' | 'urgency' | 'resellerName' | 'customerName' | 'itemCount' | 'totalAmount' | 'balanceDue' | 'status' | 'createdAt';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' };

type CommerceSaleItem = {
    id: string;
    productId: string;
    skuSnapshot: string;
    nameSnapshot: string;
    quantity: number;
    unitPrice: number;
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

type CommerceSale = {
    id: string;
    handoffCode: string;
    resellerId: string;
    resellerName: string | null;
    resellerEmail: string | null;
    salesChannel: CommerceSalesChannel;
    status: CommerceSaleStatus;
    paymentStatus: CommercePaymentStatus;
    currency: string;
    customerName: string | null;
    customerPhone: string | null;
    subtotalAmount: number;
    discountAmount: number;
    totalAmount: number;
    paidAmount: number;
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

const PosSales: React.FC = () => {
    const [sales, setSales] = useState<CommerceSale[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [nowMs, setNowMs] = useState(() => Date.now());

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
    const [directCustomerName, setDirectCustomerName] = useState('');
    const [directCustomerPhone, setDirectCustomerPhone] = useState('');
    const [directMethod, setDirectMethod] = useState<string>('Efectivo');
    const [directReference, setDirectReference] = useState('');
    const [directNotes, setDirectNotes] = useState('');
    const [directCollectNow, setDirectCollectNow] = useState(true);
    const [directSubmitting, setDirectSubmitting] = useState(false);
    const [directError, setDirectError] = useState('');

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

    useEffect(() => {
        void loadSales();
    }, [loadSales]);

    const selectedSale = useMemo(
        () => (drawerSaleId ? sales.find((sale) => sale.id === drawerSaleId) || null : null),
        [sales, drawerSaleId],
    );

    useEffect(() => {
        if (!selectedSale) {
            setPayAmount('');
            setPayReference('');
            setSettleNotes('');
            setCancelReason('');
            setActionError('');
            return;
        }
        setPayAmount(selectedSale.balanceDue > 0 ? String(Number(selectedSale.balanceDue.toFixed(2))) : '');
        setPayReference('');
        setSettleNotes('');
        setCancelReason('');
        setActionError('');
    }, [selectedSale?.id, selectedSale?.balanceDue]);

    // Close Drawer on Escape
    useEffect(() => {
        if (!drawerSaleId) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !settling && !cancellingId) {
                setDrawerSaleId(null);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [drawerSaleId, settling, cancellingId]);

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

    const handleSettle = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedSale) return;
        setActionError('');
        const numericAmount = Number(payAmount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            setActionError('Ingresa un monto de pago válido mayor a 0.');
            return;
        }
        setSettling(true);
        const paymentReference = payReference.trim();
        const paymentNotes = settleNotes.trim();
        const fingerprint = [
            selectedSale.id,
            numericAmount.toFixed(2),
            payMethod,
            paymentReference,
            paymentNotes,
        ].join('|');
        if (settleRequestRef.current?.fingerprint !== fingerprint) {
            settleRequestRef.current = { fingerprint, key: createIdempotencyKey() };
        }
        const idempotencyKey = settleRequestRef.current.key;
        try {
            const response = await api.post<CommerceSale>(`/commerce/sales/${selectedSale.id}/settle`, {
                payments: [
                    {
                        amount: numericAmount,
                        method: payMethod,
                        reference: paymentReference || undefined,
                    },
                ],
                notes: paymentNotes || undefined,
            }, {
                headers: { 'Idempotency-Key': idempotencyKey },
            });
            const updated = response.data;
            settleRequestRef.current = null;
            setSales((prev) => prev.map((sale) => (sale.id === updated.id ? updated : sale)));
            setNotice(
                updated.status === 'PAID'
                    ? `Orden ${updated.handoffCode} liquidada (${money(updated.totalAmount, updated.currency)}). Inventario descontado y registrado en Kardex.`
                    : `Abono registrado en ${updated.handoffCode}. Saldo pendiente: ${money(updated.balanceDue, updated.currency)}.`,
            );
            if (updated.status === 'PAID') {
                setDrawerSaleId(null);
            }
            void loadSales();
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
        setDirectSubmitting(true);
        try {
            const payload = {
                items: directItems.map((entry) => ({
                    productId: entry.product.id,
                    quantity: entry.quantity,
                })),
                customerName: directCustomerName.trim() || undefined,
                customerPhone: directCustomerPhone.trim() || undefined,
                notes: directNotes.trim() || undefined,
                payments: directCollectNow
                    ? [
                        {
                            amount: Number(directTotal.toFixed(2)),
                            method: directMethod,
                            reference: directReference.trim() || undefined,
                        },
                    ]
                    : undefined,
            };
            const response = await api.post<CommerceSale>('/commerce/sales', payload, {
                headers: { 'Idempotency-Key': createIdempotencyKey() },
            });
            const created = response.data;
            setIsDirectModalOpen(false);
            setDirectCart({});
            setDirectCustomerName('');
            setDirectCustomerPhone('');
            setDirectReference('');
            setDirectNotes('');
            setStatusFilter(created.status === 'PAID' ? 'PAID' : 'PENDING_PAYMENT');
            setNotice(
                created.status === 'PAID'
                    ? `Venta directa ${created.handoffCode} cobrada por ${money(created.totalAmount, created.currency)}.`
                    : `Orden ${created.handoffCode} creada con reserva de inventario por 30 min.`,
            );
            void loadSales();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'No fue posible registrar la venta directa.';
            setDirectError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setDirectSubmitting(false);
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
                                Órdenes de Venta POS
                            </h1>
                            <p className="text-muted-foreground text-sm transition-colors">
                                Gestiona, filtra y liquida de forma ágil los pases de revendedores y ventas de mostrador.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => void loadSales()}
                                disabled={loading}
                                className="flex items-center gap-2 h-11 px-4 rounded-xl border border-border bg-card text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-red-500 disabled:opacity-50 transition-all cursor-pointer"
                            >
                                <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`} aria-hidden="true">
                                    refresh
                                </span>
                                <span>{loading ? 'Actualizando…' : 'Actualizar'}</span>
                            </button>
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

                {error && (
                    <div role="alert" className="rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-3.5 text-sm text-red-500">
                        {error}
                    </div>
                )}

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
                                                        <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-500">
                                                            <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                                            Liquidada
                                                        </span>
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
                                    <span className="text-muted-foreground">Cobrado acumulado</span>
                                    <span className="font-black text-emerald-500">{money(selectedSale.paidAmount, selectedSale.currency)}</span>
                                </div>
                                <div className="flex justify-between border-t border-border pt-2.5 text-base font-black">
                                    <span>Saldo por cobrar</span>
                                    <span className={selectedSale.balanceDue > 0 ? 'text-amber-500' : 'text-emerald-500'}>
                                        {money(selectedSale.balanceDue, selectedSale.currency)}
                                    </span>
                                </div>
                            </div>

                            {selectedSale.payments.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                                        Historial de pagos
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
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setPayAmount(String(Number(selectedSale.balanceDue.toFixed(2))))}
                                                className="px-2.5 py-1 rounded-lg border border-border bg-muted/60 hover:bg-muted text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                            >
                                                100% Saldo
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPayAmount(String(Number((selectedSale.balanceDue / 2).toFixed(2))))}
                                                className="px-2.5 py-1 rounded-lg border border-border bg-muted/60 hover:bg-muted text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                            >
                                                50%
                                            </button>
                                        </div>
                                    </div>

                                    {/* Botones rápidos de método de pago */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {PAYMENT_METHODS.map((method) => {
                                            const active = payMethod === method.id;
                                            return (
                                                <button
                                                    key={method.id}
                                                    type="button"
                                                    onClick={() => setPayMethod(method.id)}
                                                    className={`h-11 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1" htmlFor="settle-amount">
                                                Monto a cobrar ({selectedSale.currency})
                                            </label>
                                            <input
                                                id="settle-amount"
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                max={selectedSale.balanceDue}
                                                value={payAmount}
                                                onChange={(event) => setPayAmount(event.target.value)}
                                                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-black focus:border-red-500 focus:outline-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1" htmlFor="settle-reference">
                                                Referencia / Voucher
                                            </label>
                                            <input
                                                id="settle-reference"
                                                type="text"
                                                value={payReference}
                                                onChange={(event) => setPayReference(event.target.value)}
                                                placeholder="Opcional (ej. AUT-9821)"
                                                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm focus:border-red-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

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
                                    <span>{settling ? 'Procesando cobro…' : 'Registrar Cobro y Descontar Inventario'}</span>
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
                                            onChange={(event) => setDirectCustomerPhone(event.target.value)}
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

                            {/* 3. COBRO */}
                            <section className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                                <label className="flex items-center gap-2.5 text-sm font-bold cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={directCollectNow}
                                        onChange={(event) => setDirectCollectNow(event.target.checked)}
                                    />
                                    Cobrar el total inmediatamente ({money(directTotal)})
                                </label>

                                {directCollectNow ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {PAYMENT_METHODS.map((method) => (
                                                <button
                                                    key={method.id}
                                                    type="button"
                                                    onClick={() => setDirectMethod(method.id)}
                                                    className={`h-10 rounded-xl border text-[11px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                                                        directMethod === method.id
                                                            ? 'bg-red-600 text-white border-red-600'
                                                            : 'bg-background text-muted-foreground border-border hover:text-foreground'
                                                    }`}
                                                >
                                                    {method.label}
                                                </button>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            value={directReference}
                                            onChange={(event) => setDirectReference(event.target.value)}
                                            placeholder="Referencia bancaria / terminal (opcional)"
                                            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                        />
                                    </div>
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
                                    {directSubmitting ? 'Guardando…' : directCollectNow ? 'Cobrar ahora' : 'Reservar orden'}
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
