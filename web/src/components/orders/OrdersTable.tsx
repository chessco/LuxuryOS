import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStatusLabel } from '../../pages/Orders';
import { OrdersService } from '../../services/orders.service';

interface OrdersTableProps {
    orders: any[];
    onOrderDeleted?: () => void;
    onRefresh?: () => void;
}

type SortConfig = {
    key: string;
    direction: 'asc' | 'desc';
} | null;

const getStatusOptions = (orderType: string) => {
    const type = (orderType || 'STANDARD').toUpperCase();
    if (type === 'REPAIR') {
        return [
            { value: 'RECEIVED', label: 'RECIBIDO' },
            { value: 'IN_REPAIR', label: 'EN TALLER' },
            { value: 'REPAIR_COMPLETED', label: 'LISTO' },
            { value: 'DELIVERED', label: 'ENTREGADO' },
            { value: 'CANCELLED', label: 'CANCELADO' }
        ];
    }
    if (type === 'MANUFACTURE') {
        return [
            { value: 'RECEIVED', label: 'RECIBIDO' },
            { value: 'IN_PRODUCTION', label: 'EN TALLER' },
            { value: 'READY_FOR_PICKUP', label: 'LISTO' },
            { value: 'DELIVERED', label: 'ENTREGADO' },
            { value: 'CANCELLED', label: 'CANCELADO' }
        ];
    }
    if (type === 'LAYAWAY') {
        return [
            { value: 'LAYAWAY_OPEN', label: 'APARTADO' },
            { value: 'LAYAWAY_EXPIRED', label: 'VENCIDO' },
            { value: 'DELIVERED', label: 'ENTREGADO' },
            { value: 'CANCELLED', label: 'CANCELADO' }
        ];
    }
    return [
        { value: 'INTERES_LEAD', label: 'INTERÉS / LEAD' },
        { value: 'COTIZACION_ENVIADA', label: 'COTIZACIÓN' },
        { value: 'APROBADO_ANTICIPO', label: 'APROBADO / ANTICIPO' },
        { value: 'EN_PRODUCCION', label: 'EN PRODUCCIÓN' },
        { value: 'CONTROL_CALIDAD', label: 'CONTROL CALIDAD' },
        { value: 'ENTREGADO_POSTVENTA', label: 'ENTREGADO' },
        { value: 'CANCELLED', label: 'CANCELADO' }
    ];
};

