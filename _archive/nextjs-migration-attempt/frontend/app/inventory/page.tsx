"use client";

import React from 'react';
import Link from 'next/link';

const items = [
  { id: '1', sku: 'DIA-0042-X', name: 'Solitario Diamante Corte Brillante', detail: '2.05 Carat, VVS1', type: 'Anillos', location: 'Bóveda Principal', quantity: 3, value: '$12,500', cost: '$7,200', icon: 'diamond', color: 'text-zinc-400' },
  { id: '2', sku: 'WAT-8821-V', name: 'Cronógrafo Vintage 1960', detail: 'Restaurado', type: 'Relojería', location: 'Vitrina 1', quantity: 1, value: '$8,500', cost: '$5,100', icon: 'watch', color: 'text-zinc-400', alert: true },
  { id: '3', sku: 'NEC-9002-C', name: 'Collar Esmeralda Colombiana', detail: 'Oro Blanco 18k', type: 'Collares', location: 'Taller (Engaste)', quantity: 2, value: '$24,000', cost: '$14,000', icon: 'apparel', color: 'text-zinc-400' },
  { id: '4', sku: 'GEM-3321-S', name: 'Zafiros Sueltos (Lote A)', detail: 'Corte Oval', type: 'Gemas', location: 'Caja Fuerte 2', quantity: 50, value: '$450', cost: '$250', icon: 'hexagon', color: 'text-zinc-400' },
];

const InventoryPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center max-w-[1400px] mx-auto w-full">
      <div className="w-full flex flex-col gap-8">
        {/* Heading */}
        <div className="flex flex-col lg:flex-row flex-wrap justify-between gap-6 items-start lg:items-end">
          <div className="flex flex-col gap-3 max-w-2xl">
            <h1 className="text-white text-4xl font-black tracking-tight">Inventario</h1>
            <p className="text-zinc-500 text-sm font-medium">Control de existencias, ubicación y valoración de piezas de lujo.</p>
          </div>
          <button className="flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-200 transition-all h-12 px-8 text-black text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-white/5 active:scale-95">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Nuevo Artículo</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryStat label="Valor Total" value="$845,200" />
          <SummaryStat label="Piezas" value="142" />
          <SummaryStat label="Stock Bajo" value="5" badge="Alerta" badgeColor="text-red-400 bg-red-400/10 border-red-400/20" />
          <SummaryStat label="En Consignación" value="12" />
        </div>

        {/* Toolbar */}
        <div className="bg-zinc-900/30 rounded-2xl p-6 border border-zinc-900 backdrop-blur-sm flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative flex items-center w-full h-12 rounded-xl bg-zinc-900/50 border border-zinc-900 overflow-hidden focus-within:border-zinc-700 transition-all">
                <div className="grid place-items-center h-full w-12 text-zinc-500">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input
                  className="peer h-full w-full outline-none text-sm text-white bg-transparent pr-2 placeholder-zinc-600"
                  placeholder="Buscar por nombre, SKU o categoría..."
                  type="text"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
              {['Ubicación', 'Stock Bajo', 'Diamantes', 'Filtros'].map(f => (
                <button key={f} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-900/50 border border-zinc-900 px-6 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                  {f === 'Stock Bajo' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"></span>}
                  <span>{f}</span>
                  {['Ubicación', 'Filtros'].includes(f) && <span className="material-symbols-outlined text-[18px] text-zinc-600">{f === 'Filtros' ? 'filter_list' : 'keyboard_arrow_down'}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/40 border-b border-zinc-900 text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-5 font-bold w-1/2">Artículo</th>
                <th className="px-8 py-5 font-bold">Ubicación</th>
                <th className="px-8 py-5 font-bold text-center">Cantidad</th>
                <th className="px-8 py-5 font-bold text-right">Valor</th>
                <th className="px-8 py-5 font-bold text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/50">
              {items.map(item => (
                <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
                  <td className="px-8 py-6">
                    <Link href={`/inventory/${item.sku}`} className="flex items-center gap-5">
                      <div className="h-14 w-14 rounded-2xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-center shadow-xl shrink-0 group-hover:border-zinc-600 transition-colors">
                        <span className="material-symbols-outlined text-[24px] text-zinc-400 group-hover:text-white transition-colors">{item.icon}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base leading-tight tracking-tight group-hover:underline decoration-zinc-800 underline-offset-4">{item.name}</h4>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">SKU: {item.sku}</span>
                          <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                          <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{item.detail}</span>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                      <span className="material-symbols-outlined text-[18px] text-zinc-700">location_on</span>
                      <span>{item.location}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-black text-white text-base">{item.quantity}</span>
                      {item.alert && <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse"></span>}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className="font-bold text-white text-base">{item.value}</p>
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-0.5">COST: {item.cost}</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 rounded-xl text-zinc-700 hover:text-white hover:bg-zinc-800 transition-all">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-8 py-5 border-t border-zinc-900 bg-black/10 flex items-center justify-between">
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Mostrando 1-4 de 142 artículos</p>
            <div className="flex gap-2">
              <button className="h-10 px-6 rounded-xl border border-zinc-900 bg-zinc-900/50 text-zinc-600 text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-zinc-700 transition-all">Anterior</button>
              <button className="h-10 px-6 rounded-xl border border-zinc-900 bg-zinc-900/50 text-zinc-600 text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-zinc-700 transition-all">Siguiente</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryStat: React.FC<{ label: string, value: string, badge?: string, badgeColor?: string }> = ({ label, value, badge, badgeColor }) => (
  <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-900 backdrop-blur-sm shadow-sm flex flex-col gap-2">
    <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
    <div className="flex items-center gap-3">
      <p className="text-white text-2xl font-black tracking-tighter">{value}</p>
      {badge && <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border ${badgeColor}`}>{badge}</span>}
    </div>
  </div>
);

export default InventoryPage;
