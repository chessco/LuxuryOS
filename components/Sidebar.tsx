
import React from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const navItems = [
    { name: 'Panel de Control', icon: 'dashboard', path: '/dashboard' },
    { name: 'AI Assistant', icon: 'auto_awesome', path: '/ai-assistant', highlight: true },
    { name: 'Clientes', icon: 'group', path: '/clients' },
    { name: 'Pedidos', icon: 'shopping_bag', path: '/orders' },
    { name: 'Inventario', icon: 'inventory_2', path: '/inventory' },
    { name: 'Finanzas', icon: 'attach_money', path: '/finance' },
  ];

  return (
    <aside className="hidden w-72 flex-col border-r border-card-border bg-[#111318] p-4 lg:flex shadow-2xl z-20 shrink-0">
      <div className="flex items-center gap-3 px-2 py-4 mb-8">
        <div className="flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-900 size-10 shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-white text-xl">diamond</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-white text-lg font-bold leading-none tracking-tight font-display">Luxury OS</h1>
          <p className="text-slate-400 text-xs font-medium tracking-wide mt-1 uppercase">Business Suite</p>
        </div>
      </div>
      
      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative
              ${isActive 
                ? 'bg-primary/10 border-l-4 border-primary text-white shadow-[inset_0_0_20px_rgba(17,82,212,0.1)]' 
                : 'text-slate-400 hover:bg-card-border/50 hover:text-white'}
              ${item.highlight && !isActive ? 'text-indigo-300' : ''}
            `}
          >
            <span className={`material-symbols-outlined group-hover:scale-110 transition-transform ${item.highlight ? 'icon-fill' : ''}`}>
              {item.icon}
            </span>
            <p className="text-sm font-medium">{item.name}</p>
            {item.highlight && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-card-border pt-4">
        <NavLink
          to="/settings"
          className={({ isActive }) => `
            flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
            ${isActive ? 'bg-primary/10 text-white' : 'text-slate-400 hover:bg-card-border/50 hover:text-white'}
          `}
        >
          <span className="material-symbols-outlined">settings</span>
          <p className="text-sm font-medium">Configuración</p>
        </NavLink>
        
        <div className="mt-4 flex items-center gap-3 px-4 py-2 rounded-lg bg-card-border/30 group cursor-pointer hover:bg-card-border/50 transition-colors" onClick={onLogout}>
          <div 
            className="size-8 rounded-full bg-cover bg-center ring-2 ring-primary/20" 
            style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAzcXse7JRDQ58nzMiIYihXvpMaecUxV1Mjj_3REf6kAthSbPgeLN4q6QNXxOEV09litB9PWtVUC0zeWhPg6z2__tYVn-aGW4N2LZGHlazQJLI2JSIOpW_D7pTDjkGUeg6tT-EnyH4rtxW9_kXK_axP4abMRoNnq5eE-Crwi_fk99GPkn6IMmHBIdibw7hvcxOtp17DW09uCTBFHnK_vQh5wQ1i425x_h3rTIwc2VKekOY5CDoRpg8HVgdrhSga4J7JkyMbru3M0ho')` }}
          />
          <div className="overflow-hidden flex-1">
            <p className="truncate text-xs font-bold text-white">Mateo R.</p>
            <p className="truncate text-xs text-slate-400">Atelier Manager</p>
          </div>
          <span className="material-symbols-outlined text-slate-500 text-sm group-hover:text-red-400 transition-colors">logout</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
