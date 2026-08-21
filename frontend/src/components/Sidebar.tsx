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
    const userName = user.name || user.email || 'Usuario';
    const { variant, mode, toggleMode } = useTheme();
    const userRole = user.role === 'TENANT_ADMIN' ? 'Atelier Manager' : (user.role === 'TENANT_USER' ? 'Equipo de Ventas' : 'Sistema');

    const navigation = [
        {
            title: 'Principal',
            items: [
                { name: 'Panel de Control', icon: 'grid_view', path: '/dashboard' },
                { name: 'AI Assistant', icon: 'auto_awesome', path: '/ai-assistant', highlight: true },
                { name: 'Mensajes', icon: 'forum', path: '/messages' },
            ]
        },
        {
            title: 'Operaciones',
            items: [
                { name: 'Reparaciones', icon: 'handyman', path: '/orders?type=REPAIR' },
                { name: 'Fabricación', icon: 'precision_manufacturing', path: '/orders?type=MANUFACTURE' },
                { name: 'Apartados', icon: 'loyalty', path: '/orders?type=LAYAWAY' },
                { name: 'Pedidos', icon: 'receipt_long', path: '/orders' },
                { name: 'Inventario', icon: 'diamond', path: '/inventory' },
                { name: 'Clientes', icon: 'person_search', path: '/clients' },
                { name: 'Finanzas', icon: 'account_balance_wallet', path: '/finance' },
            ]
        },
        {
            title: 'Fila y Turnos',
            items: [
                { name: 'Gestión de Turnos', icon: 'reorder', path: '/staff/queue' },
                { name: 'Entregas / Pickup', icon: 'local_shipping', path: '/pickup' },
                { name: 'Pantalla Pública', icon: 'monitor', path: '/screen' },
                { name: 'Kiosko de Turnos', icon: 'sensor_window', path: '/kiosk' },
            ]
        }
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
                fixed inset-y-0 left-0 z-30 w-72 flex-col border-r border-border bg-sidebar p-4 shadow-2xl transition-all duration-300 ease-in-out
                lg:static lg:flex lg:translate-x-0 lg:shadow-none lg:z-auto
                ${isOpen ? 'translate-x-0 flex' : '-translate-x-full lg:flex'}
            `}>
                <div className="flex items-center justify-between mb-8 px-2 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-900 size-10 shadow-lg shadow-indigo-500/20">
                            <span className="material-symbols-outlined text-white text-xl">diamond</span>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-foreground text-lg font-bold leading-none tracking-tight">Luxury OS</h1>
                            <p className="text-muted-foreground text-[10px] font-medium tracking-widest mt-1 uppercase">Business Suite</p>
                        </div>
                    </div>
                    {/* Close button for mobile */}
                    <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <nav className="flex flex-col gap-6 flex-1 overflow-y-auto no-scrollbar pb-6">
                    {navigation.map((section) => (
                        <div key={section.title} className="flex flex-col gap-1">
                            <h3 className="px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">
                                {section.title}
                            </h3>
                            <div className="flex flex-col gap-1">
                                {section.items.map((item) => {
                                    const isActive = item.path.includes('?')
                                        ? location.search.includes(item.path.split('?')[1])
                                        : pathname === item.path && !location.search;

                                    const activeClass = variant === 'pitaya'
                                        ? 'bg-foreground text-background shadow-xl scale-[1.02]'
                                        : 'bg-black/5 dark:bg-white/5 text-foreground font-semibold'; // Notion style: clean, flat, subtle

                                    const inactiveClass = 'text-sidebar-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground';

                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => onClose()} // Close on navigate
                                            className={`
                                                flex items-center gap-3 px-3 py-2 rounded-[6px] transition-colors duration-150 group relative
                                                ${isActive ? activeClass : inactiveClass}
                                                ${item.highlight && !isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}
                                            `}
                                        >
                                            <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 group-hover:scale-110 ${item.highlight ? 'icon-fill' : ''}`}>
                                                {item.icon}
                                            </span>
                                            <p className="text-sm">{item.name}</p>
                                            {item.highlight && !isActive && (
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="mt-auto border-t border-border pt-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <button
                            onClick={toggleMode}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-muted text-sidebar-foreground hover:text-foreground transition-all text-[10px] font-black uppercase tracking-widest border border-border/50"
                        >
                            <span className="material-symbols-outlined text-sm">
                                {mode === 'light' ? 'dark_mode' : 'light_mode'}
                            </span>
                            {mode === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
                        </button>
                    </div>

                    <Link
                        to="/settings"
                        onClick={() => onClose()}
                        className={`
                            flex items-center gap-3 px-3 py-2 rounded-[6px] transition-colors duration-150
                            ${pathname === '/settings'
                                ? (variant === 'pitaya' ? 'bg-foreground text-background shadow-xl scale-[1.02]' : 'bg-black/5 dark:bg-white/5 text-foreground font-semibold')
                                : 'text-sidebar-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground'}
                        `}
                    >
                        <span className="material-symbols-outlined text-[20px]">settings</span>
                        <p className="text-sm">Configuración</p>
                    </Link>

                    <div
                        className="mt-2 flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 group cursor-pointer hover:bg-muted/60 transition-all duration-300 border border-border/20"
                        onClick={onLogout}
                    >
                        <div
                            className="size-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black text-xs ring-2 ring-border shrink-0 uppercase"
                        >
                            {userName.substring(0, 2)}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="truncate text-xs font-bold text-foreground">{userName}</p>
                        </div>
                        <span className="material-symbols-outlined text-muted-foreground text-sm group-hover:text-red-500 transition-colors">logout</span>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
