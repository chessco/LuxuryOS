import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStatusLabel, formatOrderCode } from '../../pages/Orders';
import { OrdersService } from '../../services/orders.service';

interface OrdersTableProps {
    orders: any[];
    activeFilter?: string | null;
    onOrderDeleted?: () => void;
    onRefresh?: () => void;
}

type SortConfig = {
    key: string;
    direction: 'asc' | 'desc';
} | null;

const getStatusOptions = (orderType: string, currentStatus?: string) => {
    const type = (orderType || 'STANDARD').toUpperCase();
    let opts: { value: string; label: string }[] = [];
    if (type === 'REPAIR') {
        opts = [
            { value: 'RECEIVED', label: 'RECIBIDO' },
            { value: 'IN_REPAIR', label: 'EN TALLER' },
            { value: 'REPAIR_COMPLETED', label: 'LISTO' },
            { value: 'DELIVERED', label: 'ENTREGADO' },
            { value: 'CANCELLED', label: 'CANCELADO' }
        ];
    } else if (type === 'MANUFACTURE') {
        opts = [
            { value: 'RECEIVED', label: 'RECIBIDO' },
            { value: 'IN_PRODUCTION', label: 'EN TALLER' },
            { value: 'READY_FOR_PICKUP', label: 'LISTO' },
            { value: 'DELIVERED', label: 'ENTREGADO' },
            { value: 'CANCELLED', label: 'CANCELADO' }
        ];
    } else if (type === 'LAYAWAY') {
        opts = [
            { value: 'LAYAWAY_OPEN', label: 'APARTADO' },
            { value: 'LAYAWAY_EXPIRED', label: 'VENCIDO' },
            { value: 'DELIVERED', label: 'ENTREGADO' },
            { value: 'CANCELLED', label: 'CANCELADO' }
        ];
    } else {
        opts = [
            { value: 'INTERES_LEAD', label: 'INTERÉS / LEAD' },
            { value: 'COTIZACION_ENVIADA', label: 'COTIZACIÓN' },
            { value: 'APROBADO_ANTICIPO', label: 'APROBADO / ANTICIPO' },
            { value: 'EN_PRODUCCION', label: 'EN PRODUCCIÓN' },
            { value: 'CONTROL_CALIDAD', label: 'CONTROL CALIDAD' },
            { value: 'ENTREGADO_POSTVENTA', label: 'ENTREGADO' },
            { value: 'CANCELLED', label: 'CANCELADO' }
        ];
    }

    if (currentStatus && !opts.some(o => o.value === currentStatus)) {
        opts.unshift({ value: currentStatus, label: getStatusLabel(currentStatus) });
    }
    return opts;
};

const getOrderSeq = (order: any) => {
    if (typeof order.sequenceNumber === 'number' && order.sequenceNumber > 0) {
        return order.sequenceNumber;
    }
    const code = order.orderCode || formatOrderCode(order);
    const digits = String(code).replace(/[^0-9]/g, '');
    return digits ? parseInt(digits, 10) : 0;
};

