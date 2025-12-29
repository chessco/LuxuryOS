"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
    const pathname = usePathname();

    const menuItems = [
        { name: "Dashboard", path: "/dashboard", icon: "📊" },
        { name: "Kanban Operativo", path: "/kanban", icon: "📋" },
        { name: "Clientes", path: "/clients", icon: "👥" },
        { name: "Configuración", path: "/settings", icon: "⚙️" },
    ];

    return (
        <aside className="w-64 bg-zinc-950 border-r border-zinc-900 min-h-screen flex flex-col">
            <div className="p-8">
                <h2 className="text-xl font-light tracking-[0.2em] uppercase">Luxury OS</h2>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1">Luxe Atelier</p>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {menuItems.map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all ${pathname === item.path
                                ? "bg-zinc-900 text-white border-l-2 border-white"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
                            }`}
                    >
                        <span>{item.icon}</span>
                        <span className="tracking-wide">{item.name}</span>
                    </Link>
                ))}
            </nav>

            <div className="p-6 border-t border-zinc-900">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs">
                        JD
                    </div>
                    <div>
                        <p className="text-xs font-medium">Luxe Admin</p>
                        <p className="text-[10px] text-zinc-600">Premium Plan</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
