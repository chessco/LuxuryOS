import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex bg-black text-white min-h-screen">
            <Sidebar />
            <main className="flex-1 p-10 overflow-auto">
                {children}
            </main>
        </div>
    );
}
