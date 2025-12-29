"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("admin@luxuryos.com");
    const [password, setPassword] = useState("luxury123");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // In a real app, this would call /auth/login
        // For the demo, we'll simulate success and store a fake token
        setTimeout(() => {
            localStorage.setItem("token", "fake-luxury-token");
            router.push("/dashboard");
        }, 1000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
            <div className="max-w-md w-full space-y-8 bg-zinc-900/50 p-10 rounded-2xl border border-zinc-800 backdrop-blur-xl">
                <div className="text-center">
                    <h1 className="text-4xl font-extralight tracking-widest uppercase">Luxury OS</h1>
                    <p className="mt-2 text-zinc-500 text-sm tracking-tight">Business Command Center – Jewelry Atelier</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1">Correo Electrónico</label>
                            <input
                                type="email"
                                required
                                className="w-full bg-zinc-800 border-none rounded-lg px-4 py-3 focus:ring-1 focus:ring-white transition-all text-sm"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1">Contraseña</label>
                            <input
                                type="password"
                                required
                                className="w-full bg-zinc-800 border-none rounded-lg px-4 py-3 focus:ring-1 focus:ring-white transition-all text-sm"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-200 transition-colors uppercase tracking-widest text-xs"
                    >
                        {loading ? "Iniciando sesión..." : "Acceder al Sistema"}
                    </button>
                </form>

                <div className="text-center text-[10px] text-zinc-600 uppercase tracking-widest">
                    Multi-tenant secure access enabled
                </div>
            </div>
        </div>
    );
}