export const OrdersTable: React.FC<OrdersTableProps> = ({ orders, onOrderDeleted, onRefresh }) => {
    const navigate = useNavigate();
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isSystemAdmin = user.role === 'SYSTEM_ADMIN' || user.role === 'TENANT_ADMIN' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

    const sortedOrders = useMemo(() => {
        let sortableItems = [...orders];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue: any = a[sortConfig.key];
                let bValue: any = b[sortConfig.key];

                if (sortConfig.key === 'client') {
                    aValue = a.client?.name || a.client || '';
                    bValue = b.client?.name || b.client || '';
                } else if (sortConfig.key === 'value' || sortConfig.key === 'totalAmount') {
                    aValue = parseFloat(String(a.value || 0).replace(/[^0-9.-]/g, '')) || 0;
                    bValue = parseFloat(String(b.value || 0).replace(/[^0-9.-]/g, '')) || 0;
                } else if (sortConfig.key === 'receivedDate') {
                    aValue = new Date(a.createdAt).getTime();
                    bValue = new Date(b.createdAt).getTime();
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [orders, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <span className="material-symbols-outlined text-[14px] opacity-20">swap_vert</span>;
        }
        return sortConfig.direction === 'asc'
            ? <span className="material-symbols-outlined text-[14px] text-indigo-500">arrow_upward</span>
            : <span className="material-symbols-outlined text-[14px] text-indigo-500">arrow_downward</span>;
    };

    const HeaderTh: React.FC<{ label: string, sortKey: string, align?: 'left' | 'right' }> = ({ label, sortKey, align = 'left' }) => (
        <th
            className={`px-8 py-6 text-${align} group/th cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-white/[0.02] transition-colors`}
            onClick={() => requestSort(sortKey)}
        >
            <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
                <span className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">{label}</span>
                {getSortIcon(sortKey)}
            </div>
        </th>
    );

    return (
        <div className="w-full px-4 overflow-hidden transition-colors">
            <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 rounded-[32px] overflow-hidden backdrop-blur-sm shadow-sm dark:shadow-2xl transition-colors">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/60 transition-colors">
                            <HeaderTh label="Pedido" sortKey="id" />
                            <HeaderTh label="Cliente" sortKey="client" />
                            <HeaderTh label="Item" sortKey="item" />
                            <HeaderTh label="Recibido" sortKey="receivedDate" />
                            <HeaderTh label="Estado" sortKey="status" />
                            <HeaderTh label="Valor" sortKey="value" />
                            <HeaderTh label="Prioridad" sortKey="priority" align="right" />
                            {isSystemAdmin && <th className="px-8 py-6 w-16"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/30">
                        {sortedOrders.map((order) => (
                            <tr
                                key={order.id}
                                onClick={() => navigate(`/orders/${order.id}`)}
                                className="group hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                            >
                                <td className="px-8 py-6">
                                    <span className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black tracking-widest uppercase transition-colors">#{order.id.substring(0, 8)}</span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`size-8 rounded-full flex items-center justify-center text-[10px] font-black border border-zinc-100 dark:border-zinc-800 transition-colors ${order.initialsColor || 'bg-zinc-50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                            {order.initials}
                                        </div>
                                        <span className="text-zinc-900 dark:text-white text-sm font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{order.client}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className="text-zinc-500 dark:text-zinc-400 text-sm font-medium transition-colors">{order.item}</span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                        <span className="text-zinc-900 dark:text-white text-[11px] font-bold transition-colors">{order.receivedDate}</span>
                                        <span className="text-zinc-400 dark:text-zinc-500 text-[9px] font-black uppercase tracking-widest transition-colors">{order.receivedTime}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
                                    {(() => {
                                        const rawStatus = (order.status || order.stage || 'RECEIVED').toUpperCase();
                                        const displayLabel = getStatusLabel(order.statusLabel || rawStatus);
                                        const isDelivered = displayLabel === 'ENTREGADO' || rawStatus === 'DELIVERED' || rawStatus === 'ENTREGADO_POSTVENTA';
                                        const isReady = displayLabel === 'PARA ENTREGA' || displayLabel === 'LISTO' || rawStatus === 'REPAIR_COMPLETED' || rawStatus === 'READY_FOR_PICKUP' || rawStatus === 'READY';
                                        const isInWorkshop = displayLabel === 'EN TALLER' || displayLabel === 'PRODUCCIÓN' || rawStatus === 'IN_REPAIR' || rawStatus === 'IN_PRODUCTION' || rawStatus === 'EN_PRODUCCION' || rawStatus === 'QUALITY_CHECK';

                                        if (isSystemAdmin) {
                                            const options = getStatusOptions(order.type);
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
                                                    className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest cursor-pointer outline-none border transition-all shadow-sm ${
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
                                        }

                                        return (
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border transition-colors ${
                                                isDelivered
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    : isReady
                                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                    : isInWorkshop
                                                    ? 'bg-yellow-300 dark:bg-yellow-400 text-black border-yellow-500 font-black'
                                                    : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700'
                                            }`}>
                                                {displayLabel}
                                            </span>
                                        );
                                    })()}
                                </td>
                                <td className="px-8 py-6">
                                    <span className="text-zinc-900 dark:text-white font-black tracking-tight transition-colors">{order.value}</span>
                                </td>
                                <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
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
                                {isSystemAdmin && (
                                    <td className="px-8 py-6 text-center">
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
