import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ClientsService } from '../../services/clients.service';
import { resolveMediaUrl } from '../../services/api';
import { getStatusLabel } from '../../pages/Orders';

interface ClientHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId?: string | null;
    clientName?: string | null;
}

export const ClientHistoryModal: React.FC<ClientHistoryModalProps> = ({
    isOpen,
    onClose,
    clientId,
    clientName,
}) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [historyData, setHistoryData] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !clientId) {
            setHistoryData(null);
            setError(null);
            return;
        }

        let isMounted = true;
        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await ClientsService.getHistory(clientId);
                if (isMounted) {
                    setHistoryData(data);
                }
            } catch (err: any) {
                console.error('Error fetching client history:', err);
                if (isMounted) {
                    setError(err?.response?.data?.message || err?.message || 'Error al consultar historial');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchHistory();

        return () => {
            isMounted = false;
        };
    }, [isOpen, clientId]);

    // Close on Escape key press
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const client = historyData?.client;
    const orders: any[] = historyData?.orders || [];

    const formatDate = (dateStr?: string | Date | null) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('es-MX', {
                timeZone: 'America/Hermosillo',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        } catch {
            return String(dateStr);
        }
    };

    return createPortal(
        <AnimatePresence>
            <div
                onClick={onClose}
                className="fixed inset-0 z-[130] overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md cursor-pointer"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-4xl max-h-[92vh] my-auto bg-card border border-border rounded-[28px] sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col text-foreground cursor-default"
                >
                    {/* Header */}
                    <div className="shrink-0 px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
                        <div className="flex items-center gap-3">
                            <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-sm">
                                <span className="material-symbols-outlined text-[24px]">history</span>
                            </div>
                            <div>
                                <h3 className="font-black text-base sm:text-lg uppercase tracking-tight">
                                    Historial de Trabajos del Cliente
                                </h3>
                                <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                                    {client?.name || clientName || 'Consultando cliente...'}
                                    {client?.phone ? ` • Tel: ${client.phone}` : ''}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="size-10 rounded-xl bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center transition-all cursor-pointer border border-border/50 active:scale-95"
                            title="Cerrar ventana (Esc)"
                        >
                            <span className="material-symbols-outlined text-[22px]">close</span>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto flex-1 space-y-6">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                <span className="material-symbols-outlined text-4xl animate-spin text-indigo-500">sync</span>
                                <p className="text-xs font-black uppercase tracking-widest">Cargando historial de reparaciones...</p>
                            </div>
                        ) : error ? (
                            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-center space-y-2">
                                <span className="material-symbols-outlined text-3xl">error</span>
                                <p className="text-sm font-bold">{error}</p>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="py-16 text-center bg-muted/20 border border-dashed border-border rounded-3xl space-y-3">
                                <span className="material-symbols-outlined text-4xl text-muted-foreground/40">assignment_late</span>
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                    Este cliente no cuenta con trabajos o reparaciones registradas previamente.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
                                    <span>{orders.length} {orders.length === 1 ? 'trabajo registrado' : 'trabajos registrados'}</span>
                                    <span>Consulta de sólo lectura</span>
                                </div>

                                <div className="space-y-3">
                                    {orders.map((o) => {
                                        const isReturnedToClient = o.specifications?.isReturnedToClient || o.specifications?.isReturnedNotDone;
                                        const isDelivered = o.status === 'DELIVERED' || o.stage === 'ENTREGADO_POSTVENTA' || !!o.deliveredAt;
                                        const balanceNum = Number(o.balance || 0);

                                        return (
                                            <div
                                                key={o.id}
                                                className="bg-card border border-border rounded-2xl p-5 hover:border-indigo-500/40 transition-all space-y-3 shadow-sm"
                                            >
                                                {/* Card Header */}
                                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                                                            {o.orderCode}
                                                        </span>
                                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                                            {o.type === 'MANUFACTURE' ? 'FABRICACIÓN' : o.type === 'DESIGN' ? 'DISEÑO' : o.type === 'LASER' ? 'LÁSER' : 'REPARACIÓN'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {/* Status Badge */}
                                                        {isReturnedToClient ? (
                                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                                                Devuelto — No realizado
                                                            </span>
                                                        ) : isDelivered ? (
                                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                                                Entregado — Terminado
                                                            </span>
                                                        ) : (
                                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-foreground">
                                                                {getStatusLabel(o.status || o.stage)}
                                                            </span>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                onClose();
                                                                navigate(`/orders/${o.id}`);
                                                            }}
                                                            className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer ml-2"
                                                        >
                                                            <span>Ver Detalle</span>
                                                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Details Grid */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                                                            Artículo / Pieza
                                                        </span>
                                                        <span className="font-bold text-foreground">
                                                            {o.pieceType || o.specifications?.items?.[0]?.item || 'Sin especificar'}
                                                        </span>
                                                        {o.metal && (
                                                            <span className="text-[11px] text-muted-foreground block">
                                                                {o.metal} {o.karats || ''} {o.color || ''}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                                                            Recepción / Entrega
                                                        </span>
                                                        <span className="font-medium text-foreground block">
                                                            Recibido: {formatDate(o.createdAt)}
                                                        </span>
                                                        <span className="font-medium text-muted-foreground text-[11px] block">
                                                            {isReturnedToClient
                                                                ? `Devuelto: ${formatDate(o.returnedToClientAt || o.deliveredAt)}`
                                                                : `Entregado: ${formatDate(o.deliveredAt)}`}
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                                                            Importe y Saldo
                                                        </span>
                                                        <span className="font-mono font-black text-foreground block">
                                                            ${Number(o.totalAmount || o.value || 0).toLocaleString()} MXN
                                                        </span>
                                                        <span className={`text-[11px] font-bold ${balanceNum > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                            {balanceNum > 0 ? `Saldo: $${balanceNum.toLocaleString()} MXN` : 'Liquidado'}
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                                                            Personal Responsable
                                                        </span>
                                                        <span className="font-bold text-foreground block truncate">
                                                            Joyero: {o.jeweler || o.specifications?.assignedTo || '—'}
                                                        </span>
                                                        {o.designer && (
                                                            <span className="text-[11px] text-muted-foreground block truncate">
                                                                Diseño: {o.designer}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Description / Requested work / Return reason */}
                                                {(o.notes || o.specifications?.returnReason) && (
                                                    <div className="bg-muted/40 p-3 rounded-xl border border-border/50 text-xs space-y-1">
                                                        {o.notes && (
                                                            <div>
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">
                                                                    Trabajo Solicitado / Observaciones:
                                                                </span>
                                                                <p className="text-foreground leading-relaxed">{o.notes}</p>
                                                            </div>
                                                        )}
                                                        {o.specifications?.returnReason && (
                                                            <div className="pt-1 border-t border-border/40">
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 block">
                                                                    Motivo de Devolución:
                                                                </span>
                                                                <p className="text-rose-600 dark:text-rose-400 font-bold leading-relaxed">
                                                                    {o.specifications.returnReason}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Photographic Evidence */}
                                                {(o.envelopeImages?.length > 0 || o.imageUrl) && (
                                                    <div className="pt-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">
                                                            Evidencia Fotográfica
                                                        </span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {o.imageUrl && (
                                                                <img
                                                                    src={resolveMediaUrl(o.imageUrl)}
                                                                    alt="Foto Orden"
                                                                    onClick={() => setSelectedPhoto(o.imageUrl)}
                                                                    className="size-14 object-cover rounded-xl border border-border cursor-pointer hover:opacity-80 transition"
                                                                />
                                                            )}
                                                            {o.envelopeImages?.map((img: string, idx: number) => (
                                                                <img
                                                                    key={idx}
                                                                    src={resolveMediaUrl(img)}
                                                                    alt={`Sobre ${idx + 1}`}
                                                                    onClick={() => setSelectedPhoto(img)}
                                                                    className="size-14 object-cover rounded-xl border border-border cursor-pointer hover:opacity-80 transition"
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="shrink-0 p-4 border-t border-border bg-muted/20 flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl bg-foreground text-background font-black text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition cursor-pointer"
                        >
                            Cerrar
                        </button>
                    </div>

                    {/* Lightbox for photo inspection */}
                    {selectedPhoto && (
                        <div
                            onClick={() => setSelectedPhoto(null)}
                            className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
                        >
                            <img
                                src={resolveMediaUrl(selectedPhoto)}
                                alt="Foto ampliada"
                                className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                            />
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};
export default ClientHistoryModal;
