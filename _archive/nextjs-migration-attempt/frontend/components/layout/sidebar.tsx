"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Panel de Control', icon: 'dashboard', path: '/dashboard' },
    { name: 'AI Assistant', icon: 'auto_awesome', path: '/ai-assistant', highlight: true },
    { name: 'Clientes', icon: 'group', path: '/clients' },
    { name: 'Pedidos', icon: 'shopping_bag', path: '/orders' },
    { name: 'Inventario', icon: 'inventory_2', path: '/inventory' },
    { name: 'Finanzas', icon: 'attach_money', path: '/finance' },
  ];

  return (
    <aside className="hidden w-72 flex-col border-r border-zinc-800 bg-zinc-950 p-4 lg:flex shadow-2xl z-20 shrink-0">
      <div className="flex items-center gap-3 px-2 py-4 mb-8">
        <div className="flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-900 size-10 shadow-lg shadow-indigo-500/20">
          <span className="material-symbols-outlined text-white text-xl">diamond</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-white text-lg font-bold leading-none tracking-tight">Luxury OS</h1>
          <p className="text-zinc-500 text-[10px] font-medium tracking-widest mt-1 uppercase">Business Suite</p>
        </div>
      </div>

      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative
                ${isActive
                  ? 'bg-white text-black shadow-lg shadow-white/5'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}
                ${item.highlight && !isActive ? 'text-indigo-400' : ''}
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

      <div className="mt-auto border-t border-zinc-900 pt-4">
        <Link
          href="/settings"
          className={`
            flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
            ${pathname === '/settings' ? 'bg-white text-black' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}
          `}
        >
          <span className="material-symbols-outlined">settings</span>
          <p className="text-sm font-medium">Configuración</p>
        </Link>

        <div
          className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900/50 group cursor-pointer hover:bg-zinc-800 transition-all duration-300"
          onClick={onLogout}
        >
          <div
            className="size-8 rounded-full bg-cover bg-center ring-2 ring-zinc-800"
            style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAzcXse7JRDQ58nzMiIYihXvpMaecUxV1Mjj_3REf6kAthSbPgeLN4q6QNXxOEV09litB9PWtVUC0zeWhPg6z2__tYVn-aGW4N2LZGHlazQJLI2JSIOpW_D7pTDjkGUeg6tT-EnyH4rtxW9_kXK_axP4abMRoNnq5eE-Crwi_fk99GPkn6IMmHBIdibw7hvcxOtp17DW09uCTBFHnK_vQh5wQ1i425x_h3rTIwc2VKekOY5CDoRpg8HVgdrhSga4J7JkyMbru3M0ho')` }}
          />
          <div className="overflow-hidden flex-1">
            <p className="truncate text-xs font-bold text-white">Mateo R.</p>
            <p className="truncate text-xs text-zinc-500">Atelier Manager</p>
          </div>
          <span className="material-symbols-outlined text-zinc-600 text-sm group-hover:text-red-400 transition-colors">logout</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
