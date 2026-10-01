import React from 'react';
import { Link } from 'react-router-dom';

interface HeaderProps {
    onToggleMenu: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleMenu }) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = user.name || user.email || 'Usuario';
    const atelierSettings = JSON.parse(localStorage.getItem('atelier_settings') || '{}');
    const atelierName = (atelierSettings.name || 'CARED').toUpperCase();

    return (
        <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-border bg-header/80 backdrop-blur-xl px-6 sm:px-8 transition-colors">
            <div className="flex items-center gap-3">
                <button
                    onClick={onToggleMenu}
                    title="Alternar Menú Lateral"
                    className="flex size-10 items-center justify-center rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-sm active:scale-95 border border-border/50 cursor-pointer"
                >
                    <span className="material-symbols-outlined text-[22px]">menu</span>
                </button>
                <div className="flex items-center gap-2.5 pl-1">
                    <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-900 size-9 shadow-md shadow-indigo-500/20 ring-1 ring-indigo-500/30">
                        <span className="material-symbols-outlined text-white text-lg">diamond</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-foreground font-black text-base tracking-wider uppercase font-display leading-none">
                            {atelierName}
                        </span>
                        <span className="text-muted-foreground text-[8px] font-black tracking-[0.2em] uppercase mt-0.5">
                            Atelier • Luxury OS
                        </span>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="hidden max-w-md flex-1 lg:block mx-8">
                <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-indigo-500 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">search</span>
                    </span>
                    <input
                        className="w-full rounded-2xl border border-border/60 bg-muted/40 py-2.5 pl-11 pr-4 text-xs font-bold text-foreground placeholder-muted-foreground/70 focus:border-indigo-500 focus:bg-background focus:outline-none transition-all shadow-inner"
                        placeholder="Buscar por cliente, ID de pedido o pieza..."
                        type="text"
                    />
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3 ml-auto">
                <div className="flex items-center gap-3 mr-2">
                    <button className="relative flex size-10 items-center justify-center rounded-xl hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all group">
                        <span className="material-symbols-outlined text-[22px]">notifications</span>
                        <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-indigo-500 border-2 border-background shadow-sm"></span>
                    </button>
                    <Link to="/messages" className="flex size-10 items-center justify-center rounded-xl hover:bg-muted/60 text-yellow-500 hover:text-yellow-400 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-[22px] icon-fill">mail</span>
                    </Link>
                </div>

                <div className="h-8 w-px bg-border/60 mx-1 hidden md:block"></div>

                <div className="flex items-center gap-3 pl-1">
                    <div className="flex flex-col items-end hidden lg:flex">
                        <span className="text-foreground text-xs font-black tracking-tight leading-none uppercase">{userName}</span>
                    </div>
                    <div className="relative group cursor-pointer">
                        <div className="size-10 rounded-full border-2 border-border group-hover:border-indigo-500/50 transition-all overflow-hidden p-0.5 bg-muted shadow-inner flex items-center justify-center font-black text-xs text-indigo-500 uppercase">
                            {userName.substring(0, 2)}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-500 border-2 border-background rounded-full shadow-lg"></div>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            window.location.href = '/login';
                        }}
                        className="flex size-9 items-center justify-center rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all ml-1"
                        title="Cerrar Sesión"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
