import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const isLoginPage = location.pathname === "/login";

    const [isSidebarOpen, setIsSidebarOpen] = React.useState<boolean>(() => {
        const saved = localStorage.getItem("sidebar_open");
        return saved !== null ? JSON.parse(saved) : true;
    });

    if (isLoginPage) {
        return <Outlet />;
    }

    const toggleSidebar = () => {
        setIsSidebarOpen((prev: boolean) => {
            const next = !prev;
            localStorage.setItem("sidebar_open", JSON.stringify(next));
            return next;
        });
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => {
                    setIsSidebarOpen(false);
                    localStorage.setItem("sidebar_open", JSON.stringify(false));
                }}
                onLogout={() => {
                    localStorage.removeItem("token");
                    navigate("/login");
                }}
            />
            <div className="flex flex-1 flex-col h-full overflow-hidden bg-background border-l border-border shadow-2xl transition-all duration-300">
                <Header onToggleMenu={toggleSidebar} />
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 scroll-smooth">
                    <div className="w-full max-w-[1700px] mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
