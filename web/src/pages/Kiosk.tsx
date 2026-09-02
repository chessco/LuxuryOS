import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QueueService } from '../services/queue.service';
import { QRCodeSVG } from 'qrcode.react';

const Kiosk: React.FC = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [kind, setKind] = useState<'REPAIR' | 'SALE' | 'PICKUP'>('SALE');
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [selectedRecs, setSelectedRecs] = useState<string[]>([]);
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (kind !== 'PICKUP') {
            loadRecommendations();
        } else {
            setRecommendations([]);
            setSelectedRecs([]);
        }
    }, [kind]);

    const loadRecommendations = async () => {
        try {
            // Note: Endpoint getRecommendations might need to be implemented or mocked if tenant has none
            const data = await QueueService.getRecommendations(kind);
            setRecommendations(data);
        } catch (error) {
            console.error('Error loading recommendations', error);
            setRecommendations([]);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await QueueService.createTicket({
                customerName: name,
                customerPhone: phone,
                kind,
                recommendationIds: selectedRecs
            });
            setTicket(result);
        } catch (error) {
            console.error('Error creating ticket', error);
            alert('Error al crear turno');
        } finally {
            setLoading(false);
        }
    };

    const toggleRec = (id: string) => {
        setSelectedRecs(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
    }

    if (ticket) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 transition-colors transition-all relative">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-300 font-bold text-xs uppercase tracking-wider shadow-sm z-30"
                >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Regresar
                </button>
                <div className="bg-card p-8 rounded-2xl border border-border shadow-2xl text-center max-w-sm w-full">
                    <h2 className="text-3xl font-bold mb-4">¡Turno Creado!</h2>
                    <div className="text-6xl font-black text-indigo-500 mb-6">{ticket.code}</div>
                    <p className="text-muted-foreground mb-8 text-sm">Escanea este código para ver tu lugar en la fila:</p>
                    <div className="bg-white p-4 rounded-xl flex justify-center mb-8">
                        <QRCodeSVG value={`${window.location.origin}/q/${ticket.qrToken}`} size={200} />
                    </div>
                    <button
                        onClick={() => {
                            setTicket(null);
                            setName('');
                            setPhone('');
                            setSelectedRecs([]);
                        }}
                        className="w-full bg-foreground text-background font-bold py-3 rounded-lg hover:opacity-90 transition active:scale-95"
                    >
                        Nuevo Turno
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6 transition-colors relative">
            <button
                onClick={() => navigate('/dashboard')}
                className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-300 font-bold text-xs uppercase tracking-wider shadow-sm z-30"
            >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Regresar
            </button>
            <div className="bg-card p-8 rounded-2xl border border-border shadow-2xl w-full max-w-md">
                <h1 className="text-3xl font-bold text-foreground mb-8 text-center tracking-tight">Bienvenido a {(() => { const s = JSON.parse(localStorage.getItem('atelier_settings') || '{}'); return (s.name || 'CARED').toUpperCase(); })()}</h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Nombre</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-zinc-600"
                            placeholder="Tu nombre"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">WhatsApp (opcional)</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-zinc-600"
                            placeholder="+52..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Acción</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['SALE', 'REPAIR', 'PICKUP'] as const).map(k => (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => setKind(k)}
                                    className={`py-3 rounded-lg text-xs font-bold border-2 transition ${kind === k ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'border-border bg-muted text-muted-foreground hover:border-indigo-500/50'}`}
                                >
                                    {k === 'SALE' ? 'Comprar' : k === 'REPAIR' ? 'Reparar' : 'Recoger'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {recommendations.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">¿Te interesa algo más?</label>
                            <div className="space-y-2">
                                {recommendations.map(r => (
                                    <div
                                        key={r.id}
                                        onClick={() => toggleRec(r.id)}
                                        className={`p-3 rounded-lg cursor-pointer border transition flex items-center justify-between ${selectedRecs.includes(r.id) ? 'bg-indigo-500/10 border-indigo-500 text-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}
                                    >
                                        <span className="text-sm">{r.label}</span>
                                        {selectedRecs.includes(r.id) && <span className="text-indigo-500">✓</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-foreground text-background font-bold py-4 rounded-lg transition transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-xl"
                    >
                        {loading ? 'Generando...' : 'Obtener Turno'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Kiosk;
