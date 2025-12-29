"use client";

import React from 'react';
import Link from 'next/link';

const columns = [
  { id: 'leads', name: 'Interés / Lead', color: 'bg-zinc-500', count: 3 },
  { id: 'quotes', name: 'Cotización Enviada', color: 'bg-indigo-400', count: 1 },
  { id: 'approved', name: 'Aprobado / Anticipo', color: 'bg-emerald-400', count: 2 },
  { id: 'production', name: 'En Producción', color: 'bg-white', count: 4, focus: true },
  { id: 'qc', name: 'Control de Calidad', color: 'bg-purple-400', count: 1 },
];

const Orders: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
      <header className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 shrink-0 z-10 mb-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-white text-3xl font-black tracking-tight">Tablero de Órdenes</h2>
              <p className="text-zinc-500 text-sm">Gestión visual del flujo de producción y ventas</p>
            </div>
            <button className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-white/5">
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Nueva Orden</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
            <div className="relative w-full max-w-md group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-zinc-500 group-focus-within:text-white transition-colors">search</span>
              </div>
              <input
                className="block w-full pl-10 pr-3 py-3 border border-zinc-900 rounded-xl bg-zinc-900/50 text-white placeholder-zinc-500 focus:border-zinc-700 outline-none text-sm transition-all"
                placeholder="Buscar por cliente, ID de orden o pieza..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {['Esta Semana', 'Prioridad Alta', 'Anillos', 'Más filtros'].map(f => (
                <button key={f} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all border border-transparent hover:border-zinc-800 whitespace-nowrap">
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

      <main className="flex-1 overflow-x-auto pb-6 scroll-smooth">
        <div className="flex h-full gap-8 min-w-max">
          {columns.map(col => (
            <KanbanColumn key={col.id} {...col} />
          ))}

          {/* Last Column Example - Listo para Entrega */}
          <div className="flex flex-col w-[320px] h-full">
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
                <h3 className="text-white font-bold text-sm tracking-tight">Listo para Entrega</h3>
                <span className="text-zinc-500 text-xs ml-1 font-bold bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800 tracking-widest">1</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
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
  <div className={`flex flex-col w-[320px] h-full ${focus ? 'bg-white/5 rounded-2xl border border-dashed border-white/10 p-2' : ''}`}>
    <div className={`flex items-center justify-between mb-6 px-2 ${focus ? 'mt-2' : ''}`}>
      <div className="flex items-center gap-3">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
        <h3 className={`font-bold text-sm tracking-tight ${focus ? 'text-white underline underline-offset-8' : 'text-zinc-400'}`}>{name}</h3>
        <span className="text-zinc-500 text-xs ml-1 font-bold bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800 tracking-widest">{count}</span>
      </div>
      <button className="text-zinc-600 hover:text-white transition-colors"><span className="material-symbols-outlined text-[20px]">add</span></button>
    </div>
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
      {id === 'leads' && (
        <>
          <KanbanCard id="8902" client="Sofía Martínez" item="Solitario Diamante 2ct" value="$5,000" status="Nuevo" statusType="new" initial="SM" initialColor="bg-zinc-800 text-zinc-400" />
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
          initialColor="bg-indigo-950 text-indigo-400"
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
    href={`/orders/${id}`}
    className={`group flex flex-col gap-4 rounded-2xl bg-zinc-900/40 p-5 border border-zinc-900 hover:border-zinc-700 transition-all cursor-pointer relative hover:-translate-y-1 shadow-sm backdrop-blur-sm ${isBig ? 'border-l-4 border-l-white ring-1 ring-white/5' : ''}`}
  >
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-3">
        {avatar ? (
          <img className="h-10 w-10 rounded-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all border border-zinc-800 shadow-xl" src={avatar} alt={client} />
        ) : (
          <div className={`h-10 w-10 rounded-full ${initialColor} flex items-center justify-center text-[10px] font-black uppercase tracking-widest border border-zinc-800 shadow-xl`}>{initial}</div>
        )}
        <div>
          <h4 className="text-white font-bold text-sm leading-tight tracking-tight">{client}</h4>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">{item}</p>
        </div>
      </div>
      <button className="text-zinc-700 group-hover:text-zinc-400 transition-colors"><span className="material-symbols-outlined text-[20px]">more_horiz</span></button>
    </div>

    <div className={`grid ${isBig ? 'grid-cols-2 bg-white/5 rounded-xl p-3 border border-white/5' : 'grid-cols-2'} gap-2`}>
      <div>
        <p className="text-zinc-600 text-[9px] uppercase font-black tracking-[0.2em]">Valor</p>
        <p className={`text-white font-bold ${isBig ? 'text-xl' : 'text-sm'}`}>{value}</p>
      </div>
      {isBig && (
        <div>
          <p className="text-zinc-600 text-[9px] uppercase font-black tracking-[0.2em]">Margen Est.</p>
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-indigo-400 text-[16px]">trending_up</span>
            <p className="text-indigo-400 font-bold text-sm">42%</p>
          </div>
        </div>
      )}
    </div>

    {(status || progress || isPaid) && (
      <div className="flex flex-col gap-3 pt-4 border-t border-zinc-900/50">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 ${statusType === 'urgent' ? 'text-red-400 animate-pulse' : 'text-zinc-500'}`}>
            {status && (
              <>
                <span className="material-symbols-outlined text-[16px]">{statusType === 'urgent' ? 'flag' : 'schedule'}</span>
                <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
              </>
            )}
          </div>
          {isPaid && (
            <span className="px-2.5 py-1 rounded bg-zinc-800 text-white text-[9px] font-black uppercase tracking-widest border border-zinc-700">Pagado</span>
          )}
        </div>
        {progress !== undefined && (
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden p-[1px]">
            <div className="bg-white h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all duration-1000" style={{ width: `${progress}%` }}></div>
          </div>
        )}
      </div>
    )}
  </Link>
);

export default Orders;
