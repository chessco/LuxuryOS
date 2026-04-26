import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
    { name: 'Ene', ingresos: 45000, gastos: 32000 },
    { name: 'Feb', ingresos: 52000, gastos: 28000 },
    { name: 'Mar', ingresos: 48000, gastos: 35000 },
    { name: 'Abr', ingresos: 61000, gastos: 42000 },
    { name: 'May', ingresos: 55000, gastos: 38000 },
    { name: 'Jun', ingresos: 67000, gastos: 34000 },
];

const transactions = [
    { id: 'TR-9023', description: 'Venta - Anillo Diamante', category: 'Ingreso', amount: '+$95,000 MXN', status: 'Completado', date: 'Hoy, 14:30' },
    { id: 'TR-9024', description: 'Compra de Materiales', category: 'Gasto', amount: '-$52,000 MXN', status: 'Pendiente', date: 'Hoy, 12:15' },
    { id: 'TR-9025', description: 'Nómina Taller', category: 'Gasto', amount: '-$84,000 MXN', status: 'Completado', date: 'Ayer' },
];

const FinancePage: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col items-center max-w-[1400px] mx-auto w-full">
            <div className="w-full flex flex-col gap-8">
                {/* Heading */}
                <div className="flex flex-col lg:flex-row flex-wrap justify-between gap-6 items-start lg:items-end">
                    <div className="flex flex-col gap-3 max-w-2xl">
                        <h1 className="text-foreground text-4xl font-black tracking-tight font-display">Finanzas</h1>
                        <p className="text-muted-foreground text-sm font-medium">Control de ingresos, gastos y salud financiera del atelier.</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center justify-center gap-2 rounded-xl bg-card border border-border hover:border-foreground/20 transition-all h-12 px-6 text-muted-foreground hover:text-foreground text-xs font-black uppercase tracking-widest active:scale-95 shadow-sm">
                            <span className="material-symbols-outlined text-[20px]">file_download</span>
                            <span>Exportar</span>
                        </button>
                        <button className="flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground transition-all h-12 px-8 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-black/5 dark:shadow-white/5 active:scale-95">
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            <span>Nueva Transacción</span>
                        </button>
                    </div>
                </div>

                {/* Highlight Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-8 rounded-3xl bg-card border border-border backdrop-blur-sm shadow-sm flex flex-col gap-4 transition-colors">
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">Balance Total</p>
                            <span className="material-symbols-outlined text-muted-foreground/30">account_balance_wallet</span>
                        </div>
                        <p className="text-foreground text-4xl font-black tracking-tighter">$14,520,300 MXN</p>
                        <div className="flex items-center gap-2 text-emerald-500">
                            <span className="material-symbols-outlined text-sm">trending_up</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">+12.5% este mes</span>
                        </div>
                    </div>
                    <div className="p-8 rounded-3xl bg-card border border-border backdrop-blur-sm shadow-sm flex flex-col gap-4 transition-colors">
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">Ingresos (Mensual)</p>
                            <span className="material-symbols-outlined text-muted-foreground/30">trending_up</span>
                        </div>
                        <p className="text-foreground text-4xl font-black tracking-tighter">$2,450,000 MXN</p>
                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">32 pedidos completados</p>
                    </div>
                    <div className="p-8 rounded-3xl bg-card border border-border backdrop-blur-sm shadow-sm flex flex-col gap-4 transition-colors">
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">Gastos (Mensual)</p>
                            <span className="material-symbols-outlined text-muted-foreground/30">trending_down</span>
                        </div>
                        <p className="text-foreground text-4xl font-black tracking-tighter">$1,520,000 MXN</p>
                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">En materiales y operación</p>
                    </div>
                </div>

                {/* Chart Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 p-8 rounded-3xl bg-card border border-border backdrop-blur-sm flex flex-col gap-8 shadow-sm transition-colors">
                        <div className="flex items-center justify-between">
                            <h3 className="text-foreground text-lg font-black tracking-tight uppercase font-display">Historial Financiero</h3>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-foreground"></span>
                                    <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Ingresos</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-muted"></span>
                                    <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Gastos</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <defs>
                                        <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="currentColor" stopOpacity={0.1} className="text-foreground" />
                                            <stop offset="95%" stopColor="currentColor" stopOpacity={0} className="text-foreground" />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" vertical={false} className="text-border" />
                                    <XAxis dataKey="name" stroke="currentColor" fontSize={10} tickLine={false} axisLine={false} dy={10} className="text-muted-foreground" />
                                    <YAxis stroke="currentColor" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val / 1000}k`} className="text-muted-foreground" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '10px' }}
                                        itemStyle={{ color: 'var(--foreground)', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="ingresos" stroke="currentColor" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" className="text-foreground" />
                                    <Area type="monotone" dataKey="gastos" stroke="currentColor" strokeWidth={2} fill="transparent" className="text-muted" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="p-8 rounded-3xl bg-card border border-border backdrop-blur-sm flex flex-col gap-6 shadow-sm transition-colors">
                        <h3 className="text-foreground text-lg font-black tracking-tight uppercase font-display">Transacciones Recientes</h3>
                        <div className="flex flex-col gap-4">
                            {transactions.map(t => (
                                <div key={t.id} className="group flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border hover:border-foreground/20 transition-all cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className={`size-10 rounded-xl flex items-center justify-center border border-border ${t.category === 'Ingreso' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                            <span className="material-symbols-outlined text-[18px]">
                                                {t.category === 'Ingreso' ? 'arrow_upward' : 'arrow_downward'}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="text-foreground text-xs font-bold leading-tight group-hover:underline decoration-border underline-offset-4">{t.description}</h4>
                                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-0.5">{t.date}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-xs font-black tracking-tight ${t.category === 'Ingreso' ? 'text-foreground' : 'text-muted-foreground'}`}>{t.amount}</p>
                                        <p className="text-muted-foreground/70 text-[9px] font-black uppercase tracking-widest mt-0.5">{t.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="mt-2 w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors border-t border-border">
                            Ver Todo el Historial
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancePage;
