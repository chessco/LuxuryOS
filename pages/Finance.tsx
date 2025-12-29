
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
  { name: 'May', ingresos: 60000, gastos: 38000 },
  { name: 'Jun', ingresos: 82000, gastos: 45000 },
  { name: 'Jul', ingresos: 70000, gastos: 52000 },
  { name: 'Ago', ingresos: 105000, gastos: 35000 },
  { name: 'Sep', ingresos: 90000, gastos: 60000 },
  { name: 'Oct', ingresos: 142300, gastos: 38150 },
];

const Finance: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark">
      <header className="bg-background-dark/80 backdrop-blur-md border-b border-card-border shrink-0 z-10">
        <div className="px-6 py-5 flex flex-col gap-5">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-white text-3xl font-black tracking-tight">Resumen de Finanzas</h2>
              <p className="text-slate-400 text-sm">Visión general de ingresos, gastos y rentabilidad</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 bg-card-dark hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg border border-card-border transition-all text-sm font-medium">
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span className="hidden sm:inline">Reporte</span>
              </button>
              <button className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-primary/25">
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span>Nueva Transacción</span>
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex p-1 bg-card-dark rounded-lg border border-card-border">
              {['Semana', 'Mes', 'Trimestre', 'Año'].map(p => (
                <button key={p} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${p === 'Mes' ? 'bg-background-dark text-white border border-card-border shadow-sm' : 'text-slate-500 hover:text-white'}`}>
                  {p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-slate-400 bg-card-dark/50 px-3 py-1.5 rounded-lg border border-card-border/50">
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              <span className="text-sm font-mono">01 Oct 2023 - 31 Oct 2023</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FinancialStat label="Ingresos Totales" value="$142,300.00" trend="+12.5%" icon="payments" color="text-primary" />
            <FinancialStat label="Gastos Operativos" value="$38,150.00" trend="-2.1%" icon="account_balance_wallet" color="text-expense" />
            <FinancialStat label="Utilidad Neta" value="$104,150.00" trend="+18.2%" icon="savings" color="text-profit" />
            <FinancialStat label="Por Cobrar" value="$12,400.00" icon="pending_actions" color="text-yellow-500" badge="4 órdenes" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-xl bg-card-dark border border-card-border">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-white font-bold text-lg">Flujo de Caja</h3>
                  <p className="text-slate-500 text-xs">Comparativa de ingresos vs egresos (últimos 6 meses)</p>
                </div>
                <button className="text-slate-500 hover:text-white transition-colors">
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#282e39" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: '#111318', borderColor: '#2d3646', color: '#fff' }}
                    />
                    <Bar dataKey="ingresos" fill="#1152d4" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="gastos" fill="#2d3646" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary"></span>
                  <span className="text-xs text-slate-400">Ingresos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-card-border"></span>
                  <span className="text-xs text-slate-400">Gastos</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-card-dark border border-card-border flex flex-col">
              <h3 className="text-white font-bold text-lg mb-1">Fuentes de Ingresos</h3>
              <p className="text-slate-500 text-xs mb-6">Desglose por categoría de producto</p>
              <div className="flex flex-col gap-6 flex-1 justify-center">
                <ProgressItem label="Anillos de Compromiso" value={58} color="bg-primary" amount="$82,530" />
                <ProgressItem label="Alta Joyería" value={24} color="bg-teal-400" amount="$34,150" />
                <ProgressItem label="Relojería" value={12} color="bg-yellow-500" amount="$17,050" />
                <ProgressItem label="Servicios" value={6} color="bg-purple-400" amount="$8,570" />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card-dark border border-card-border overflow-hidden">
            <div className="p-6 border-b border-card-border flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold text-lg">Transacciones Recientes</h3>
                <p className="text-slate-500 text-xs">Historial de movimientos financieros</p>
              </div>
              <a className="text-xs text-primary font-bold uppercase tracking-wider hover:underline" href="#">Ver todo</a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-black/20 text-slate-500 text-xs uppercase font-medium">
                  <tr>
                    <th className="px-6 py-4">Concepto</th>
                    <th className="px-6 py-4">Entidad / Cliente</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border text-sm">
                  <TransactionRow concept="Pago Anticipo Orden #4092" entity="Diego Alvarez" date="28 Oct 2023" status="Completado" amount="+$22,500.00" icon="diamond" isIncome />
                  <TransactionRow concept="Compra de Oro 18k" entity="Metales Preciosos S.A." date="27 Oct 2023" status="Completado" amount="-$5,200.00" icon="inventory" />
                  <TransactionRow concept="Venta Directa: Anillo Zafiro" entity="Valeria S." date="26 Oct 2023" status="Completado" amount="+$6,200.00" icon="sell" isIncome />
                  <TransactionRow concept="Mantenimiento Maquinaria" entity="TecnoJoyas Services" date="25 Oct 2023" status="Pendiente" amount="-$850.00" icon="build" />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const FinancialStat: React.FC<{ label: string, value: string, trend?: string, icon: string, color: string, badge?: string }> = ({ label, value, trend, icon, color, badge }) => (
  <div className="p-5 rounded-xl bg-card-dark border border-card-border flex flex-col gap-4 relative overflow-hidden group hover:border-primary/30 transition-colors shadow-md">
    <div className="flex justify-between items-start z-10">
      <div className={`p-2 rounded-lg bg-background-dark border border-card-border ${color}`}>
        <span className="material-symbols-outlined icon-fill">{icon}</span>
      </div>
      {trend && (
        <span className="flex items-center gap-1 text-[10px] font-bold text-profit bg-profit/10 px-2 py-0.5 rounded-full border border-profit/20">
          {trend}
        </span>
      )}
      {badge && (
        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </div>
    <div className="z-10">
      <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider mb-1">{label}</p>
      <h3 className="text-white text-2xl font-bold tracking-tight">{value}</h3>
    </div>
  </div>
);

const ProgressItem: React.FC<{ label: string, value: number, color: string, amount: string }> = ({ label, value, color, amount }) => (
  <div className="group">
    <div className="flex justify-between items-end mb-2">
      <span className="text-sm text-white font-medium group-hover:text-primary transition-colors">{label}</span>
      <span className="text-sm text-white font-bold">{value}%</span>
    </div>
    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }}></div>
    </div>
    <p className="text-[10px] text-slate-600 mt-1">{amount} generados</p>
  </div>
);

const TransactionRow: React.FC<{ concept: string, entity: string, date: string, status: string, amount: string, icon: string, isIncome?: boolean }> = ({ concept, entity, date, status, amount, icon, isIncome }) => (
  <tr className="hover:bg-white/[0.02] transition-colors group">
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded flex items-center justify-center ${isIncome ? 'bg-primary/10 text-primary' : 'bg-slate-800 text-slate-400'}`}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
        <span className="text-white font-medium">{concept}</span>
      </div>
    </td>
    <td className="px-6 py-4 text-slate-400 group-hover:text-white transition-colors">{entity}</td>
    <td className="px-6 py-4 text-slate-400">{date}</td>
    <td className="px-6 py-4">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${status === 'Completado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
        <span className={`w-1 h-1 rounded-full ${status === 'Completado' ? 'bg-emerald-400' : 'bg-yellow-400'}`}></span>
        {status}
      </span>
    </td>
    <td className={`px-6 py-4 text-right font-bold ${isIncome ? 'text-white' : 'text-slate-400'}`}>{amount}</td>
  </tr>
);

export default Finance;
