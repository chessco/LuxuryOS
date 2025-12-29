import React from 'react';

export default function DashboardPage() {
    const stats = [
        { label: "Valor en Producción", value: "$4,850,000 MXN", change: "+12%", trend: "up" },
        { label: "Margen Promedio", value: "42%", change: "+2%", trend: "up" },
        { label: "Pedidos Activos", value: "24", change: "Estable", trend: "stable" },
        { label: "Entregas este Mes", value: "18", change: "+5", trend: "up" },
    ];

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
                            <h3 className="text-white text-2xl font-black tracking-tighter">{stat.value}</h3>
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
                    <ul className="flex flex-col gap-6 mt-2">
                        {[
                            { item: "Anillo Diamante", client: "Eduardo M.", date: "12 ENE", status: "Producción" },
                            { item: "Reloj Platinum", client: "Sofía V.", date: "15 ENE", status: "Control de Calidad" },
                            { item: "Brazalete Oro", client: "Araceli R.", date: "18 ENE", status: "Pulido" }
                        ].map((delivery, i) => (
                            <li key={i} className="flex items-center justify-between group cursor-pointer">
                                <div className="flex flex-col gap-1">
                                    <span className="text-white text-sm font-bold group-hover:underline underline-offset-4 decoration-zinc-800 transition-all">{delivery.item}</span>
                                    <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">{delivery.client}</span>
                                </div>
                                <div className="text-right flex flex-col gap-1">
                                    <span className="text-white text-xs font-black tracking-widest">{delivery.date}</span>
                                    <span className="text-zinc-700 text-[9px] font-black uppercase tracking-widest">{delivery.status}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <button className="mt-auto py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 hover:text-white transition-colors border-t border-zinc-900/50">
                        Ver Calendario Completo
                    </button>
                </div>
            </div>
        </div>
    );
}
