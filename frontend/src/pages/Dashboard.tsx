import React, { useEffect, useState } from 'react';
import { OrdersService } from '../services/orders.service';

export default function DashboardPage() {
    const [stats, setStats] = useState([
        { label: "Valor en Producción", value: "$0 MXN", change: "...", trend: "stable" },
        { label: "Margen Promedio", value: "0%", change: "...", trend: "stable" },
        { label: "Pedidos Activos", value: "0", change: "...", trend: "stable" },
        { label: "Entregas este Mes", value: "0", change: "...", trend: "stable" },
    ]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const orders = await OrdersService.getOrders();

                // --- Simple Calculations for Demo ---

                // 1. Valor en Producción (Orders not New, not Delivered)
                const productionOrders = orders.filter((o: any) =>
                    o.stage !== 'INTERES_LEAD' &&
                    o.stage !== 'ENTREGADO_POSTVENTA' &&
                    o.stage !== 'LISTO_ENTREGA'
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
                const activeCount = productionOrders.length;

                // 4. Entregas este Mes (Dummy logic for now as we don't have deliveryDate field strictly populated or filtered)
                // Let's just count 'LISTO_ENTREGA' for now as proxy
                const deliveredCount = orders.filter((o: any) => o.stage === 'LISTO_ENTREGA').length;

                setStats([
                    { label: "Valor en Producción", value: `$${totalValue.toLocaleString()} MXN`, change: "Calculado", trend: "up" },
                    { label: "Margen Promedio", value: `${marginPercent.toFixed(1)}%`, change: "Calculado", trend: "up" },
                    { label: "Pedidos Activos", value: activeCount.toString(), change: "En curso", trend: "stable" },
                    { label: "Listos para Entrega", value: deliveredCount.toString(), change: "Este mes", trend: "up" },
                ]);

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
                    <div className="flex-1 flex items-center justify-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/20">
                        <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.3em] font-display italic">
                            [ Inteligencia Predictiva en Proceso ]
                        </p>
                    </div>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-900 p-10 rounded-3xl backdrop-blur-sm h-[400px] flex flex-col gap-8">
                    <div className="flex items-center justify-between">
                        <h4 className="text-white text-sm font-black uppercase tracking-widest underline decoration-zinc-800 underline-offset-8">Próximas Entregas</h4>
                        <span className="material-symbols-outlined text-zinc-700">event_available</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/20">
                        <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.3em] font-display italic">
                            [ Calendario Dinámico ]
                        </p>
                    </div>
                    <button className="mt-auto py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 hover:text-white transition-colors border-t border-zinc-900/50">
                        Ver Calendario Completo
                    </button>
                </div>
            </div>
        </div>
    );
}
