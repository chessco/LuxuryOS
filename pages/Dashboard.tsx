
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const data = [
  { name: 'Semana 1', sales: 40000, costs: 24000 },
  { name: 'Semana 2', sales: 30000, costs: 13980 },
  { name: 'Semana 3', sales: 20000, costs: 98000 },
  { name: 'Semana 4', sales: 27800, costs: 39080 },
  { name: 'Semana 5', sales: 18900, costs: 48000 },
  { name: 'Semana 6', sales: 23900, costs: 38000 },
  { name: 'Semana 7', sales: 34900, costs: 43000 },
];

const stats = [
  { label: 'Ingresos (Mes)', value: '€124,500', trend: '+12%', icon: 'payments', color: 'text-primary' },
  { label: 'Pedidos Activos', value: '8', trend: '+2', icon: 'shopping_basket', color: 'text-orange-400' },
  { label: 'En Producción', value: '14', trend: '0 var.', icon: 'diamond', color: 'text-purple-400' },
  { label: 'Inventario', value: '€850k', trend: '+5%', icon: 'inventory', color: 'text-cyan-400' },
];

const pipeline = [
  { stage: 'Diseño & CAD', count: '4 Proyectos', icon: 'brush', color: 'bg-indigo-500/10 text-indigo-400' },
  { stage: 'Fundición', count: '2 Piezas', icon: 'whatshot', color: 'bg-orange-500/10 text-orange-400' },
  { stage: 'Engastado', count: '5 Piezas', icon: 'diamond', color: 'bg-blue-500/10 text-blue-400' },
  { stage: 'Pulido Final', count: '3 Piezas', icon: 'auto_awesome', color: 'bg-emerald-500/10 text-emerald-400' },
];

const Dashboard: React.FC = () => {
  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto w-full">
      {/* Title Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-light text-white tracking-tight">Resumen Ejecutivo</h2>
          <p className="text-slate-400 mt-1 font-light">Bienvenido de nuevo. Aquí está el estado de su taller hoy.</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20 flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-green-400 animate-pulse"></span>
            Sistema Operativo
          </span>
          <span className="text-slate-500 text-sm font-medium self-center">Última act. 10:42 AM</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div key={i} className="group relative overflow-hidden rounded-xl border border-card-border bg-[#1e2430] p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <span className={`material-symbols-outlined ${stat.color} bg-white/5 p-1.5 rounded-lg`}>{stat.icon}</span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
              <span className="text-xs font-medium text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded flex items-center">
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-card-border bg-[#1e2430] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Rendimiento Financiero</h3>
              <p className="text-sm text-slate-400">Ventas vs. Costos de Producción (30 días)</p>
            </div>
            <button className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-card-border/50">
              <span className="material-symbols-outlined">more_horiz</span>
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1152d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#1152d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#282e39" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111318', borderColor: '#2d3646', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#1152d4" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-[#1e2430] p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Flujo de Taller</h3>
            <a className="text-xs font-bold text-primary hover:text-primary/80 uppercase tracking-wider" href="#">Ver Todo</a>
          </div>
          <div className="flex-1 flex flex-col gap-4">
            {pipeline.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-[#111318] border border-card-border group hover:border-slate-600 transition-colors cursor-pointer">
                <div className={`size-10 rounded-lg flex items-center justify-center ${item.color}`}>
                  <span className="material-symbols-outlined">{item.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{item.stage}</p>
                  <p className="text-xs text-slate-500">{item.count}</p>
                </div>
                <span className="material-symbols-outlined text-slate-600 text-sm">chevron_right</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-card-border bg-[#1e2430] p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Actividad Reciente</h3>
          <div className="space-y-6">
            <ActivityItem 
              color="bg-primary"
              title={<>Nuevo pedido de <span className="text-primary hover:underline cursor-pointer">Isabella M.</span> (Cliente VIP)</>}
              subtitle="Collar 'Aurora' - Oro Blanco 18k con Zafiros. Pedido #ORD-8821"
              time="Hace 2h"
            />
            <ActivityItem 
              color="bg-emerald-500"
              title="Producción Completada"
              subtitle="Anillo Solitario 2ct está listo para control de calidad. Asignado a Marco."
              time="Hace 5h"
            />
            <ActivityItem 
              color="bg-slate-500"
              title="Inventario Actualizado"
              subtitle="Recepción de lote de diamantes corte brillante (20 unidades)."
              time="Ayer"
              isLast
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-card-border bg-[#1e2430] p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Accesos Rápidos</h3>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionButton icon="person_add" label="Nuevo Cliente" />
              <QuickActionButton icon="build" label="Reparación" />
              <QuickActionButton icon="inventory" label="Ajustar Stock" />
              <QuickActionButton icon="print" label="Reportes" />
            </div>
          </div>
          
          <div className="flex-1 rounded-xl border border-card-border bg-gradient-to-br from-[#1e2430] to-[#161b24] p-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 size-32 bg-primary/10 rounded-full blur-3xl"></div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 relative z-10">Próxima Cita VIP</h3>
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div 
                className="size-12 rounded-full bg-cover bg-center border-2 border-primary/30" 
                style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBMgZnP5ZuESqr1TEosweNdR7HopD5-LUhmmwcGhT1ifiz5011Y0WkbyWwXtB6uVrrmdxW4BJq25RWr6fCtfbD0uMkpk9UJ7x0NHbSYSOSKAEMVr5sYoWl6h3y5F4FIzVoRgfB6qbDVXmNqGoRtGuH2DUyknr_4b03XUlFymoGW_VqZFNsCPgj01Jmd7uEUG6m57sri0vbCFTTbWEcuI6q-FqN1xz6zFt9YdzCn66T1txXD8C7hU19d7wWRqH59l-yGiNh8EwvAzVw')` }}
              ></div>
              <div>
                <p className="text-white font-bold">Elena K.</p>
                <p className="text-xs text-primary font-medium">Top 5% Cliente</p>
              </div>
            </div>
            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="material-symbols-outlined text-slate-500 text-[18px]">calendar_today</span>
                <span>Hoy, 16:30 PM</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="material-symbols-outlined text-slate-500 text-[18px]">location_on</span>
                <span>Showroom Principal</span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <p className="text-xs text-slate-500 italic">"Interesada en ver la nueva colección de esmeraldas."</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityItem: React.FC<{ color: string, title: React.ReactNode, subtitle: string, time: string, isLast?: boolean }> = ({ color, title, subtitle, time, isLast }) => (
  <div className={`flex gap-4 items-start relative pl-6 ${!isLast ? 'pb-6 border-l border-slate-700' : ''}`}>
    <div className={`absolute -left-1.5 top-0 size-3 rounded-full ${color} ring-4 ring-[#1e2430]`}></div>
    <div className="flex-1">
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium text-white">{title}</p>
        <span className="text-xs text-slate-500">{time}</span>
      </div>
      <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
    </div>
  </div>
);

const QuickActionButton: React.FC<{ icon: string, label: string }> = ({ icon, label }) => (
  <button className="flex flex-col items-center justify-center p-4 rounded-lg bg-[#111318] border border-card-border hover:border-primary hover:bg-primary/5 transition-all group">
    <span className="material-symbols-outlined text-slate-400 group-hover:text-primary mb-2">{icon}</span>
    <span className="text-[10px] font-medium text-slate-300 group-hover:text-white uppercase tracking-tight">{label}</span>
  </button>
);

export default Dashboard;
