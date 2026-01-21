import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrdersService } from '../services/orders.service';

export default function DashboardPage() {
    const [stageStats, setStageStats] = useState<any[]>([]);
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [stats, setStats] = useState([
        { label: "Valor en Producción", value: "$0 MXN", change: "...", trend: "stable" },
        { label: "Margen Promedio", value: "0%", change: "...", trend: "stable" },
        { label: "Pedidos Activos", value: "0", change: "...", trend: "stable" },
        { label: "Entregas este Mes", value: "0", change: "...", trend: "stable" },
    ]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const orders = await OrdersService.getOrders();

                // --- Simple Calculations for Demo ---

                // 1. Valor en Producción (Orders in production stages)
                const productionOrders = orders.filter((o: any) =>
                    o.stage === 'APROBADO_ANTICIPO' ||
                    o.stage === 'EN_PRODUCCION' ||
                    o.stage === 'CONTROL_CALIDAD'
                );

                // Active Orders (Everything not delivered)
                const activeOrders = orders.filter((o: any) =>
                    o.stage !== 'LISTO_ENTREGA' &&
                    o.stage !== 'ENTREGADO_POSTVENTA'
                );

                const totalValue = productionOrders.reduce((sum: number, o: any) => sum + Number(o.value), 0);

                // 2. Margen Promedio
                const totalMargin = productionOrders.reduce((sum: number, o: any) => sum + Number(o.margin), 0);
                const avgMargin = productionOrders.length ? (totalMargin / productionOrders.length) : 0; // This is absolute margin, not percentage. 
                // Assuming margin in DB is absolute value. If we want %, we need (margin/value)*100.
                // Let's approximate % for now assuming we don't have it easily. 
                // Wait, schema has `value`, `cost`, `margin`. 
                // Let's calculate total margin % = (Total Margin / Total Value) * 100
                const marginPercent = totalValue ? ((productionOrders.reduce((sum: number, o: any) => sum + Number(o.margin), 0) / totalValue) * 100) : 0;

                // 3. Active Orders
                const activeCount = activeOrders.length;

                // 4. Entregas este Mes (Dummy logic for now as we don't have deliveryDate field strictly populated or filtered)
                // Let's just count 'LISTO_ENTREGA' for now as proxy
                const deliveredCount = orders.filter((o: any) => o.stage === 'LISTO_ENTREGA').length;

                setStats([
                    { label: "Valor en Producción", value: `$${totalValue.toLocaleString()} MXN`, change: "Calculado", trend: "up" },
                    { label: "Margen Promedio", value: `${marginPercent.toFixed(1)}%`, change: "Calculado", trend: "up" },
                    { label: "Pedidos Activos", value: activeCount.toString(), change: "En curso", trend: "stable" },
                    { label: "Listos para Entrega", value: deliveredCount.toString(), change: "Este mes", trend: "up" },
                ]);

                // --- Distribution Calculation ---
                const stageCounts = orders.reduce((acc: any, order: any) => {
                    acc[order.stage] = (acc[order.stage] || 0) + 1;
                    return acc;
                }, {});

                const totalOrders = orders.length;

                const distribution = [
                    { id: 'INTERES_LEAD', label: 'Interés / Lead', color: 'bg-zinc-500' },
                    { id: 'COTIZACION_ENVIADA', label: 'Cotización Enviada', color: 'bg-indigo-400' },
                    { id: 'APROBADO_ANTICIPO', label: 'Aprobado / Anticipo', color: 'bg-emerald-400' },
                    { id: 'EN_PRODUCCION', label: 'En Producción', color: 'bg-amber-400' },
                    { id: 'CONTROL_CALIDAD', label: 'Control Calidad', color: 'bg-purple-400' },
                    { id: 'LISTO_ENTREGA', label: 'Listo para Entrega', color: 'bg-blue-400' },
                    { id: 'ENTREGADO_POSTVENTA', label: 'Entregado', color: 'bg-zinc-700' },
                ].map(stage => ({
                    ...stage,
                    count: stageCounts[stage.id] || 0,
                    percentage: totalOrders > 0 ? ((stageCounts[stage.id] || 0) / totalOrders) * 100 : 0
                }));

                setStageStats(distribution);

                // --- Upcoming Deliveries Calculation ---
                const upcoming = orders
                    .filter((o: any) => o.dueDate && o.stage !== 'ENTREGADO_POSTVENTA')
                    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .slice(0, 4);

                setDeliveries(upcoming);

            } catch (error) {
                console.error("Error fetching dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    return (
        <div className="flex flex-col gap-10">
            <div>
                <h1 className="text-white text-4xl font-black tracking-tight font-display">Vista Ejecutiva</h1>
                <p className="text-zinc-500 text-sm font-medium mt-2">Centro de análisis y control para Luxury OS.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-3xl backdrop-blur-sm shadow-sm flex flex-col gap-3">
                        <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-white text-2xl font-black tracking-tighter">{loading ? '...' : stat.value}</h3>
                            <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${stat.trend === 'up' ? 'text-emerald-400' : 'text-zinc-500'
                                }`}>
                                {stat.trend === 'up' && <span className="material-symbols-outlined text-sm">trending_up</span>}
                                {stat.change}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-zinc-900/30 border border-zinc-900 p-10 rounded-3xl backdrop-blur-sm h-[400px] flex flex-col gap-8">
                    <div className="flex items-center justify-between">
                        <h4 className="text-white text-sm font-black uppercase tracking-widest underline decoration-zinc-800 underline-offset-8">Distribución por Etapa</h4>
                        <span className="material-symbols-outlined text-zinc-700">analytics</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-center gap-4 overflow-y-auto pr-2 custom-scrollbar">
                        {loading ? (
                            <p className="text-zinc-500 text-center text-xs">Cargando datos...</p>
                        ) : (
                            stageStats.map((stage) => (
                                <div key={stage.id} className="group">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider group-hover:text-white transition-colors">{stage.label}</span>
                                        <span className="text-zinc-500 text-[10px] font-mono">{stage.count} ({stage.percentage.toFixed(0)}%)</span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-800/50 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${stage.color} rounded-full transition-all duration-1000 ease-out relative overflow-hidden`}
                                            style={{ width: `${stage.percentage}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-900 p-10 rounded-3xl backdrop-blur-sm h-[450px] flex flex-col gap-8">
                    <div className="flex items-center justify-between">
                        <h4 className="text-white text-sm font-black uppercase tracking-widest underline decoration-zinc-800 underline-offset-8">Próximas Entregas</h4>
                        <span className="material-symbols-outlined text-zinc-700">event_available</span>
                    </div>

                    <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                        {loading ? (
                            <p className="text-zinc-500 text-center text-xs">Cargando fecha...</p>
                        ) : deliveries.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/20 p-6 text-center">
                                <span className="material-symbols-outlined text-zinc-800 text-4xl mb-2">event_busy</span>
                                <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.2em]">No hay entregas programadas</p>
                            </div>
                        ) : (
                            deliveries.map((delivery) => (
                                <div key={delivery.id} className="bg-zinc-950/40 border border-zinc-900/50 p-4 rounded-2xl hover:border-zinc-700 transition-all group">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-white text-[10px] font-black uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                                                {delivery.pieceType || 'Pieza Personalizada'}
                                            </span>
                                            <span className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">
                                                Cliente: {delivery.client?.name || 'Incierto'}
                                            </span>
                                        </div>
                                        <div className="bg-zinc-900 px-3 py-2 rounded-xl flex flex-col items-center min-w-[60px]">
                                            <span className="text-indigo-400 text-xs font-black">
                                                {new Date(delivery.dueDate).toLocaleDateString('es-ES', { day: '2-digit' })}
                                            </span>
                                            <span className="text-zinc-600 text-[8px] font-black uppercase tracking-tighter">
                                                {new Date(delivery.dueDate).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        onClick={() => navigate('/orders')}
                        className="mt-auto py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 hover:text-white transition-colors border-t border-zinc-900/50 flex items-center justify-center gap-2 group"
                    >
                        Ver Calendario Completo
                        <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
