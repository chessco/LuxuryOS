import React, { useState, useEffect } from 'react';
import { OrdersService } from '../../services/orders.service';

interface DeleteOrderModalProps {
    isOpen: boolean;
    orderId: string;
    orderNumber?: string;
    onClose: () => void;
    onDeleted?: () => void;
}

export const DeleteOrderModal: React.FC<DeleteOrderModalProps> = ({
    isOpen,
    orderId,
    orderNumber,
    onClose,
    onDeleted,
}) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setReason('');
            setError('');
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = reason.trim();
        if (!trimmed) {
            setError('Indica el motivo de eliminación de la orden.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await OrdersService.deleteOrder(orderId, trimmed);
            onClose();
            if (onDeleted) {
                onDeleted();
            }
        } catch (err: any) {
            console.error('Delete order error:', err);
            setError(err?.response?.data?.message || 'Error al eliminar el pedido.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={loading ? undefined : onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center font-black">
                            <span className="material-symbols-outlined text-[22px]">delete</span>
                        </div>
                        <div>
                            <h3 className="text-foreground text-sm font-black uppercase tracking-wider">
                                {orderNumber ? `Retirar Pedido #${orderNumber}` : 'Retirar Pedido'}
                            </h3>
                            <p className="text-muted-foreground text-[11px] font-bold">
                                Conservado en la bitácora de eliminaciones
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="size-8 rounded-xl text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Al retirar la orden se cancelará del tablero y flujo operativo, pero se conservará completa en la bitácora para auditoría de quién la retiró, fecha y motivo.
                    </p>

                    <div className="space-y-1.5">
                        <label className="text-muted-foreground text-[10px] font-black uppercase tracking-wider">
                            Motivo de eliminación (obligatorio)
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Indica el motivo de eliminación. Ej. Error de captura, duplicada, cancelación de cliente..."
                            rows={3}
                            disabled={loading}
                            autoFocus
                            className="w-full bg-muted/40 border border-border rounded-xl p-3 text-foreground text-sm outline-none focus:border-red-500 transition-colors resize-none placeholder:text-muted-foreground/60"
                        />
                    </div>

                    {error && (
                        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-500 font-bold">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2 border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="h-11 rounded-xl border border-border px-5 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !reason.trim()}
                            className="h-11 rounded-xl bg-red-600 px-6 text-xs font-black uppercase tracking-widest text-white hover:bg-red-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                                    <span>Retirando…</span>
                                </>
                            ) : (
                                <span>Retirar Orden</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
