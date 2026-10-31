import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    // Arrancar siempre en Modo Claro por defecto en Login y asegurar menú contraído
    useEffect(() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        localStorage.setItem('theme-mode', 'light');
        localStorage.setItem('sidebar_open', 'false');
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Normalize: case-insensitive, trim whitespace
        let loginEmail = email.trim().toLowerCase();

        try {
            const response = await api.post('/auth/login', {
                email: loginEmail,
                password
            });

            const { access_token, user } = response.data;

            localStorage.setItem("token", access_token);
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("sidebar_open", "false");

            setLoading(false);
            navigate("/orders?type=REPAIR");
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.response?.data?.message || 'Error al iniciar sesión. Por favor verifica tus credenciales.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center bg-zinc-100 text-zinc-900 p-4 sm:p-6 md:p-8 selection:bg-black selection:text-white">
            <div className="max-w-md w-full space-y-6 sm:space-y-8 bg-white p-6 sm:p-8 md:p-12 rounded-3xl sm:rounded-[40px] border border-zinc-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
                <div className="flex flex-col items-center justify-center pb-1">
                    <img
                        src="/cared-login-logo.png"
                        alt="CARED"
                        className="h-16 sm:h-20 md:h-24 w-auto object-contain transition-all"
                        loading="eager"
                        decoding="async"
                    />
                </div>

                {error && (
                    <div className="p-3.5 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl text-red-600 text-xs text-center font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-4">
                        {error}
                    </div>
                )}

                <form className="space-y-5 sm:space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-3.5 sm:space-y-4">
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">person</span>
                            </span>
                            <input
                                type="text"
                                required
                                autoFocus
                                autoComplete="off"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl sm:rounded-2xl py-3.5 sm:py-4 pl-12 pr-4 text-base sm:text-sm text-zinc-900 focus:border-red-500 focus:outline-none transition-all placeholder-zinc-400"
                                placeholder="Identificador de Usuario"
                            />
                        </div>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">lock_open</span>
                            </span>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl sm:rounded-2xl py-3.5 sm:py-4 pl-12 pr-4 text-base sm:text-sm text-zinc-900 focus:border-red-500 focus:outline-none transition-all placeholder-zinc-400"
                                placeholder="Código de Acceso"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-1 sm:px-2">
                        <div className="flex items-center gap-2 cursor-pointer group">
                            <div className="size-4 rounded border border-zinc-300 group-hover:border-red-500 transition-colors"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-800 transition-colors">Recordar sesión</span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 cursor-pointer">Recuperar acceso</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full h-12 sm:h-14 bg-black text-white font-black py-3 rounded-xl sm:rounded-2xl hover:bg-zinc-800 transition-all flex items-center justify-center overflow-hidden active:scale-95 disabled:opacity-50 shadow-xl"
                    >
                        <div className={`flex items-center gap-3 ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
                            <span className="text-xs uppercase tracking-[0.3em]">Acceso Seguro</span>
                            <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">arrow_forward</span>
                        </div>
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="size-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            </div>
                        )}
                    </button>
                </form>

                <div className="pt-2 sm:pt-4 text-center">
                    <p className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.2em]">
                        Encriptación de Grado Militar AES-256 Activa
                    </p>
                </div>
            </div>
        </div>
    );
}
