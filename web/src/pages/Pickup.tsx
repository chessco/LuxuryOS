import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QueueService } from '../services/queue.service';

const Pickup: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [phone, setPhone] = useState('');
    const [activeTab, setActiveTab] = useState<'ALL' | 'READY' | 'TICKETS'>('ALL');
    const [tickets, setTickets] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const data = await QueueService.searchPickups(searchTerm, phone);
            setTickets(data.tickets || []);
            setOrders(data.orders || []);
            setHasSearched(true);
        } catch (error) {
            console.error('Search error', error);
            alert('Error al buscar órdenes y turnos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        handleSearch();
    }, []);

    const handleConfirmTicket = async (id: string) => {
        if (!confirm('¿Confirmar entrega y cerrar turno?')) return;
        try {
            await QueueService.confirmPickup(id);
            alert('Entrega confirmada con éxito.');
            handleSearch();
        } catch (error) {
            console.error("Confirm pickup error:", error);
            alert('Error al confirmar entrega.');
        }
    };

    const handleConfirmOrder = async (orderId: string) => {
        if (!confirm('¿Confirmar entrega de este pedido al cliente?')) return;
        try {
            await QueueService.confirmOrderDelivery(orderId);
            alert('¡Pedido entregado con éxito!');
            handleSearch();
        } catch (error) {
            console.error("Confirm order delivery error:", error);
            alert('Error al entregar pedido.');
        }
    };

    const readyOrders = orders.filter(o => o.isReady);
    const displayedOrders = activeTab === 'READY' ? readyOrders : orders;
    const showTickets = activeTab === 'ALL' || activeTab === 'TICKETS';
    const showOrders = activeTab === 'ALL' || activeTab === 'READY';

    return (
        <div className="min-h-screen bg-background text-foreground p-6 sm:p-10 transition-colors">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header Card */}
                <div className="bg-card p-8 rounded-[36px] shadow-sm border border-border backdrop-blur-md">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight font-display text-foreground">Entrega de Pedidos / Pickup</h1>
                            <p className="text-muted-foreground text-sm font-medium mt-1">Busca por No. de Orden, Nombre de Cliente o Teléfono para procesar entregas.</p>
                        </div>
                        <button
                            onClick={() => handleSearch()}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border text-foreground hover:bg-muted/80 text-xs font-bold uppercase tracking-wider transition active:scale-95 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[18px]">refresh</span>
                            Actualizar
                        </button>
                    </div>

                    {/* Search Form */}
                    <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-6 relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                                <span className="material-symbols-outlined text-[20px]">search</span>
                            </div>
                            <input
                                type="text"
                                placeholder="Nombre de cliente o No. Orden (ej. ORD-E4968CB7)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-muted/60 border border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 outline-none text-sm transition-all"
                            />
                        </div>
                        <div className="md:col-span-4 relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                                <span className="material-symbols-outlined text-[20px]">call</span>
                            </div>
                            <input
                                type="tel"
                                placeholder="Teléfono del cliente..."
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-muted/60 border border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 outline-none text-sm transition-all"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-full bg-foreground text-background font-black py-3.5 px-6 rounded-2xl hover:opacity-90 transition shadow-xl active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="size-4 border-2 border-background/20 border-t-background rounded-full animate-spin" />
                                ) : (
                                    <span>Buscar</span>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Tabs / Filter Pills */}
                    <div className="flex items-center gap-2 mt-6 pt-6 border-t border-border">
                        <button
                            type="button"
                            onClick={() => setActiveTab('ALL')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                                activeTab === 'ALL'
                                    ? 'bg-foreground text-background shadow-sm'
                                    : 'bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Todos ({orders.length + tickets.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('READY')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                                activeTab === 'READY'
                                    ? 'bg-amber-500 text-black shadow-sm font-black'
                                    : 'bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Listos para Entrega ({readyOrders.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('TICKETS')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                                activeTab === 'TICKETS'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Turnos en Fila ({tickets.length})
                        </button>
                    </div>
                </div>

                {/* Results List */}
                <div className="space-y-4">
                    {/* Active Queue Tickets */}
                    {showTickets && tickets.map(ticket => (
                        <div key={ticket.id} className="bg-card p-6 rounded-[28px] shadow-sm border border-indigo-500/30 flex flex-wrap items-center justify-between gap-6 hover:border-indigo-500/50 transition-all">
                            <div className="flex items-center gap-4 flex-1 min-w-[240px]">
                                <div className="size-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 font-mono font-black text-xl">
                                    {ticket.code}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                            Turno Kiosko
                                        </span>
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                            {ticket.kind === 'PICKUP' ? 'Recolección' : ticket.kind === 'REPAIR' ? 'Reparación' : 'Venta'}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground">{ticket.customerName}</h3>
                                    <p className="text-xs text-muted-foreground font-medium">{ticket.customerPhone || 'Sin teléfono'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {ticket.orderId && (
                                    <Link
                                        to={`/orders/${ticket.orderId}`}
                                        className="px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-bold uppercase tracking-wider transition"
                                    >
                                        Ver Orden
                                    </Link>
                                )}
                                <button
                                    onClick={() => handleConfirmTicket(ticket.id)}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition active:scale-95 flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                    Confirmar Entrega
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Orders */}
                    {showOrders && displayedOrders.map(order => {
                        const isReady = order.isReady;
                        const isDelivered = order.isDelivered;

                        return (
                            <div key={order.id} className={`bg-card p-6 rounded-[28px] shadow-sm border flex flex-wrap items-center justify-between gap-6 transition-all ${
                                isReady
                                    ? 'border-amber-500/40 bg-amber-500/5'
                                    : isDelivered
                                    ? 'border-emerald-500/30'
                                    : 'border-border'
                            }`}>
                                <div className="flex items-center gap-4 flex-1 min-w-[260px]">
                                    <div className={`size-12 rounded-2xl flex items-center justify-center font-mono font-black text-xs border ${
                                        isReady
                                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                            : isDelivered
                                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                            : 'bg-muted text-muted-foreground border-border'
                                    }`}>
                                        {order.id.substring(0, 6).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono text-xs font-black text-foreground">{order.code}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                isReady
                                                    ? 'bg-amber-500 text-black border-amber-400 font-black animate-pulse'
                                                    : isDelivered
                                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                            }`}>
                                                {isReady ? 'LISTO PARA ENTREGA' : isDelivered ? 'ENTREGADO' : order.status}
                                            </span>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                                {order.type === 'REPAIR' ? 'Reparación' : order.type === 'MANUFACTURE' ? 'Fabricación' : 'Pedido'}
                                            </span>
                                        </div>
                                        <h3 className="text-base font-bold text-foreground">{order.clientName}</h3>
                                        <p className="text-xs text-muted-foreground font-medium">
                                            {order.clientPhone ? `${order.clientPhone} • ` : ''}{order.pieceType || 'Pieza de joyería'} {order.totalAmount ? `• $${Number(order.totalAmount).toLocaleString()} MXN` : ''}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Link
                                        to={`/orders/${order.id}`}
                                        className="px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-bold uppercase tracking-wider transition"
                                    >
                                        Ver Detalle
                                    </Link>
                                    {!isDelivered && (
                                        <button
                                            onClick={() => handleConfirmOrder(order.id)}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition active:scale-95 flex items-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                            Entregar Pedido
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Empty State */}
                    {!loading && tickets.length === 0 && displayedOrders.length === 0 && (
                        <div className="text-center p-16 bg-muted/30 rounded-[40px] border-2 border-dashed border-border transition-colors">
                            <span className="material-symbols-outlined text-muted-foreground/30 text-5xl mb-4">search_off</span>
                            <p className="text-foreground font-black text-base uppercase tracking-wider mb-1">
                                {hasSearched ? 'No se encontraron turnos ni órdenes con ese criterio' : 'No hay pedidos pendientes de entrega'}
                            </p>
                            <p className="text-muted-foreground text-xs font-medium max-w-sm mx-auto">
                                Intenta buscando por el número de orden (ej. ORD-E4968CB7), nombre del cliente o su teléfono.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Pickup;
