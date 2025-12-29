import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl px-8">
            <div className="flex items-center gap-4 lg:hidden">
                <button className="text-zinc-400 hover:text-white transition-colors">
                    <span className="material-symbols-outlined">menu</span>
                </button>
                <span className="text-white font-bold text-lg">Luxury OS</span>
            </div>

            {/* Search */}
            <div className="hidden max-w-md flex-1 lg:block">
                <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors">
                        <span className="material-symbols-outlined text-[20px]">search</span>
                    </span>
                    <input
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-zinc-700 focus:outline-none transition-all shadow-sm"
                        placeholder="Buscar pedido, cliente o SKU..."
                        type="text"
                    />
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-6 ml-auto">
                <div className="flex items-center gap-2">
                    <button className="relative flex size-10 items-center justify-center rounded-xl hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all">
                        <span className="material-symbols-outlined text-[22px]">notifications</span>
                        <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-indigo-500 border-2 border-zinc-950"></span>
                    </button>
                    <button className="flex size-10 items-center justify-center rounded-xl hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all">
                        <span className="material-symbols-outlined text-[22px]">mail</span>
                    </button>
                </div>
                <div className="h-8 w-px bg-zinc-900 mx-2 hidden md:block"></div>
            </div>
        </header>
    );
};

export default Header;
