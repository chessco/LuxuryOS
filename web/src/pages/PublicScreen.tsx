import React, { useEffect, useState } from 'react';
import { QueueService } from '../services/queue.service';
import { io } from 'socket.io-client';

const PublicScreen: React.FC = () => {
    const [data, setData] = useState<{ current: any, waiting: any[] }>({ current: null, waiting: [] });
    const tenantId = 'default-tenant'; // In production, get from subdomain

    const fetchData = async () => {
        try {
            const result = await QueueService.getPublicTickets();
            setData(result);
        } catch (error) {
            console.error('Error fetching public queue', error);
        }
    };

    useEffect(() => {
        fetchData();

        // Real-time updates
        const socket = io(`${import.meta.env.VITE_API_URL}/queue`);
        socket.emit('joinTenantRoom', tenantId);

        socket.on('queueUpdated', () => {
            fetchData();
            // Play notification sound
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => { });
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const getKindLabel = (kind: string) => {
        switch (kind) {
            case 'REPAIR': return 'Reparación';
            case 'SALE': return 'Venta';
            case 'PICKUP': return 'Entrega';
            default: return kind;
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-12 overflow-hidden flex flex-col transition-colors">
            <header className="flex justify-between items-center mb-12">
                <h1 className="text-5xl font-black tracking-tighter text-primary">LUXURY OS</h1>
                <div className="text-3xl text-muted-foreground font-mono">{new Date().toLocaleTimeString()}</div>
            </header>

            <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Current Turn Section */}
                <div className="bg-card rounded-[3rem] p-12 flex flex-col items-center justify-center border-4 border-primary shadow-[0_0_100px_rgba(var(--primary-rgb),0.1)] transition-colors">
                    <h2 className="text-4xl font-bold text-muted-foreground mb-4 uppercase tracking-widest">TURNO ACTUAL</h2>
                    {data.current ? (
                        <div className="text-center">
                            <div className="text-[18rem] font-black leading-none text-primary mb-4 drop-shadow-2xl">
                                {data.current.code}
                            </div>
                            <div className="text-5xl font-bold uppercase tracking-widest text-foreground">
                                {data.current.customerName}
                            </div>
                            <div className="mt-8 px-8 py-3 bg-primary text-primary-foreground rounded-full text-2xl font-black uppercase shadow-xl">
                                {getKindLabel(data.current.kind)}
                            </div>
                        </div>
                    ) : (
                        <div className="text-6xl font-black text-muted/30 animate-pulse">ESPERANDO...</div>
                    )}
                </div>

                {/* Waiting List Section */}
                <div className="flex flex-col gap-6">
                    <h2 className="text-3xl font-bold text-muted-foreground mb-2 uppercase tracking-widest">PRÓXIMOS TURNOS</h2>
                    <div className="flex flex-col gap-4">
                        {data.waiting.map((ticket, index) => (
                            <div
                                key={ticket.id}
                                className="bg-muted p-6 rounded-3xl flex justify-between items-center border border-border hover:border-foreground/20 transition-all"
                            >
                                <div className="flex items-center gap-8">
                                    <span className="text-5xl font-black text-muted-foreground font-mono ">{ticket.code}</span>
                                    <div>
                                        <div className="text-2xl font-bold uppercase text-foreground">{ticket.customerName}</div>
                                        <div className="text-primary text-sm font-black uppercase">{getKindLabel(ticket.kind)}</div>
                                    </div>
                                </div>
                                <div className={`text-xl font-bold ${index === 0 ? 'text-emerald-500' : 'text-muted-foreground/40'}`}>
                                    {index === 0 ? 'SIGUIENTE' : index + 1}
                                </div>
                            </div>
                        ))}
                        {data.waiting.length === 0 && (
                            <div className="text-center p-24 text-muted/20 font-black text-4xl uppercase tracking-tighter">
                                No hay más turnos en espera
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <footer className="mt-12 text-center text-muted-foreground font-bold uppercase tracking-[0.5em] text-sm italic">
                Favor de estar atento a su turno. Recibirá un mensaje de WhatsApp cuando sea su momento.
            </footer>
        </div>
    );
};

export default PublicScreen;
