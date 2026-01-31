import React, { useEffect, useState } from 'react';
import { QueueService } from '../services/queue.service';

const StaffQueue: React.FC = () => {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTickets = async () => {
        try {
            const data = await QueueService.getStaffTickets();
            setTickets(data);
        } catch (error) {
            console.error('Error fetching tickets', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const interval = setInterval(fetchTickets, 10000); // Poll for updates every 10s
        fetchTickets();
        return () => clearInterval(interval);
    }, []);

    const handleAction = async (id: string, action: string, createOrder: boolean = false) => {
        try {
            if (action === 'call') await QueueService.callTicket(id);
            if (action === 'in-service') await QueueService.setInService(id, createOrder);
            if (action === 'done') {
                const ticket = tickets.find(t => t.id === id);
                if (ticket?.kind === 'PICKUP') {
                    await QueueService.confirmPickup(id);
                } else {
                    await QueueService.doneTicket(id);
                }
            }
            fetchTickets();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al actualizar turno');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'WAITING': return 'bg-muted text-muted-foreground border-border';
            case 'CALLING': return 'bg-primary/10 text-primary border-primary/20 animate-pulse';
            case 'CALLED': return 'bg-primary text-primary-foreground border-transparent';
            case 'IN_SERVICE': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
            case 'DONE': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    }

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Turnos</h1>
                    <p className="text-gray-500">Administra la fila y crea órdenes de servicio</p>
                </div>
                <button
                    onClick={fetchTickets}
                    className="bg-white border hover:bg-gray-50 px-4 py-2 rounded-lg font-medium shadow-sm transition"
                >
                    Actualizar
                </button>
            </div>

            <div className="bg-card rounded-[32px] shadow-sm border border-border overflow-hidden backdrop-blur-sm transition-colors">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted/50 border-b border-border">
                            <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Código</th>
                            <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Cliente</th>
                            <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Tipo</th>
                            <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Estado</th>
                            <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {tickets.map(ticket => (
                            <tr key={ticket.id} className="hover:bg-muted/20 transition">
                                <td className="px-8 py-5">
                                    <span className="font-mono font-bold text-2xl text-primary">{ticket.code}</span>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="font-bold text-foreground">{ticket.customerName}</div>
                                    <div className="text-sm text-muted-foreground">{ticket.customerPhone || 'Sin teléfono'}</div>
                                    {ticket.recommendations?.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {ticket.recommendations.map((r: any) => (
                                                <span key={r.recommendationId} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                                                    {r.recommendation.label}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </td>
                                <td className="px-8 py-5">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${ticket.kind === 'REPAIR' ? 'bg-orange-500/10 text-orange-500' :
                                        ticket.kind === 'SALE' ? 'bg-emerald-500/10 text-emerald-500' :
                                            'bg-muted text-muted-foreground'
                                        }`}>
                                        {ticket.kind === 'REPAIR' ? 'Reparación' : ticket.kind === 'SALE' ? 'Venta' : 'Recoger'}
                                    </span>
                                </td>
                                <td className="px-8 py-5">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border ${getStatusStyle(ticket.status)}`}>
                                        {ticket.status === 'WAITING' ? 'En Espera' :
                                            ticket.status === 'CALLING' ? 'Llamando' :
                                                ticket.status === 'CALLED' ? 'Llamado' :
                                                    ticket.status === 'IN_SERVICE' ? 'Atendiendo' : ticket.status}
                                    </span>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex gap-2">
                                        {(ticket.status === 'WAITING' || ticket.status === 'CALLING') && (
                                            <button
                                                onClick={() => handleAction(ticket.id, 'call')}
                                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
                                            >
                                                Llamar
                                            </button>
                                        )}
                                        {(ticket.status === 'CALLING' || ticket.status === 'CALLED' || ticket.status === 'WAITING') && (
                                            <div className="flex bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                                                <button
                                                    onClick={() => handleAction(ticket.id, 'in-service', false)}
                                                    className="hover:bg-muted text-muted-foreground px-3 py-2 text-xs font-bold border-r border-border"
                                                >
                                                    Atender solo
                                                </button>
                                                {ticket.kind !== 'PICKUP' && (
                                                    <button
                                                        onClick={() => handleAction(ticket.id, 'in-service', true)}
                                                        className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 text-xs font-bold"
                                                    >
                                                        + Crear Orden
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {ticket.status === 'IN_SERVICE' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAction(ticket.id, 'done')}
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition active:scale-95"
                                                >
                                                    {ticket.kind === 'PICKUP' ? 'Confirmar Entrega' : 'Terminar'}
                                                </button>
                                                {ticket.orderId && (
                                                    <a
                                                        href={`/orders/${ticket.orderId}`}
                                                        className="bg-muted hover:bg-foreground/5 text-muted-foreground px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border transition-colors"
                                                    >
                                                        Ver Orden
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && tickets.length === 0 && (
                    <div className="p-16 text-center">
                        <div className="text-4xl mb-4">☕</div>
                        <h3 className="text-xl font-bold text-foreground">Todo despejado</h3>
                        <p className="text-muted-foreground">No hay turnos pendientes en este momento.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffQueue;
