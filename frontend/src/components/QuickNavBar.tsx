import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface QuickNavItem {
    name: string;
    icon: string;
    path: string;
    type?: string;
}

const QUICK_NAV_ITEMS: QuickNavItem[] = [
    { name: 'Reparaciones', icon: 'handyman', path: '/orders?type=REPAIR', type: 'REPAIR' },
    { name: 'Fabricación', icon: 'diamond', path: '/orders?type=MANUFACTURE', type: 'MANUFACTURE' },
    { name: 'Diseño', icon: 'draw', path: '/orders?type=DESIGN', type: 'DESIGN' },
    { name: 'Laser', icon: 'flare', path: '/orders?type=LASER', type: 'LASER' },
    { name: 'Reportes', icon: 'analytics', path: '/reports' },
];

export const QuickNavBar: React.FC = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const currentType = queryParams.get('type');

    const isItemActive = (item: QuickNavItem) => {
        if (item.type) {
            return location.pathname === '/orders' && currentType === item.type;
        }
        if (item.path === '/reports') {
            return location.pathname.startsWith('/reports');
        }
        return location.pathname === item.path;
    };

    return (
        <nav
            aria-label="Menú Rápido Persistente"
            className="z-30 w-full shrink-0 border-b border-border/70 bg-card/85 dark:bg-card/70 backdrop-blur-md shadow-xs transition-colors"
        >
            <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar w-full py-0.5">
                    {QUICK_NAV_ITEMS.map((item) => {
                        const active = isItemActive(item);
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`group relative flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-xs font-black uppercase tracking-wider transition-all duration-150 select-none whitespace-nowrap active:scale-95 shrink-0 ${
                                    active
                                        ? 'bg-foreground text-background shadow-md ring-1 ring-foreground/20'
                                        : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 hover:border-border'
                                }`}
                            >
                                <span
                                    className={`material-symbols-outlined text-[18px] sm:text-[20px] transition-transform duration-150 group-hover:scale-110 ${
                                        active ? 'text-background' : 'text-muted-foreground group-hover:text-foreground'
                                    }`}
                                >
                                    {item.icon}
                                </span>
                                <span>{item.name}</span>
                                {active && (
                                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5"></span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
};

export default QuickNavBar;
