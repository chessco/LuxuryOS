import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const isLoginPage = location.pathname === "/login";
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    if (isLoginPage) {
        return <Outlet />;
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            <Sidebar
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                onLogout={() => {
                    localStorage.removeItem("token");
                    navigate("/login");
                }}
            />
            <div className="flex flex-1 flex-col h-full overflow-hidden bg-background border-l border-border shadow-2xl transition-all duration-500">
                <Header onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 scroll-smooth">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
