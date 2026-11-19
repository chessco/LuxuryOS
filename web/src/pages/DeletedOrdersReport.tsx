import React, { useCallback, useEffect, useState } from 'react';
import { OrdersService } from '../services/orders.service';

type DeletedOrder = {
    id: string;
    type?: string;
    pieceType?: string;
    totalAmount?: number;
    client?: { name?: string };
    deletedAt?: string;
    deletionReason?: string;
    deletedBy?: { name?: string; email?: string };
};

const formatMoney = (value: number | undefined) => new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 2,
}).format(Number(value || 0));

export default function DeletedOrdersReport() {
    const [orders, setOrders] = useState<DeletedOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await OrdersService.getDeletedOrders();
            setOrders(Array.isArray(response) ? response : []);
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'No fue posible cargar las órdenes borradas.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    return (
        <section className="space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Auditoría administrativa</p>
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-foreground">Órdenes Borradas</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Historial de órdenes eliminadas lógicamente y su motivo de baja.</p>
                </div>
                <button type="button" onClick={() => void load()} disabled={loading} className="h-11 rounded-xl border border-border bg-card px-4 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-50">
                    {loading ? 'Actualizando…' : 'Actualizar'}
                </button>
            </header>
            {error && <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">{error}</div>}
            <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
                <table className="min-w-[850px] w-full text-left text-sm">
                    <thead className="border-b border-border bg-muted/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <tr><th className="px-5 py-4">Orden</th><th className="px-5 py-4">Cliente</th><th className="px-5 py-4">Pieza</th><th className="px-5 py-4">Importe</th><th className="px-5 py-4">Borrada por</th><th className="px-5 py-4">Motivo</th><th className="px-5 py-4">Fecha</th></tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => <tr key={order.id} className="border-b border-border/60 last:border-0">
                            <td className="px-5 py-4 font-mono font-black">{order.id.slice(0, 8).toUpperCase()}</td>
                            <td className="px-5 py-4">{order.client?.name || '—'}</td><td className="px-5 py-4">{order.pieceType || order.type || '—'}</td>
                            <td className="px-5 py-4 font-bold">{formatMoney(order.totalAmount)}</td>
                            <td className="px-5 py-4">{order.deletedBy?.name || order.deletedBy?.email || '—'}</td>
                            <td className="max-w-xs px-5 py-4 text-muted-foreground">{order.deletionReason || '—'}</td>
                            <td className="px-5 py-4 text-muted-foreground">{order.deletedAt ? new Date(order.deletedAt).toLocaleString('es-MX') : '—'}</td>
                        </tr>)}
                        {!loading && orders.length === 0 && <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-muted-foreground">No hay órdenes borradas.</td></tr>}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
