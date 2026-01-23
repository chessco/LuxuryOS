import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
    onLogout: () => void;
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout, isOpen, onClose }) => {
    const location = useLocation();
    const pathname = location.pathname;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = user.name || 'Mateo R.';
    const { theme, toggleTheme } = useTheme();
    const userRole = user.role === 'TENANT_ADMIN' ? 'Atelier Manager' : (user.role === 'TENANT_USER' ? 'Equipo de Ventas' : 'Sistema');

    const navItems = [
        { name: 'Panel de Control', icon: 'grid_view', path: '/dashboard' },
        { name: 'AI Assistant', icon: 'auto_awesome', path: '/ai-assistant', highlight: true },
        { name: 'Mensajes', icon: 'forum', path: '/messages' },
        { name: 'Pedidos', icon: 'receipt_long', path: '/orders' },
        // Operational Flows
        { name: 'Reparaciones', icon: 'handyman', path: '/orders?type=REPAIR' },
        { name: 'Fabricación', icon: 'precision_manufacturing', path: '/orders?type=MANUFACTURE' },
        { name: 'Apartados', icon: 'loyalty', path: '/orders?type=LAYAWAY' },
        { name: 'Clientes', icon: 'person_search', path: '/clients' },
        { name: 'Inventario', icon: 'diamond', path: '/inventory' },
        { name: 'Finanzas', icon: 'account_balance_wallet', path: '/finance' },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden animate-in fade-in duration-300"
                    onClick={onClose}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-30 w-72 flex-col border-r border-zinc-200 bg-white p-4 shadow-2xl transition-transform duration-300 ease-in-out
                dark:border-zinc-800 dark:bg-zinc-950
                lg:static lg:flex lg:translate-x-0 lg:shadow-none lg:z-auto
                ${isOpen ? 'translate-x-0 flex' : '-translate-x-full lg:flex'}
            `}>
                <div className="flex items-center justify-between mb-8 px-2 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-900 size-10 shadow-lg shadow-indigo-500/20">
                            <span className="material-symbols-outlined text-white text-xl">diamond</span>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-zinc-900 dark:text-white text-lg font-bold leading-none tracking-tight">Luxury OS</h1>
                            <p className="text-zinc-400 dark:text-zinc-500 text-[10px] font-medium tracking-widest mt-1 uppercase">Business Suite</p>
                        </div>
                    </div>
                    {/* Close button for mobile */}
                    <button onClick={onClose} className="lg:hidden text-zinc-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <nav className="flex flex-col gap-2 flex-1">
                    {navItems.map((item) => {
                        const isActive = item.path.includes('?')
                            ? location.search.includes(item.path.split('?')[1])
                            : pathname === item.path && !location.search;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => onClose()} // Close on navigate
                                className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative
                    ${isActive
                                        ? 'bg-zinc-100 text-zinc-900 shadow-sm dark:bg-white dark:text-black dark:shadow-white/5'
                                        : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'}
                    ${item.highlight && !isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}
                  `}
                            >
                                <span className={`material-symbols-outlined transition-transform duration-300 group-hover:scale-110 ${item.highlight ? 'icon-fill' : ''}`}>
                                    {item.icon}
                                </span>
                                <p className="text-sm font-medium">{item.name}</p>
                                {item.highlight && !isActive && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto border-t border-zinc-100 dark:border-zinc-900 pt-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <button
                            onClick={toggleTheme}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                        >
                            <span className="material-symbols-outlined text-sm">
                                {theme === 'light' ? 'dark_mode' : 'light_mode'}
                            </span>
                            {theme === 'light' ? 'Oscuro' : 'Claro'}
                        </button>
                    </div>

                    <Link
                        to="/settings"
                        onClick={() => onClose()}
                        className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                ${pathname === '/settings' ? 'bg-zinc-100 text-zinc-900 dark:bg-white dark:text-black' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'}
              `}
                    >
                        <span className="material-symbols-outlined">settings</span>
                        <p className="text-sm font-medium">Configuración</p>
                    </Link>

                    <div
                        className="mt-2 flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/50 group cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-all duration-300"
                        onClick={onLogout}
                    >
                        <div
                            className="size-10 rounded-full bg-cover bg-center ring-2 ring-zinc-200 dark:ring-zinc-800 shrink-0"
                            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80')` }}
                        />
                        <div className="overflow-hidden flex-1">
                            <p className="truncate text-xs font-bold text-zinc-900 dark:text-white">{userName}</p>
                        </div>
                        <span className="material-symbols-outlined text-zinc-400 dark:text-zinc-600 text-sm group-hover:text-red-500 transition-colors">logout</span>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
