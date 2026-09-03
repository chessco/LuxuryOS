import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QueueService } from '../services/queue.service';
import { QRCodeSVG } from 'qrcode.react';

export const PublicQueueTrack: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [publicQueue, setPublicQueue] = useState<{ current: any; waiting: any[] }>({ current: null, waiting: [] });

    const fetchTicket = async () => {
        if (!token) return;
        try {
            const data = await QueueService.resolveTicketByToken(token);
            setTicket(data);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching ticket:', err);
            setError('No pudimos encontrar tu turno. Puede haber expirado o ser inválido.');
        } finally {
            setLoading(false);
        }
    };

    const fetchQueue = async () => {
        try {
            const data = await QueueService.getPublicTickets();
            setPublicQueue(data);
        } catch (err) {
            console.error('Error fetching public queue:', err);
        }
    };

    useEffect(() => {
        fetchTicket();
        fetchQueue();
        const interval = setInterval(() => {
            fetchTicket();
            fetchQueue();
        }, 3500);
        return () => clearInterval(interval);
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white">
                <div className="size-14 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
                <p className="text-zinc-400 font-bold text-sm tracking-wider uppercase">Cargando estado de tu turno...</p>
            </div>
        );
    }

    if (error || !ticket) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white text-center">
                <div className="size-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-6">
                    <span className="material-symbols-outlined text-3xl">error</span>
                </div>
                <h2 className="text-2xl font-black mb-2">Turno no disponible</h2>
                <p className="text-zinc-400 text-sm max-w-sm">{error || 'El turno solicitado no fue encontrado.'}</p>
            </div>
        );
    }

    const isCalling = ticket.status === 'CALLING';
    const isWaiting = ticket.status === 'WAITING';
    const isInService = ticket.status === 'IN_SERVICE';
    const isDone = ticket.status === 'DONE' || ticket.status === 'COMPLETED';
    const isCancelled = ticket.status === 'CANCELLED';

    const getKindLabel = (kind: string) => {
        if (kind === 'REPAIR') return 'Reparación de Joyería';
        if (kind === 'SALE') return 'Asesoría y Compra';
        if (kind === 'PICKUP') return 'Entrega / Recolección';
        return 'Atención General';
    };

    // Calculate people ahead
    const waitingList = publicQueue.waiting || [];
    const myIndex = waitingList.findIndex(t => t.id === ticket.id || t.code === ticket.code);
    const peopleAhead = myIndex >= 0 ? myIndex : (isWaiting ? waitingList.length : 0);

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-between p-4 sm:p-8 font-sans selection:bg-indigo-500 selection:text-white">
            {/* Header */}
            <header className="w-full max-w-md flex items-center justify-between py-4 border-b border-zinc-800/80">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <span className="material-symbols-outlined text-white text-xl">diamond</span>
                    </div>
                    <div>
                        <h1 className="text-sm font-black tracking-widest uppercase">CARED</h1>
                        <p className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">Seguimiento de Turno en Vivo</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider animate-pulse">
                    <span className="size-2 rounded-full bg-emerald-400" />
                    En Vivo
                </div>
            </header>

            {/* Main Ticket Card */}
            <main className="w-full max-w-md my-auto py-6 flex flex-col gap-6">
                {/* Calling Banner */}
                {isCalling && (
                    <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-400/40 text-white shadow-2xl shadow-emerald-500/30 text-center animate-bounce">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-2xl">campaign</span>
                            <span className="text-base font-black tracking-wider uppercase">¡ES TU TURNO!</span>
                        </div>
                        <p className="text-xs font-bold text-emerald-100">Por favor acércate al módulo de atención en mostrador.</p>
                    </div>
                )}

                {/* Primary Card */}
                <div className={`relative overflow-hidden rounded-[36px] border p-8 backdrop-blur-2xl shadow-2xl transition-all duration-500 ${
                    isCalling
                        ? 'bg-emerald-950/40 border-emerald-500/50 shadow-emerald-500/10'
                        : isInService
                        ? 'bg-indigo-950/40 border-indigo-500/50 shadow-indigo-500/10'
                        : 'bg-zinc-900/90 border-zinc-800 shadow-black/60'
                }`}>
                    {/* Top Status Pill */}
                    <div className="flex items-center justify-between mb-8">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Tu Turno Asignado</span>
                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            isCalling
                                ? 'bg-emerald-500 text-black border-emerald-400'
                                : isInService
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                : isWaiting
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : isDone
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}>
                            {isCalling ? '¡LLAMANDO!' : isInService ? 'EN ATENCIÓN' : isWaiting ? 'EN ESPERA' : isDone ? 'ATENDIDO' : 'FINALIZADO'}
                        </span>
                    </div>

                    {/* Huge Code Display */}
                    <div className="text-center py-4">
                        <div className={`text-7xl font-black tracking-tight font-display mb-2 drop-shadow-md ${
                            isCalling ? 'text-emerald-400' : 'text-indigo-400'
                        }`}>
                            {ticket.code}
                        </div>
                        <p className="text-base font-bold text-white uppercase tracking-wide">{ticket.customerName || 'Cliente'}</p>
                        <p className="text-xs font-semibold text-zinc-400 mt-0.5">{getKindLabel(ticket.kind)}</p>
                    </div>

                    {/* Queue Position Status */}
                    {isWaiting && (
                        <div className="mt-6 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                                    <span className="material-symbols-outlined text-[20px]">group</span>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Personas antes de ti</p>
                                    <p className="text-lg font-black text-white">{peopleAhead === 0 ? '¡Eres el siguiente!' : `${peopleAhead} ${peopleAhead === 1 ? 'persona' : 'personas'}`}</p>
                                </div>
                            </div>
                            <span className="size-3 rounded-full bg-amber-400 animate-ping" />
                        </div>
                    )}

                    {/* QR Code section for easy scan at desk */}
                    <div className="mt-6 pt-6 border-t border-zinc-800/80 flex flex-col items-center text-center">
                        <div className="bg-white p-3.5 rounded-2xl shadow-inner mb-3">
                            <QRCodeSVG value={window.location.href} size={140} />
                        </div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Muestra este código al asesor en mostrador</p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full max-w-md text-center py-4 text-[11px] font-medium text-zinc-400">
                <p>Luxury OS • Atención de Joyería y Alta Gama</p>
            </footer>
        </div>
    );
};

export default PublicQueueTrack;
