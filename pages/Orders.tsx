
import React from 'react';
import { Link } from 'react-router-dom';

const columns = [
  { id: 'leads', name: 'Interés / Lead', color: 'bg-slate-500', count: 3 },
  { id: 'quotes', name: 'Cotización Enviada', color: 'bg-indigo-400', count: 1 },
  { id: 'approved', name: 'Aprobado / Anticipo', color: 'bg-emerald-400', count: 2 },
  { id: 'production', name: 'En Producción', color: 'bg-primary', count: 4, focus: true },
  { id: 'qc', name: 'Control de Calidad', color: 'bg-purple-400', count: 1 },
];

const Orders: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark">
      <header className="bg-background-dark/80 backdrop-blur-md border-b border-card-border shrink-0 z-10">
        <div className="px-6 py-5 flex flex-col gap-5">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-white text-3xl font-black tracking-tight">Tablero de Órdenes</h2>
              <p className="text-slate-400 text-sm">Gestión visual del flujo de producción y ventas</p>
            </div>
            <button className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-primary/25">
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Nueva Orden</span>
            </button>
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full max-w-md group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-500 group-focus-within:text-white transition-colors">search</span>
              </div>
              <input 
                className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-card-dark text-white placeholder-slate-500 focus:ring-1 focus:ring-primary text-sm transition-all" 
                placeholder="Buscar por cliente, ID de orden o pieza..." 
                type="text" 
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {['Esta Semana', 'Prioridad Alta', 'Anillos', 'Más filtros'].map(f => (
                <button key={f} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card-dark hover:bg-slate-700 text-white text-sm font-medium transition-colors border border-transparent hover:border-white/10 whitespace-nowrap">
                  <span>{f}</span>
                  <span className="material-symbols-outlined text-[18px]">
                    {f === 'Más filtros' ? 'filter_list' : 'keyboard_arrow_down'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-auto p-6 scroll-smooth">
        <div className="flex h-full gap-6 min-w-max">
          {columns.map(col => (
            <KanbanColumn key={col.id} {...col} />
          ))}
          
          {/* Last Column Example - Listo para Entrega */}
          <div className="flex flex-col w-[320px] h-full">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
                <h3 className="text-white font-bold text-sm">Listo para Entrega</h3>
                <span className="text-slate-400 text-xs ml-1 font-medium bg-card-dark px-2 py-0.5 rounded-full border border-card-border">1</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
              <KanbanCard 
                id="7835"
                client="Valeria S." 
                item="Anillo Zafiro Rosa" 
                value="$6,200" 
                status="Listo"
                statusType="success"
                avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuBUbztMJQn-5cC_9xLtb_12n0svWtfoU084RVCdiDr_Mtj2XKj_7uvtMyO2gurhuNi6Nc1Cnjt35jv7hp5bxeFyCq_yWZVqRcF-MS_VYxpl6vFmXaxQTeD0O6R4XkSus6xar9jSxlGciThC9W6wFBHN2AVR3forL1OWNsZSGdtWe9KTzzghlWPb4ByW9tORwUZJzNctrFeGrb_yZEuXOmiLVaTvIaMjvqUPtuH2Fd8zvQ1DQHzhB9efFeqxQwEUvLXlngrBlV2OHXg"
                isPaid
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const KanbanColumn: React.FC<{ id: string, name: string, color: string, count: number, focus?: boolean }> = ({ id, name, color, count, focus }) => (
  <div className={`flex flex-col w-[320px] h-full ${focus ? 'bg-primary/5 rounded-xl border border-dashed border-primary/20 p-2' : ''}`}>
    <div className={`flex items-center justify-between mb-4 px-2 ${focus ? 'mt-1' : ''}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
        <h3 className={`font-bold text-sm ${focus ? 'text-primary' : 'text-white'}`}>{name}</h3>
        <span className="text-slate-400 text-xs ml-1 font-medium bg-card-dark px-2 py-0.5 rounded-full border border-card-border">{count}</span>
      </div>
      <button className="text-slate-500 hover:text-white"><span className="material-symbols-outlined text-[20px]">add</span></button>
    </div>
    <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
      {id === 'leads' && (
        <>
          <KanbanCard id="8902" client="Sofía Martínez" item="Solitario Diamante 2ct" value="$5,000" status="Nuevo" statusType="new" initial="SM" initialColor="bg-purple-600" />
          <KanbanCard id="8903" client="Roberto Gomez" item="Reloj Vintage" value="$8,500" avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuCoUHjghtrVs3O9E1cIXxAPRQ7GhHfAhHH4CrjmluogcV7IC6XgtSk7lcVxiSnpFMeSvZartTrJcZgk9Ld532ZJNuXTwDpE-5_TvAwplOiGmDP4UPXcx-Bb5qtCEiIy3Wi1qBZMhrUOKt-Uehf8JhkvQxYjfSlrrDzXCHYVvq4GY7GPT6HWn3NLmfrdkIRfoxwvlG_VM-97evfJ30crX2Qaq8x75caC5gyW_EO2qPWqKuziIE_ie_ALET0vkfpnlf4MS5lw03rCmFg" />
        </>
      )}
      {id === 'production' && (
        <KanbanCard 
          id="7829"
          client="Diego Alvarez" 
          item="Collar Tennis 10ct" 
          value="$45,000" 
          status="Urgente" 
          statusType="urgent" 
          progress={65} 
          initial="DA" 
          initialColor="bg-amber-600"
          isPaid
          isBig
        />
      )}
    </div>
  </div>
);

const KanbanCard: React.FC<{ 
  id: string,
  client: string, 
  item: string, 
  value: string, 
  status?: string, 
  statusType?: 'new' | 'urgent' | 'success' | 'normal', 
  initial?: string, 
  initialColor?: string, 
  avatar?: string,
  progress?: number,
  isPaid?: boolean,
  isBig?: boolean
}> = ({ id, client, item, value, status, statusType, initial, initialColor, avatar, progress, isPaid, isBig }) => (
  <Link 
    to={`/orders/${id}`}
    className={`group flex flex-col gap-3 rounded-xl bg-card-dark p-4 border border-card-border hover:border-primary/50 transition-all cursor-pointer relative hover:-translate-y-1 shadow-sm ${isBig ? 'p-5 border-l-4 border-l-primary' : ''}`}
  >
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-3">
        {avatar ? (
          <img className="h-9 w-9 rounded-full object-cover border border-card-border" src={avatar} alt={client} />
        ) : (
          <div className={`h-9 w-9 rounded-full ${initialColor} flex items-center justify-center text-white text-xs font-bold shadow-lg`}>{initial}</div>
        )}
        <div>
          <h4 className="text-white font-bold text-sm leading-tight">{client}</h4>
          <p className="text-slate-400 text-xs">{item}</p>
        </div>
      </div>
      <button className="text-slate-700 group-hover:text-slate-400 transition-colors"><span className="material-symbols-outlined text-[20px]">more_horiz</span></button>
    </div>
    
    <div className={`grid ${isBig ? 'grid-cols-2 bg-black/20 rounded-lg p-2' : 'grid-cols-2'} gap-2 py-1`}>
      <div>
        <p className="text-slate-600 text-[10px] uppercase font-bold tracking-wider">Valor</p>
        <p className={`text-white font-medium ${isBig ? 'text-lg font-bold' : 'text-sm'}`}>{value}</p>
      </div>
      {isBig && (
        <div>
          <p className="text-slate-600 text-[10px] uppercase font-bold tracking-wider">Margen Est.</p>
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-yellow-500 text-[16px]">trending_up</span>
            <p className="text-yellow-500 font-bold">42%</p>
          </div>
        </div>
      )}
    </div>

    {(status || progress || isPaid) && (
      <div className="flex flex-col gap-2 pt-3 border-t border-card-border/50">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 ${statusType === 'urgent' ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
            {status && (
              <>
                <span className="material-symbols-outlined text-[16px]">{statusType === 'urgent' ? 'flag' : 'schedule'}</span>
                <span className="text-xs font-bold uppercase">{status}</span>
              </>
            )}
          </div>
          {isPaid && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/20">Pagado</span>
          )}
        </div>
        {progress !== undefined && (
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        )}
      </div>
    )}
  </Link>
);

export default Orders;
