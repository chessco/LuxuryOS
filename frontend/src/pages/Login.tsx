import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulación de autenticación
        setTimeout(() => {
            localStorage.setItem("token", "dummy-token-luxury-os");
            setLoading(false);
            navigate("/dashboard");
        }, 1500);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white px-4 selection:bg-white selection:text-black">
            <div className="max-w-md w-full space-y-8 bg-zinc-900/40 p-12 rounded-[40px] border border-zinc-900 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-700">
                <div className="flex flex-col items-center gap-6">
                    <div className="flex items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-900 size-16 shadow-2xl shadow-indigo-500/20 animate-subtle-bounce">
                        <span className="material-symbols-outlined text-white text-3xl">diamond</span>
                    </div>
                    <div className="text-center flex flex-col gap-2">
                        <h2 className="text-3xl font-black tracking-tighter uppercase font-display">Luxury OS</h2>
                        <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.4em]">Business Command Center</p>
                    </div>
                </div>

                <form className="mt-12 space-y-8" onSubmit={handleLogin}>
                    <div className="space-y-4">
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-white transition-colors">
                                <span className="material-symbols-outlined text-[20px]">person</span>
                            </span>
                            <input
                                type="text"
                                required
                                className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-white focus:outline-none transition-all placeholder-zinc-700"
                                placeholder="Identificador de Usuario"
                            />
                        </div>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-white transition-colors">
                                <span className="material-symbols-outlined text-[20px]">lock_open</span>
                            </span>
                            <input
                                type="password"
                                required
                                className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-white focus:outline-none transition-all placeholder-zinc-700"
                                placeholder="Código de Acceso"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2 cursor-pointer group">
                            <div className="size-4 rounded border border-zinc-800 group-hover:border-zinc-500 transition-colors"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400 transition-colors">Recordar sesión</span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-400 cursor-pointer">Recuperar acceso</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full h-14 bg-white text-black font-black py-3 rounded-2xl hover:bg-zinc-200 transition-all flex items-center justify-center overflow-hidden active:scale-95 disabled:opacity-50"
                    >
                        <div className={`flex items-center gap-3 ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
                            <span className="text-xs uppercase tracking-[0.3em]">Acceso Seguro</span>
                            <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">arrow_forward</span>
                        </div>
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="size-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                            </div>
                        )}
                    </button>
                </form>

                <div className="pt-8 text-center">
                    <p className="text-[9px] text-zinc-700 font-black uppercase tracking-[0.2em]">
                        Encriptación de Grado Militar AES-256 Activa
                    </p>
                </div>
            </div>
        </div>
    );
}