export const OrdersTable: React.FC<OrdersTableProps> = ({ orders, activeFilter, onOrderDeleted, onRefresh }) => {
    const navigate = useNavigate();
    const isDeliveredFilter = activeFilter === 'Entregados' || activeFilter === 'Entregado';
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isSystemAdmin = user.role === 'SYSTEM_ADMIN' || user.role === 'TENANT_ADMIN' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

    const sortedOrders = useMemo(() => {
        let sortableItems = [...orders];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue: any = a[sortConfig.key];
                let bValue: any = b[sortConfig.key];

                if (sortConfig.key === 'id' || sortConfig.key === 'orderCode') {
                    aValue = getOrderSeq(a);
                    bValue = getOrderSeq(b);
                } else if (sortConfig.key === 'client') {
                    aValue = a.client?.name || a.client || '';
                    bValue = b.client?.name || b.client || '';
                } else if (sortConfig.key === 'createdByName') {
                    aValue = a.createdByName || a.createdBy?.name || '';
                    bValue = b.createdByName || b.createdBy?.name || '';
                } else if (sortConfig.key === 'value' || sortConfig.key === 'totalAmount' || sortConfig.key === 'laborCost') {
                    aValue = parseFloat(String(a.laborCost || a.value || 0).replace(/[^0-9.-]/g, '')) || 0;
                    bValue = parseFloat(String(b.laborCost || b.value || 0).replace(/[^0-9.-]/g, '')) || 0;
                } else if (sortConfig.key === 'promisedDate') {
                    aValue = a.promisedDate || '';
                    bValue = b.promisedDate || '';
                } else if (sortConfig.key === 'priority') {
                    aValue = a.priority || '';
                    bValue = b.priority || '';
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        } else if (isDeliveredFilter) {
            sortableItems.sort((a, b) => {
                const dateA = a.deliveredAt ? new Date(a.deliveredAt).getTime() : (a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime());
                const dateB = b.deliveredAt ? new Date(b.deliveredAt).getTime() : (b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(a.createdAt).getTime());
                return dateB - dateA;
            });
        } else {
            sortableItems.sort((a, b) => getOrderSeq(a) - getOrderSeq(b));
        }
        return sortableItems;
    }, [orders, sortConfig, isDeliveredFilter]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) {
            if (isDeliveredFilter && key === 'deliveredDate' && sortConfig === null) {
                return <span className="material-symbols-outlined text-[14px] text-emerald-500">arrow_downward</span>;
            }
            return <span className="material-symbols-outlined text-[14px] opacity-20">swap_vert</span>;
        }
        return sortConfig.direction === 'asc'
            ? <span className="material-symbols-outlined text-[14px] text-indigo-500">arrow_upward</span>
            : <span className="material-symbols-outlined text-[14px] text-indigo-500">arrow_downward</span>;
    };

    const HeaderTh: React.FC<{ label: string, sortKey: string, align?: 'left' | 'right' }> = ({ label, sortKey, align = 'left' }) => (
        <th
            className={`px-6 py-5 text-${align} group/th cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-white/[0.02] transition-colors`}
            onClick={() => requestSort(sortKey)}
        >
            <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
                <span className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">{label}</span>
                {getSortIcon(sortKey)}
            </div>
        </th>
    );

    const stopPropagationTouch = (e: React.SyntheticEvent) => {
        e.stopPropagation();
    };

    return (
        <div className="w-full px-4 overflow-hidden transition-colors">
            <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 rounded-[32px] overflow-x-auto custom-scrollbar backdrop-blur-sm shadow-sm dark:shadow-2xl transition-colors">
                <table className="w-full border-collapse min-w-[900px]">
                    <thead>
                        <tr className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/60 transition-colors">
                            <HeaderTh label="Pedido" sortKey="id" />
                            <HeaderTh label="Fecha Entrega" sortKey="promisedDate" />
                            <HeaderTh label="Prioridad" sortKey="priority" />
                            <HeaderTh label="Cliente" sortKey="client" />
                            <HeaderTh label="Descripción" sortKey="item" />
                            <HeaderTh label="Mano de Obra" sortKey="laborCost" />
                            <HeaderTh label="Estado" sortKey="status" />
                            {isSystemAdmin && <th className="px-6 py-5 w-14"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/30">
                        {sortedOrders.map((order) => (
                            <tr
                                key={order.id}
                                onClick={() => navigate(`/orders/${order.id}`)}
                                className="group hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                            >
                                {/* 1. Pedido */}
                                <td className="px-6 py-5">
                                    <span className="text-zinc-900 dark:text-white text-xs font-black tracking-wider uppercase transition-colors">{order.orderCode || formatOrderCode(order)}</span>
                                </td>

                                {/* 2. Fecha Entrega */}
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 w-fit">
                                        <span className="material-symbols-outlined text-[13px]">event</span>
                                        <span className="text-[11px] font-black tracking-tight">{order.promisedDate || order.deliveredDate || '—'}</span>
                                    </div>
                                </td>

                                {/* 3. Prioridad */}
                                <td
                                    className="px-6 py-5"
                                    onClick={stopPropagationTouch}
                                    onTouchStart={stopPropagationTouch}
                                    onTouchEnd={stopPropagationTouch}
                                    onPointerDown={stopPropagationTouch}
                                >
                                    <select
                                        value={(order.priority || 'MEDIA').toUpperCase()}
                                        onChange={async (e) => {
                                            const newPriority = e.target.value;
                                            try {
                                                await OrdersService.updateOrder(order.id, { priority: newPriority });
                                                if (onRefresh) onRefresh();
                                            } catch (err) {
                                                console.error("Error updating priority:", err);
                                            }
                                        }}
                                        onClick={stopPropagationTouch}
                                        onTouchStart={stopPropagationTouch}
                                        onTouchEnd={stopPropagationTouch}
                                        onPointerDown={stopPropagationTouch}
                                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer outline-none border transition-all shadow-sm ${
                                            (order.priority || '').toUpperCase() === 'ALTA'
                                                ? 'bg-amber-400 text-black border-amber-500 font-black'
                                                : (order.priority || '').toUpperCase() === 'MEDIA'
                                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-bold'
                                                : 'bg-muted text-muted-foreground border-border font-medium'
                                        }`}
                                        title="Cambiar prioridad"
                                    >
                                        <option value="BAJA" className="bg-background text-foreground">! BAJA</option>
                                        <option value="MEDIA" className="bg-background text-foreground">! MEDIA</option>
                                        <option value="ALTA" className="bg-background font-bold text-amber-500">! ALTA ⚡</option>
                                    </select>
                                </td>

                                {/* 4. Cliente */}
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`size-7 rounded-full flex items-center justify-center text-[9px] font-black border border-zinc-100 dark:border-zinc-800 transition-colors ${order.initialsColor || 'bg-zinc-50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                            {order.initials}
                                        </div>
                                        <span className="text-zinc-900 dark:text-white text-xs font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight whitespace-nowrap">{order.client}</span>
                                    </div>
                                </td>

                                {/* 5. Descripción */}
                                <td className="px-6 py-5">
                                    <span className="text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-colors">{order.description || order.item}</span>
                                </td>

                                {/* 6. Mano de Obra */}
                                <td className="px-6 py-5">
                                    <span className="text-zinc-900 dark:text-white font-black text-xs tracking-tight transition-colors">{order.laborCost || order.value}</span>
                                </td>

                                {/* 7. Estado */}
                                <td
                                    className="px-6 py-5"
                                    onClick={stopPropagationTouch}
                                    onTouchStart={stopPropagationTouch}
                                    onTouchEnd={stopPropagationTouch}
                                    onPointerDown={stopPropagationTouch}
                                >
                                    {(() => {
                                        const rawStatus = (order.status || order.stage || 'RECEIVED').toUpperCase();
                                        const displayLabel = getStatusLabel(order.statusLabel || rawStatus);
                                        const isDelivered = displayLabel === 'ENTREGADO' || rawStatus === 'DELIVERED' || rawStatus === 'ENTREGADO_POSTVENTA';
                                        const isReady = displayLabel === 'PARA ENTREGA' || displayLabel === 'LISTO' || rawStatus === 'REPAIR_COMPLETED' || rawStatus === 'READY_FOR_PICKUP' || rawStatus === 'READY';
                                        const isInWorkshop = displayLabel === 'EN TALLER' || displayLabel === 'PRODUCCIÓN' || rawStatus === 'IN_REPAIR' || rawStatus === 'IN_PRODUCTION' || rawStatus === 'EN_PRODUCCION' || rawStatus === 'QUALITY_CHECK';

                                        const options = getStatusOptions(order.type, rawStatus);

                                        return (
                                            <select
                                                value={rawStatus}
                                                onChange={async (e) => {
                                                    const newStatus = e.target.value;
                                                    try {
                                                        await OrdersService.moveOrder(order.id, newStatus);
                                                        if (onRefresh) onRefresh();
                                                    } catch (err) {
                                                        console.error("Error updating status:", err);
                                                        alert("Error al cambiar estado");
                                                    }
                                                }}
                                                onClick={stopPropagationTouch}
                                                onTouchStart={stopPropagationTouch}
                                                onTouchEnd={stopPropagationTouch}
                                                onPointerDown={stopPropagationTouch}
                                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer outline-none border transition-all shadow-sm ${
                                                    isDelivered
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                                        : isReady
                                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                                        : isInWorkshop
                                                        ? 'bg-yellow-300 dark:bg-yellow-400 text-black border-yellow-500 font-black'
                                                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 font-bold'
                                                }`}
                                                title="Modificar estado directamente"
                                            >
                                                {options.map((opt) => (
                                                    <option key={opt.value} value={opt.value} className="bg-background text-foreground font-bold">
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        );
                                    })()}
                                </td>

                                {isSystemAdmin && (
                                    <td
                                        className="px-8 py-6 text-center"
                                        onClick={stopPropagationTouch}
                                        onTouchStart={stopPropagationTouch}
                                        onTouchEnd={stopPropagationTouch}
                                        onPointerDown={stopPropagationTouch}
                                    >
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (window.confirm("¿Seguro que deseas eliminar permanentemente este pedido? Esta acción no se puede deshacer y borrará todos los pagos asociados.")) {
                                                    try {
                                                        await OrdersService.deleteOrder(order.id);
                                                        alert("Pedido eliminado exitosamente.");
                                                        if (onOrderDeleted) onOrderDeleted();
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert("Error al eliminar el pedido.");
                                                    }
                                                }
                                            }}
                                            onTouchStart={stopPropagationTouch}
                                            onTouchEnd={stopPropagationTouch}
                                            onPointerDown={stopPropagationTouch}
                                            className="size-8 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white flex items-center justify-center border border-red-500/20 transition-all active:scale-95 mx-auto"
                                            title="Eliminar Pedido"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {orders.length === 0 && (
                    <div className="py-20 text-center transition-colors">
                        <p className="text-zinc-300 dark:text-zinc-600 text-[10px] font-black uppercase tracking-widest">No hay pedidos cargados</p>
                    </div>
                )}
            </div>
        </div>
    );
};
