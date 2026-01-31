import React, { useState } from 'react';
import { QueueService } from '../services/queue.service';

const Pickup: React.FC = () => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await QueueService.searchPickups(name, phone);
            setResults(data);
        } catch (error) {
            console.error('Search error', error);
            alert('Error al buscar');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (id: string) => {
        if (!confirm('¿Confirmar entrega y cerrar orden?')) return;
        try {
            await QueueService.confirmPickup(id);
            alert('Entrega confirmada con éxito');
            handleSearch({ preventDefault: () => { } } as any);
        } catch (error) {
            alert('Error al confirmar entrega');
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-8 transition-colors">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="bg-card p-8 rounded-[32px] shadow-sm border border-border">
                    <h1 className="text-3xl font-black mb-2 tracking-tight">Entrega de Pedidos</h1>
                    <p className="text-muted-foreground text-sm font-medium mb-8">Busca por nombre o teléfono para procesar la entrega.</p>

                    <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <input
                            type="text"
                            placeholder="Nombre del cliente"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-muted border border-border rounded-2xl p-4 text-foreground focus:border-indigo-500/30 outline-none transition-all"
                        />
                        <input
                            type="tel"
                            placeholder="Teléfono (opcional)"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="bg-muted border border-border rounded-2xl p-4 text-foreground focus:border-indigo-500/30 outline-none transition-all"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-foreground text-background font-black py-4 rounded-2xl hover:opacity-90 transition shadow-xl active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Buscando...' : 'Buscar'}
                        </button>
                    </form>
                </div>

                <div className="grid gap-6">
                    {results.map(ticket => (
                        <div key={ticket.id} className="bg-card p-8 rounded-[32px] shadow-sm border border-border flex flex-wrap items-center justify-between gap-6 transition-colors">
                            <div className="flex-1 min-w-[200px]">
                                <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">{ticket.code}</div>
                                <h3 className="text-xl font-bold text-foreground">{ticket.customerName}</h3>
                                <p className="text-sm text-muted-foreground font-medium">{ticket.customerPhone || 'Sin teléfono'}</p>
                                {ticket.order && (
                                    <div className="mt-3 inline-flex items-center bg-muted px-3 py-1 rounded-full text-[10px] font-black text-muted-foreground uppercase tracking-widest border border-border">
                                        Orden: {ticket.order.itemCode || ticket.order.id.slice(0, 8)}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => handleConfirm(ticket.id)}
                                className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition active:scale-95"
                            >
                                Confirmar Entrega
                            </button>
                        </div>
                    ))}
                    {results.length === 0 && !loading && name && (
                        <div className="text-center p-16 bg-muted/30 rounded-[40px] border-2 border-dashed border-border transition-colors">
                            <span className="material-symbols-outlined text-muted-foreground/30 text-5xl mb-4">search_off</span>
                            <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">No se encontraron turnos</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Pickup;
