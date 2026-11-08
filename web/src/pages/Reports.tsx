import React, { useState, useEffect, useMemo } from 'react';
import { OrdersService } from '../services/orders.service';
import { UsersService, User } from '../services/users.service';

interface OrderItem {
    id: string;
    clientId: string;
    client?: {
        id: string;
        name: string;
        phone?: string;
        email?: string;
    };
    type: 'REPAIR' | 'MANUFACTURE' | 'LAYAWAY' | 'STANDARD';
    status: string;
    stage: string;
    pieceType?: string;
    metal?: string;
    color?: string;
    karats?: string;
    weight?: string;
    size?: string;
    thickness?: string;
    itemCode?: string;
    value: number | string;
    totalAmount: number | string;
    paidAmount: number | string;
    balance: number | string;
    laborCost?: number | string;
    materialCost?: number | string;
    priority?: string;
    notes?: string;
    specifications?: any;
    createdBy?: {
        id: string;
        name?: string;
        email?: string;
    };
    createdByName?: string;
    deliveredAt?: string;
    createdAt: string;
    updatedAt: string;
}

type DateFilterPreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type OrderTypeFilter = 'ALL' | 'REPAIR' | 'MANUFACTURE' | 'DESIGN' | 'LASER' | 'LAYAWAY';
type ReportFocus = 'SALES' | 'JEWELER';

interface JewelerCompensation {
    id?: string;
    name: string;
    percentage: number;
    baseLabor: number;
    payout: number;
}

