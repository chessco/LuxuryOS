import React from 'react';
import { Link } from 'react-router-dom';

interface HeaderProps {
    onToggleMenu: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleMenu }) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = user.name || user.email || 'Usuario';
    const userRole = user.role === 'TENANT_ADMIN' ? 'Atelier Manager' : (user.role === 'TENANT_USER' ? 'Equipo de Ventas' : 'Sistema');

    return (
        <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-border bg-header/80 backdrop-blur-xl px-8 transition-colors">
            <div className="flex items-center gap-4 lg:hidden">
                <button
                    onClick={onToggleMenu}
                    className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-lg hover:bg-muted"
                >
                    <span className="material-symbols-outlined">menu</span>
                </button>
                <span className="text-foreground font-bold text-lg">Luxury OS</span>
            </div>

            {/* Search */}
            <div className="hidden max-w-md flex-1 lg:block">
                <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors">
                        <span className="material-symbols-outlined text-[20px]">search</span>
                    </span>
                    <input
                        className="w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
                        placeholder="Buscar pedido, cliente o SKU..."
                        type="text"
                    />
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3 ml-auto">
                <div className="flex items-center gap-4 mr-4">
                    <button className="relative flex size-10 items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all group">
                        <span className="material-symbols-outlined text-[24px]">notifications</span>
                        <span className="absolute right-2 top-2 size-2 rounded-full bg-indigo-500 border-2 border-background shadow-sm"></span>
                    </button>
                    <Link to="/messages" className="flex size-10 items-center justify-center rounded-xl hover:bg-muted text-yellow-500 hover:text-yellow-400 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-[24px] icon-fill">mail</span>
                    </Link>
                </div>

                <div className="h-8 w-px bg-border mx-2 hidden md:block"></div>

                <div className="flex items-center gap-4 pl-2">
                    <div className="flex flex-col items-end hidden lg:block">
                        <span className="text-foreground text-[13px] font-black tracking-tight leading-none">{userName}</span>
                    </div>
                    <div className="relative group cursor-pointer">
                        <div className="size-11 rounded-full border-2 border-border group-hover:border-indigo-500/50 transition-all overflow-hidden p-0.5 bg-muted shadow-inner flex items-center justify-center font-black text-xs text-indigo-500 uppercase">
                            {userName.substring(0, 2)}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 size-3.5 bg-emerald-500 border-2 border-background rounded-full shadow-lg"></div>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            window.location.href = '/login';
                        }}
                        className="flex size-10 items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all ml-1"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
