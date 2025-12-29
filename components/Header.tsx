
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-card-border bg-[#111318]/90 backdrop-blur px-8">
      <div className="flex items-center gap-4 lg:hidden">
        <button className="text-slate-400 hover:text-white">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="text-white font-bold text-lg">Luxury OS</span>
      </div>
      
      {/* Search */}
      <div className="hidden max-w-md flex-1 lg:block">
        <div className="relative group">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </span>
          <input 
            className="w-full rounded-lg border border-card-border bg-[#1e2430] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all shadow-sm" 
            placeholder="Buscar pedido, cliente o SKU..." 
            type="text" 
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-6 ml-auto">
        <div className="flex items-center gap-2">
          <button className="relative flex size-10 items-center justify-center rounded-lg hover:bg-card-border/50 text-slate-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500 border-2 border-[#111318]"></span>
          </button>
          <button className="flex size-10 items-center justify-center rounded-lg hover:bg-card-border/50 text-slate-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[22px]">mail</span>
          </button>
        </div>
        <div className="h-8 w-px bg-card-border mx-2 hidden md:block"></div>
        <button className="hidden md:flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all active:scale-95">
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Nuevo Pedido</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
