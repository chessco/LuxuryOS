import React, { useEffect, useState } from 'react';
import { OrdersService } from '../../services/orders.service';

interface DeletedOrdersModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const formatDate = (value?: string) => value
    ? new Date(value).toLocaleString('es-MX', { timeZone: 'America/Phoenix' })
    : '—';

export const DeletedOrdersModal: React.FC<DeletedOrdersModalProps> = ({ isOpen, onClose }) => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        setError('');
        OrdersService.getDeletedOrders()
            .then((data) => setOrders(Array.isArray(data) ? data : []))
            .catch(() => setError('No se pudo cargar la bitácora de eliminaciones.'))
            .finally(() => setLoading(false));
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] bg-black/70 p-4 flex items-center justify-center" onClick={onClose}>
            <div className="w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between gap-3 border-b border-border p-5">
                    <div>
                        <h2 className="text-lg font-black text-foreground">Bitácora de órdenes eliminadas</h2>
                        <p className="text-xs text-muted-foreground">Borrado lógico: los registros y consecutivos se conservan para auditoría.</p>
                    </div>
                    <button type="button" onClick={onClose} className="size-9 rounded-xl bg-muted text-muted-foreground hover:text-foreground">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="max-h-[70vh] overflow-auto p-5">
                    {loading && <p className="text-sm text-muted-foreground">Cargando bitácora…</p>}
                    {error && <p className="text-sm font-bold text-red-500">{error}</p>}
                    {!loading && !error && orders.length === 0 && <p className="text-sm text-muted-foreground">No hay órdenes eliminadas.</p>}
                    {!loading && !error && orders.length > 0 && (
                        <table className="w-full min-w-[760px] text-left text-xs">
                            <thead className="border-b border-border text-[10px] uppercase text-muted-foreground">
                                <tr>
                                    <th className="p-3">Orden</th><th className="p-3">Cliente</th><th className="p-3">Eliminada por</th>
                                    <th className="p-3">Fecha</th><th className="p-3">Motivo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {orders.map((order) => (
                                    <tr key={order.id}>
                                        <td className="p-3 font-black text-foreground">{order.orderCode || order.id.slice(0, 8)}</td>
                                        <td className="p-3 text-foreground">{order.client?.name || '—'}</td>
                                        <td className="p-3 text-foreground">{order.deletedBy?.name || order.deletedBy?.email || 'Usuario no disponible'}</td>
                                        <td className="p-3 text-muted-foreground">{formatDate(order.deletedAt)}</td>
                                        <td className="p-3 text-foreground">{order.deletionReason || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};
