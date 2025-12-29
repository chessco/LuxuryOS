
import React from 'react';
import { Link } from 'react-router-dom';

const items = [
  { id: '1', sku: 'DIA-0042-X', name: 'Solitario Diamante Corte Brillante', detail: '2.05 Carat, VVS1', type: 'Anillos', location: 'Bóveda Principal', quantity: 3, value: '$12,500', cost: '$7,200', icon: 'diamond', color: 'text-indigo-300 bg-indigo-500/10' },
  { id: '2', sku: 'WAT-8821-V', name: 'Cronógrafo Vintage 1960', detail: 'Restaurado', type: 'Relojería', location: 'Vitrina 1 (Entrada)', quantity: 1, value: '$8,500', cost: '$5,100', icon: 'watch', color: 'text-amber-400 bg-amber-500/10', alert: true },
  { id: '3', sku: 'NEC-9002-C', name: 'Collar Esmeralda Colombiana', detail: 'Oro Blanco 18k', type: 'Collares', location: 'Taller (Engaste)', quantity: 2, value: '$24,000', cost: '$14,000', icon: 'apparel', color: 'text-emerald-300 bg-emerald-500/10' },
  { id: '4', sku: 'GEM-3321-S', name: 'Zafiros Sueltos (Lote A)', detail: 'Corte Oval', type: 'Gemas', location: 'Caja Fuerte 2', quantity: 50, value: '$450', cost: '$250', icon: 'hexagon', color: 'text-blue-300 bg-blue-500/10' },
];

const Inventory: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark">
      <header className="bg-background-dark/80 backdrop-blur-md border-b border-card-border shrink-0 z-10">
        <div className="px-6 py-5 flex flex-col gap-5">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-white text-3xl font-black tracking-tight">Gestión de Inventario</h2>
              <p className="text-slate-400 text-sm">Control de existencias, ubicación y valoración de piezas</p>
            </div>
            <button className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-primary/25">
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Nuevo Artículo</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full max-w-md group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-500 group-focus-within:text-white transition-colors">search</span>
              </div>
              <input 
                className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-card-dark text-white placeholder-slate-500 focus:ring-1 focus:ring-primary text-sm" 
                placeholder="Buscar por nombre, SKU o categoría..." 
                type="text" 
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {['Ubicación', 'Stock Bajo', 'Diamantes', 'Relojes', 'Filtros'].map(f => (
                <button key={f} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card-dark hover:bg-slate-700 text-white text-sm font-medium transition-colors border border-transparent hover:border-white/10">
                  {f === 'Stock Bajo' && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                  <span>{f}</span>
                  {['Ubicación', 'Filtros'].includes(f) && <span className="material-symbols-outlined text-[18px]">{f === 'Filtros' ? 'filter_list' : 'keyboard_arrow_down'}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryStat label="Valor Total" value="$845,200" />
            <SummaryStat label="Piezas en Stock" value="142" />
            <SummaryStat label="Stock Bajo" value="5" badge="Acción req." badgeColor="text-red-400 bg-red-500/10" />
            <SummaryStat label="Consignación" value="12" />
          </div>

          <div className="bg-card-dark border border-card-border rounded-xl overflow-hidden shadow-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/20 border-b border-card-border text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold w-1/3">Nombre del Artículo</th>
                  <th className="px-6 py-4 font-bold">Tipo</th>
                  <th className="px-6 py-4 font-bold">Ubicación</th>
                  <th className="px-6 py-4 font-bold text-center">Cantidad</th>
                  <th className="px-6 py-4 font-bold text-right">Valor Unitario</th>
                  <th className="px-6 py-4 font-bold text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/50">
                {items.map(item => (
                  <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <Link to={`/inventory/${item.sku}`} className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-lg border border-white/5 flex items-center justify-center shadow-inner shrink-0 ${item.color}`}>
                          <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-base leading-snug group-hover:text-primary transition-colors">{item.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-slate-500 text-xs">SKU: {item.sku}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                            <span className="text-slate-600 text-xs">{item.detail}</span>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-300 border border-white/5">{item.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <span className="material-symbols-outlined text-[18px] text-slate-500">location_on</span>
                        <span>{item.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-bold text-white text-base">{item.quantity}</span>
                        {item.alert && <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-medium text-white text-base">{item.value}</p>
                      <p className="text-[10px] text-slate-600">Coste: {item.cost}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 rounded-lg text-slate-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-card-border bg-black/5 flex items-center justify-between">
              <p className="text-sm text-slate-500">Mostrando 1-4 de 142 artículos</p>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 rounded-lg border border-card-border text-slate-500 hover:text-white text-sm transition-colors">Anterior</button>
                <button className="px-3 py-1.5 rounded-lg border border-card-border text-slate-500 hover:text-white text-sm transition-colors">Siguiente</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const SummaryStat: React.FC<{ label: string, value: string, badge?: string, badgeColor?: string }> = ({ label, value, badge, badgeColor }) => (
  <div className="p-4 rounded-xl bg-card-dark border border-card-border shadow-md">
    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
    <div className="flex items-center gap-2">
      <p className="text-white text-2xl font-bold tracking-tight">{value}</p>
      {badge && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badgeColor}`}>{badge}</span>}
    </div>
  </div>
);

export default Inventory;
