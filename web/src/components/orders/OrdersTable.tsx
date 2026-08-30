import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStatusLabel } from '../../pages/Orders';

interface OrdersTableProps {
    orders: any[];
    onOrderDeleted?: () => void;
}

type SortConfig = {
    key: string;
    direction: 'asc' | 'desc';
} | null;

export const OrdersTable: React.FC<OrdersTableProps> = ({ orders, onOrderDeleted }) => {
    const navigate = useNavigate();
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isSystemAdmin = user.role === 'SYSTEM_ADMIN';

    const sortedOrders = useMemo(() => {
        let sortableItems = [...orders];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue: any = a[sortConfig.key];
                let bValue: any = b[sortConfig.key];

                // Special handling for nested or derived fields
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
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 group-hover/th:text-zinc-900 dark:group-hover/th:text-white transition-colors">{label}</span>
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
                                <td className="px-8 py-6">
                                    {(() => {
                                        const displayLabel = getStatusLabel(order.statusLabel || order.status || '');
                                        const isDelivered = displayLabel === 'ENTREGADO' || order.status === 'DELIVERED';
                                        const isReady = displayLabel === 'PARA ENTREGA' || order.status === 'REPAIR_COMPLETED' || order.status === 'READY_FOR_PICKUP';
                                        return (
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border transition-colors ${
                                                isDelivered
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    : isReady
                                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                    : order.statusType === 'urgent'
                                                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                    : order.statusType === 'success'
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    : order.statusType === 'new'
                                                    ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
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
                                <td className="px-8 py-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className={`size-1.5 rounded-full transition-colors ${order.priority === 'ALTA' ? 'bg-red-500' :
                                            order.priority === 'MEDIA' ? 'bg-amber-500' :
                                                'bg-zinc-200 dark:bg-zinc-500'
                                            }`}></span>
                                        <span className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest transition-colors">{order.priority}</span>
                                    </div>
                                </td>
                                {isSystemAdmin && (
                                    <td className="px-8 py-6 text-center">
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (window.confirm("¿Seguro que deseas eliminar permanentemente este pedido? Esta acción no se puede deshacer y borrará todos los pagos asociados.")) {
                                                    try {
                                                        const { OrdersService } = await import('../../services/orders.service');
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