// Helper to get local date in YYYY-MM-DD format (prevents UTC timezone shift bug)
const getLocalDateString = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const Reports: React.FC = () => {
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [datePreset, setDatePreset] = useState<DateFilterPreset>('today');
    const [startDate, setStartDate] = useState<string>(() => getLocalDateString(new Date()));
    const [endDate, setEndDate] = useState<string>(() => getLocalDateString(new Date()));
    const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('ALL');
    const [reportFocus, setReportFocus] = useState<ReportFocus>('SALES');
    const [jewelerFilter, setJewelerFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const [ordersData, usersData] = await Promise.all([
                OrdersService.getOrders(),
                UsersService.getAll(),
            ]);
            setOrders(ordersData || []);
            setUsers(usersData || []);
        } catch (error) {
            console.error('Error fetching orders for reports', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // Handle Quick Date Presets
    const handlePresetChange = (preset: DateFilterPreset) => {
        setDatePreset(preset);
        const now = new Date();
        let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (preset) {
            case 'today':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'yesterday':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                break;
            case 'week': {
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
                start = new Date(now.getFullYear(), now.getMonth(), diff);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            }
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'custom':
                return;
        }

        setStartDate(getLocalDateString(start));
        setEndDate(getLocalDateString(end));
    };

    // Helper: Determine if order is delivered and get delivery date
    const getOrderDeliveryDate = (order: OrderItem): Date | null => {
        const rawStatus = (order.status || '').toUpperCase();
        const rawStage = (order.stage || '').toUpperCase();
        const isDelivered =
            rawStatus === 'DELIVERED' ||
            rawStatus === 'ENTREGADO' ||
            rawStage === 'ENTREGADO' ||
            rawStage === 'ENTREGADO_POSTVENTA' ||
            rawStage === 'DELIVERED';

        if (!isDelivered) return null;

        if (order.deliveredAt) {
            const parsed = new Date(order.deliveredAt);
            if (!isNaN(parsed.getTime())) return parsed;
        }
        // Fallback to updatedAt if deliveredAt was not explicitly recorded
        if (order.updatedAt) {
            const parsed = new Date(order.updatedAt);
            if (!isNaN(parsed.getTime())) return parsed;
        }
        return order.createdAt ? new Date(order.createdAt) : new Date();
    };

    // Helper: Parse numerical amount safely
    const getOrderTotalAmount = (order: OrderItem): number => {
        const total = parseFloat(String(order.totalAmount || '0'));
        if (!isNaN(total) && total > 0) return total;
        const val = parseFloat(String(order.value || '0'));
        if (!isNaN(val) && val > 0) return val;
        return 0;
    };

    // La mano de obra del joyero vive por pieza. No forma parte de ventas,
    // totales, balances, ni de las notificaciones al cliente.
    const getJewelerLaborAmount = (order: OrderItem): number => {
        const items = Array.isArray(order.specifications?.items) ? order.specifications.items : [];
        return items.reduce((sum: number, item: any) => {
            const amount = Number(String(item?.jewelerLaborCost ?? 0).replace(/[^0-9.-]/g, ''));
            return sum + (Number.isFinite(amount) ? amount : 0);
        }, 0);
    };

    // New orders save the assigned jeweler's percentage as a snapshot. For
    // older orders, fall back to the active jeweler profile without changing
    // sales totals or the order itself.
    const getJewelerCompensation = (order: OrderItem): JewelerCompensation => {
        const specs = order.specifications || {};
        const rawName = String(
            specs.assignedJeweler || specs.assignedTo || specs.jewelerName ||
            specs.readyByName || specs.readyBy?.name || order.readyByName ||
            order.completedByName || ''
        ).trim();
        const rawId = specs.jewelerId || specs.readyBy?.id;
        const profile = users.find(user =>
            (rawId && user.id === rawId) ||
            (rawName && [user.name, user.username, user.email]
                .filter(Boolean)
                .some(value => String(value).trim().toLowerCase() === rawName.toLowerCase()))
        );
        const snapshotPercentage = Number(specs.jewelerPercentage);
        const profilePercentage = Number(profile?.jewelerPercentage);
        const percentage = Number.isFinite(snapshotPercentage)
            ? snapshotPercentage
            : Number.isFinite(profilePercentage)
                ? profilePercentage
                : 0;
        const baseLabor = getJewelerLaborAmount(order);

        return {
            id: rawId || profile?.id,
            // Historical orders can store the e-mail in readyByName. Prefer
            // the profile name whenever we can resolve that user.
            name: profile?.name || profile?.username || rawName || 'Sin joyero asignado',
            percentage,
            baseLabor,
            payout: baseLabor * (percentage / 100),
        };
    };

    const jewelers = useMemo(() => users.filter(user => user.role === 'JOYERO'), [users]);

    // Filter delivered orders in date range
    const filteredDeliveredOrders = useMemo(() => {
        const start = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T23:59:59.999`);

        return orders.filter(order => {
            const deliveryDate = getOrderDeliveryDate(order);
            if (!deliveryDate) return false;

            // Date Range check (local timestamp comparison)
            const time = deliveryDate.getTime();
            if (time < start.getTime() || time > end.getTime()) return false;

            // Type filter check
            if (typeFilter !== 'ALL' && order.type !== typeFilter) return false;

            if (reportFocus === 'JEWELER' && jewelerFilter !== 'ALL') {
                const compensation = getJewelerCompensation(order);
                if (compensation.id !== jewelerFilter) return false;
            }

            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const clientName = (order.client?.name || '').toLowerCase();
                const clientPhone = (order.client?.phone || '').toLowerCase();
                const folio = (order.id || '').toLowerCase();
                const piece = (order.pieceType || '').toLowerCase();
                const metal = (order.metal || '').toLowerCase();
                const notes = (order.notes || '').toLowerCase();
                const userName = (order.createdBy?.name || order.createdByName || order.specifications?.receivedBy || '').toLowerCase();

                const matches =
                    clientName.includes(q) ||
                    clientPhone.includes(q) ||
                    folio.includes(q) ||
                    piece.includes(q) ||
                    metal.includes(q) ||
                    notes.includes(q) ||
                    userName.includes(q);

                if (!matches) return false;
            }

            return true;
        }).sort((a, b) => {
            const dateA = getOrderDeliveryDate(a)?.getTime() || 0;
            const dateB = getOrderDeliveryDate(b)?.getTime() || 0;
            return dateB - dateA; // Most recent first
        });
    }, [orders, startDate, endDate, typeFilter, searchQuery, reportFocus, jewelerFilter, users]);

    // Financial & KPI Aggregations
    const kpis = useMemo(() => {
        let totalCount = 0;
        let totalSum = 0;
        let repairCount = 0;
        let repairSum = 0;
        let manufactureCount = 0;
        let manufactureSum = 0;
        let layawayCount = 0;
        let layawaySum = 0;
        let jewelerLaborSum = 0;
        let jewelerPayoutSum = 0;
        let repairJewelerLaborSum = 0;
        let repairJewelerPayoutSum = 0;
        let manufactureJewelerLaborSum = 0;
        let manufactureJewelerPayoutSum = 0;

        filteredDeliveredOrders.forEach(order => {
            const amount = getOrderTotalAmount(order);
            totalCount++;
            totalSum += amount;
            const jewelerCompensation = getJewelerCompensation(order);
            jewelerLaborSum += jewelerCompensation.baseLabor;
            jewelerPayoutSum += jewelerCompensation.payout;

            if (order.type === 'REPAIR') {
                repairCount++;
                repairSum += amount;
                repairJewelerLaborSum += jewelerCompensation.baseLabor;
                repairJewelerPayoutSum += jewelerCompensation.payout;
            } else if (order.type === 'MANUFACTURE') {
                manufactureCount++;
                manufactureSum += amount;
                manufactureJewelerLaborSum += jewelerCompensation.baseLabor;
                manufactureJewelerPayoutSum += jewelerCompensation.payout;
            } else if (order.type === 'LAYAWAY') {
                layawayCount++;
                layawaySum += amount;
            }
        });

        const avgTicket = totalCount > 0 ? totalSum / totalCount : 0;

        return {
            totalCount,
            totalSum,
            repairCount,
            repairSum,
            manufactureCount,
            manufactureSum,
            layawayCount,
            layawaySum,
            avgTicket,
            jewelerLaborSum,
            jewelerPayoutSum,
            repairJewelerLaborSum,
            repairJewelerPayoutSum,
            manufactureJewelerLaborSum,
            manufactureJewelerPayoutSum,
        };
    }, [filteredDeliveredOrders]);

    // Format Currency Helper
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Format Date/Time Helper
    const formatDateTime = (date: Date | null) => {
        if (!date) return '-';
        return new Intl.DateTimeFormat('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(date);
    };

    const formatDateOnly = (dateStr: string) => {
        if (!dateStr) return '-';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [y, m, d] = dateStr.split('-').map(Number);
            const localD = new Date(y, m - 1, d);
            return new Intl.DateTimeFormat('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).format(localD);
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '-';
        return new Intl.DateTimeFormat('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(d);
    };

    // Export to CSV
    const exportToCSV = () => {
        if (filteredDeliveredOrders.length === 0) {
            alert('No hay órdenes entregadas en este periodo para exportar.');
            return;
        }

        const headers = ['Folio', 'Tipo', 'Cliente', 'Telefono', 'Pieza', 'Detalles', 'Fecha Entrega', 'Fecha Recepcion', 'Valor Total', 'Joyero', 'Porcentaje Joyero', 'Mano de Obra Joyero', 'Pago Joyero'];
        const rows = filteredDeliveredOrders.map(o => {
            const delDate = getOrderDeliveryDate(o);
            const amount = getOrderTotalAmount(o);
            const compensation = getJewelerCompensation(o);
            return [
                `#${o.id.substring(0, 8).toUpperCase()}`,
                o.type === 'REPAIR' ? 'REPARACION' : o.type === 'MANUFACTURE' ? 'FABRICACION' : o.type,
                `"${(o.client?.name || '').replace(/"/g, '""')}"`,
                `"${o.client?.phone || ''}"`,
                `"${(o.pieceType || '').replace(/"/g, '""')}"`,
                `"${[o.metal, o.karats, o.weight, o.size].filter(Boolean).join(' - ')}"`,
                `"${delDate ? delDate.toLocaleString('es-MX') : ''}"`,
                `"${new Date(o.createdAt).toLocaleDateString('es-MX')}"`,
                amount,
                `"${compensation.name.replace(/"/g, '""')}"`,
                compensation.percentage,
                compensation.baseLabor,
                compensation.payout,
            ];
        });

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Reporte_Entregas_${startDate}_al_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    const selectedJewelerCompensation = selectedOrder
        ? getJewelerCompensation(selectedOrder)
        : null;

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto px-6 py-8 transition-colors">
            {/* Header section */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black">
                            <span className="material-symbols-outlined text-2xl">analytics</span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-foreground font-display">
                            Reporte de Entregas
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Auditoría y balance de órdenes entregadas de Reparaciones y Fabricación con valor total.
                    </p>
                </div>

                <div className="flex items-center gap-3 no-print">
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground font-bold text-xs uppercase tracking-wider hover:bg-muted transition-all shadow-sm active:scale-95"
                        title="Exportar a CSV / Excel"
                    >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        Exportar CSV
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-lg active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[18px]">print</span>
                        Imprimir Reporte
                    </button>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-card border border-border rounded-3xl p-6 mb-8 shadow-sm space-y-6 no-print">
                {/* Preset Date Buttons & Custom Range */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
                            Periodo:
                        </span>
                        {(['today', 'yesterday', 'week', 'month', 'custom'] as DateFilterPreset[]).map(preset => {
                            const labels: Record<DateFilterPreset, string> = {
                                today: 'Hoy',
                                yesterday: 'Ayer',
                                week: 'Esta Semana',
                                month: 'Este Mes',
                                custom: 'Personalizado'
                            };
                            const isActive = datePreset === preset;
                            return (
                                <button
                                    key={preset}
                                    onClick={() => handlePresetChange(preset)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                        isActive
                                            ? 'bg-foreground text-background shadow-md'
                                            : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                                    }`}
                                >
                                    {labels[preset]}
                                </button>
                            );
                        })}
                    </div>

                    {/* Date Inputs */}
                    <div className="flex items-center gap-3 bg-muted/40 p-2 rounded-2xl border border-border">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-muted-foreground">calendar_today</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => {
                                    setStartDate(e.target.value);
                                    setDatePreset('custom');
                                }}
                                className="bg-transparent text-foreground text-xs font-bold outline-none cursor-pointer"
                            />
                        </div>
                        <span className="text-muted-foreground text-xs font-bold">al</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => {
                                    setEndDate(e.target.value);
                                    setDatePreset('custom');
                                }}
                                className="bg-transparent text-foreground text-xs font-bold outline-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* Sub-toolbar: Order Type tabs & Live Search */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
                    {/* Type Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
                            Tipo:
                        </span>
                        <div className="flex bg-muted p-1 rounded-2xl border border-border">
                            {[
                                { id: 'ALL', label: 'Todas las Órdenes' },
                                { id: 'REPAIR', label: 'Reparaciones' },
                                { id: 'MANUFACTURE', label: 'Fabricación' },
                                { id: 'DESIGN', label: 'Diseño' },
                                { id: 'LASER', label: 'Láser' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setTypeFilter(tab.id as OrderTypeFilter)}
                                    className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                                        typeFilter === tab.id
                                            ? 'bg-card text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-80">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">
                            search
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar cliente, folio, pieza..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground placeholder-muted-foreground text-xs outline-none focus:border-indigo-500 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 pt-4 border-t border-border">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">Vista:</span>
                    <div className="flex bg-muted p-1 rounded-2xl border border-border">
                        {([{ id: 'SALES', label: 'Ventas' }, { id: 'JEWELER', label: 'Joyero' }] as const).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setReportFocus(tab.id)}
                                className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${reportFocus === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <span className="text-[11px] text-muted-foreground">{reportFocus === 'JEWELER' ? 'Suma exclusivamente mano de obra joyero.' : 'Valores comerciales de las órdenes.'}</span>
                </div>
                {reportFocus === 'JEWELER' && (
                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border">
                        <label htmlFor="report-jeweler" className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">Joyero:</label>
                        <select
                            id="report-jeweler"
                            value={jewelerFilter}
                            onChange={event => setJewelerFilter(event.target.value)}
                            className="min-w-52 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-cyan-500"
                        >
                            <option value="ALL">Todos los joyeros</option>
                            {jewelers.map(jeweler => (
                                <option key={jeweler.id} value={jeweler.id}>{jeweler.name || jeweler.username || jeweler.email}</option>
                            ))}
                        </select>
                        <span className="text-[11px] text-muted-foreground">El pago es Mano de Obra Joyero × porcentaje asignado.</span>
                    </div>
                )}
            </div>

            {/* Print Header (Only visible on physical/PDF print) */}
            <div className="hidden print-only mb-6 pb-4 border-b border-black">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">CARED - REPORTE DE ENTREGAS</h2>
                        <p className="text-xs text-gray-600">
                            Periodo: {formatDateOnly(startDate)} al {formatDateOnly(endDate)} | Tipo: {typeFilter === 'ALL' ? 'Todas' : typeFilter}
                        </p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                        Impreso el: {new Date().toLocaleString('es-MX')}
                    </div>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {/* Total Delivered */}
                <div className="p-6 rounded-3xl bg-card border border-border shadow-sm flex flex-col justify-between hover:border-indigo-500/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Entregas Realizadas
                        </span>
                        <div className="size-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-foreground font-display tracking-tight">
                            {kpis.totalCount}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Órdenes concluidas y entregadas
                        </p>
                    </div>
                </div>

                {/* Total Value Delivered */}
                <div className="p-6 rounded-3xl bg-card border border-emerald-500/20 shadow-sm flex flex-col justify-between hover:border-emerald-500/40 transition-all bg-gradient-to-br from-emerald-500/[0.03] to-transparent">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                            {reportFocus === 'JEWELER' ? 'Pago a Joyeros' : 'Valor Total Entregado'}
                        </span>
                        <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px]">attach_money</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-emerald-500 font-display tracking-tight">
                            {formatMoney(reportFocus === 'JEWELER' ? kpis.jewelerPayoutSum : kpis.totalSum)}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            {reportFocus === 'JEWELER' ? 'Mano de obra joyero × porcentaje' : 'Suma de valores de órdenes'}
                        </p>
                    </div>
                </div>

                {/* Repairs Total */}
                <div className="p-6 rounded-3xl bg-card border border-border shadow-sm flex flex-col justify-between hover:border-blue-500/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                            {reportFocus === 'JEWELER' ? 'Pago Joyero Reparaciones' : 'Reparaciones Entregadas'}
                        </span>
                        <div className="size-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px]">handyman</span>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-foreground font-display">
                                {formatMoney(reportFocus === 'JEWELER' ? kpis.repairJewelerPayoutSum : kpis.repairSum)}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground">
                                ({kpis.repairCount})
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            {reportFocus === 'JEWELER' ? 'Mano de obra × porcentaje' : 'Servicios de taller entregados'}
                        </p>
                    </div>
                </div>

                {/* Manufacture Total */}
                <div className="p-6 rounded-3xl bg-card border border-border shadow-sm flex flex-col justify-between hover:border-purple-500/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-500">
                            {reportFocus === 'JEWELER' ? 'Pago Joyero Fabricación' : 'Fabricación Entregada'}
                        </span>
                        <div className="size-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px]">diamond</span>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-foreground font-display">
                                {formatMoney(reportFocus === 'JEWELER' ? kpis.manufactureJewelerPayoutSum : kpis.manufactureSum)}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground">
                                ({kpis.manufactureCount})
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            {reportFocus === 'JEWELER' ? 'Mano de obra × porcentaje' : 'Joyería a medida entregada'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Deliveries Detailed Table */}
            <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-foreground">
                            Detalle de Órdenes Entregadas
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Mostrando {filteredDeliveredOrders.length} {filteredDeliveredOrders.length === 1 ? 'registro' : 'registros'} en el periodo seleccionado
                        </p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-wider">Cargando reporte de entregas...</span>
                    </div>
                ) : filteredDeliveredOrders.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
                        <div className="size-16 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground">
                            <span className="material-symbols-outlined text-3xl">inventory_2</span>
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-foreground">No se encontraron entregas</h4>
                            <p className="text-xs text-muted-foreground max-w-sm mt-1">
                                No hay órdenes con estado entregado en el rango del {formatDateOnly(startDate)} al {formatDateOnly(endDate)}.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    <th className="py-4 px-6">Folio / ID</th>
                                    <th className="py-4 px-6">Tipo</th>
                                    <th className="py-4 px-6">Cliente</th>
                                    <th className="py-4 px-6">Pieza / Detalles</th>
                                    <th className="py-4 px-6">Fecha Entrega</th>
                                    <th className="py-4 px-6">{reportFocus === 'JEWELER' ? 'Joyero' : 'Usuario'}</th>
                                    <th className="py-4 px-6">Fecha Recepción</th>
                                    <th className="py-4 px-6 text-right">{reportFocus === 'JEWELER' ? 'Pago Joyero' : 'Valor de la Orden'}</th>
                                    <th className="py-4 px-6 text-center no-print">Detalle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-xs">
                                {filteredDeliveredOrders.map(order => {
                                    const deliveryDate = getOrderDeliveryDate(order);
                                    const totalAmount = getOrderTotalAmount(order);
                                    const compensation = getJewelerCompensation(order);
                                    const isRepair = order.type === 'REPAIR';

                                    return (
                                        <tr key={order.id} className="hover:bg-muted/20 transition-colors group">
                                            {/* Folio */}
                                            <td className="py-4 px-6 font-mono font-bold text-foreground">
                                                #{order.id.substring(0, 8).toUpperCase()}
                                            </td>

                                            {/* Tipo */}
                                            <td className="py-4 px-6">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                                        isRepair
                                                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                    }`}
                                                >
                                                    <span className="material-symbols-outlined text-[13px]">
                                                        {isRepair ? 'handyman' : 'diamond'}
                                                    </span>
                                                    {isRepair ? 'Reparación' : 'Fabricación'}
                                                </span>
                                            </td>

                                            {/* Cliente */}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-xl bg-muted text-foreground flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                                        {(order.client?.name || 'C').substring(0, 2)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-foreground truncate">
                                                            {order.client?.name || 'Cliente sin nombre'}
                                                        </p>
                                                        {order.client?.phone && (
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {order.client.phone}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Pieza / Detalles */}
                                            <td className="py-4 px-6">
                                                <div className="space-y-0.5">
                                                    <p className="font-bold text-foreground">
                                                        {order.pieceType || 'Sin especificar'}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {[order.metal, order.karats, order.weight, order.size].filter(Boolean).join(' • ') || 'Estándar'}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Fecha Entrega */}
                                            <td className="py-4 px-6 font-mono text-muted-foreground">
                                                <span className="text-foreground font-semibold">
                                                    {formatDateTime(deliveryDate)}
                                                </span>
                                            </td>

                                            {/* Responsable operativo o joyero con porcentaje de pago */}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`material-symbols-outlined text-[15px] ${reportFocus === 'JEWELER' ? 'text-cyan-500' : 'text-emerald-500'}`}>{reportFocus === 'JEWELER' ? 'handyman' : 'done_all'}</span>
                                                    <span className="font-bold text-foreground uppercase tracking-tight text-xs">
                                                        {reportFocus === 'JEWELER'
                                                            ? compensation.name
                                                            : (order.specifications?.readyByName ||
                                                                order.specifications?.readyBy?.name ||
                                                                order.readyByName ||
                                                                order.completedByName ||
                                                                (order.type === 'REPAIR' || order.type === 'MANUFACTURE'
                                                                    ? 'Joyero'
                                                                    : (order.createdBy?.name || order.createdByName || order.specifications?.receivedBy || '—')))}
                                                    </span>
                                                </div>
                                                {reportFocus === 'JEWELER' && (
                                                    <p className="mt-1 pl-5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                                                        {compensation.percentage.toLocaleString('es-MX', { maximumFractionDigits: 2 })}% asignado
                                                    </p>
                                                )}
                                            </td>

                                            {/* Fecha Recepción */}
                                            <td className="py-4 px-6 font-mono text-muted-foreground">
                                                {formatDateOnly(order.createdAt)}
                                            </td>

                                            {/* Valor de la orden o pago calculado del joyero */}
                                            <td className="py-4 px-6 text-right font-mono font-bold text-sm text-foreground">
                                                {reportFocus === 'JEWELER' ? (
                                                    <div>
                                                        <p className="font-black text-cyan-600 dark:text-cyan-400">{formatMoney(compensation.payout)}</p>
                                                        <p className="mt-1 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                                                            {formatMoney(compensation.baseLabor)} × {compensation.percentage.toLocaleString('es-MX', { maximumFractionDigits: 2 })}%
                                                        </p>
                                                    </div>
                                                ) : formatMoney(totalAmount)}
                                            </td>

                                            {/* Acción Ver Detalle */}
                                            <td className="py-4 px-6 text-center no-print">
                                                <button
                                                    onClick={() => setSelectedOrder(order)}
                                                    className="size-8 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 inline-flex items-center justify-center transition-all"
                                                    title="Ver detalles de la orden"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-border bg-muted/40 font-bold text-foreground">
                                    <td colSpan={7} className="py-4 px-6 text-right text-xs uppercase tracking-wider">
                                        {reportFocus === 'JEWELER' ? 'Total a Pagar a Joyeros:' : 'Total Facturado en Entregas:'}
                                    </td>
                                    <td className="py-4 px-6 text-right font-mono text-base text-emerald-500 font-black">
                                        {formatMoney(reportFocus === 'JEWELER' ? kpis.jewelerPayoutSum : kpis.totalSum)}
                                    </td>
                                    <td className="no-print"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Quick Order Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-2 backdrop-blur-sm sm:p-4">
                    <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:max-h-[calc(100dvh-2rem)]">
                        <div className="flex shrink-0 items-center justify-between border-b border-border p-5 sm:p-6">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                    <span className="material-symbols-outlined">receipt</span>
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-foreground">
                                        Orden #{selectedOrder.id.substring(0, 8).toUpperCase()}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedOrder.type === 'REPAIR' ? 'Reparación' : 'Fabricación'} • Entregada
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 text-xs sm:p-6">
                            {/* Cliente */}
                            <div className="p-3.5 rounded-2xl bg-muted/50 border border-border space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Cliente</span>
                                <p className="font-bold text-foreground text-sm">{selectedOrder.client?.name || 'Sin nombre'}</p>
                                <p className="text-muted-foreground">{selectedOrder.client?.phone || 'Sin teléfono'}</p>
                            </div>

                            {/* Especificaciones Técnicas */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pieza</span>
                                    <p className="font-bold text-foreground mt-0.5">{selectedOrder.pieceType || '-'}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Metal / Quilates</span>
                                    <p className="font-bold text-foreground mt-0.5">
                                        {[selectedOrder.metal, selectedOrder.karats].filter(Boolean).join(' ') || '-'}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Peso / Medida</span>
                                    <p className="font-bold text-foreground mt-0.5">
                                        {[selectedOrder.weight, selectedOrder.size].filter(Boolean).join(' / ') || '-'}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Valor Total</span>
                                    <p className="font-black text-emerald-500 mt-0.5 text-sm">
                                        {formatMoney(getOrderTotalAmount(selectedOrder))}
                                    </p>
                                </div>
                            </div>

                            {/* Responsable y fechas */}
                            <div className="grid grid-cols-3 gap-3 text-muted-foreground">
                                <div>
                                    <span className="text-[10px] font-bold uppercase">Recepción:</span>
                                    <p className="font-mono text-foreground">{formatDateOnly(selectedOrder.createdAt)}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase">Joyero:</span>
                                    <p className="font-bold text-foreground truncate">
                                        {selectedJewelerCompensation?.name || 'Sin joyero asignado'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase">Entrega:</span>
                                    <p className="font-mono text-foreground">{formatDateTime(getOrderDeliveryDate(selectedOrder))}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 sm:grid-cols-3">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Mano de Obra Joyero</span>
                                    <p className="mt-1 font-bold text-foreground">{formatMoney(selectedJewelerCompensation?.baseLabor || 0)}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Porcentaje</span>
                                    <p className="mt-1 font-bold text-cyan-600 dark:text-cyan-400">
                                        {(selectedJewelerCompensation?.percentage || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })}%
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pago Joyero</span>
                                    <p className="mt-1 font-black text-cyan-600 dark:text-cyan-400">{formatMoney(selectedJewelerCompensation?.payout || 0)}</p>
                                </div>
                            </div>

                            {/* Observaciones */}
                            {selectedOrder.notes && (
                                <div className="p-3 rounded-xl bg-muted/20 border border-border space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Notas / Observaciones</span>
                                    <p className="text-foreground">{selectedOrder.notes}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex shrink-0 justify-end border-t border-border bg-background/95 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-6">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="px-5 py-2.5 rounded-xl bg-muted text-foreground font-bold text-xs uppercase tracking-wider hover:bg-muted/80 transition-all"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
