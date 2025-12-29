"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-zinc-950">
            <Sidebar onLogout={() => {
                localStorage.removeItem("token");
                window.location.href = "/login";
            }} />
            <div className="flex flex-1 flex-col h-full overflow-hidden bg-zinc-950 border-l border-zinc-900 shadow-2xl">
                <Header />
                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <div className="max-w-7xl mx-auto p-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
