import React from 'react';
import { Link } from 'react-router-dom';

interface HeaderProps {
    onToggleMenu: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleMenu }) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = user.name || 'Mateo R.';
    const userRole = user.role === 'TENANT_ADMIN' ? 'Atelier Manager' : (user.role === 'TENANT_USER' ? 'Equipo de Ventas' : 'Sistema');

    return (
        <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl px-8">
            <div className="flex items-center gap-4 lg:hidden">
                <button
                    onClick={onToggleMenu}
                    className="text-zinc-400 hover:text-white transition-colors p-2 -ml-2 rounded-lg hover:bg-zinc-800"
                >
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
            <div className="flex items-center gap-3 ml-auto">
                <div className="flex items-center gap-4 mr-4">
                    <button className="relative flex size-10 items-center justify-center rounded-xl hover:bg-zinc-900 text-zinc-500 hover:text-white transition-all group">
                        <span className="material-symbols-outlined text-[24px]">notifications</span>
                        <span className="absolute right-2 top-2 size-2 rounded-full bg-indigo-500 border-2 border-zinc-950 shadow-sm"></span>
                    </button>
                    <Link to="/messages" className="flex size-10 items-center justify-center rounded-xl hover:bg-zinc-900 text-yellow-500 hover:text-yellow-400 transition-all shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                        <span className="material-symbols-outlined text-[24px] icon-fill">mail</span>
                    </Link>
                </div>

                <div className="h-8 w-px bg-zinc-900 mx-2 hidden md:block"></div>

                <div className="flex items-center gap-4 pl-2">
                    <div className="flex flex-col items-end hidden lg:block">
                        <span className="text-white text-[13px] font-black tracking-tight leading-none">{userName}</span>
                    </div>
                    <div className="relative group cursor-pointer">
                        <div className="size-11 rounded-full border-2 border-zinc-900 group-hover:border-zinc-700 transition-all overflow-hidden p-0.5 bg-zinc-900/50 shadow-inner">
                            <img
                                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                                alt={userName}
                                className="size-full rounded-full object-cover grayscale brightness-90 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700"
                            />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 size-3.5 bg-emerald-500 border-2 border-zinc-950 rounded-full shadow-lg"></div>
                    </div>
                    <button className="flex size-10 items-center justify-center rounded-xl hover:bg-zinc-900 text-zinc-600 hover:text-white transition-all ml-1">
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
