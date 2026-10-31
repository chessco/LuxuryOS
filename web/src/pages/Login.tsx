import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    // Forzar tema oscuro siempre al cargar la pantalla de login
    useEffect(() => {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme-mode', 'dark');
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

            setLoading(false);
            navigate("/orders?type=REPAIR");
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.response?.data?.message || 'Error al iniciar sesión. Por favor verifica tus credenciales.');
            setLoading(false);
        }
    };

    return (
        <div className="dark min-h-[100dvh] w-full flex items-center justify-center bg-black text-white p-4 sm:p-6 md:p-8 selection:bg-white selection:text-black">
            <div className="max-w-md w-full space-y-6 sm:space-y-8 bg-[#09090b] p-6 sm:p-8 md:p-12 rounded-3xl sm:rounded-[40px] border border-zinc-800 shadow-2xl">
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
                    <div className="p-3.5 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl text-red-500 text-xs text-center font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-4">
                        {error}
                    </div>
                )}

                <form className="space-y-5 sm:space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-3.5 sm:space-y-4">
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors">
                                <span className="material-symbols-outlined text-[20px]">person</span>
                            </span>
                            <input
                                type="text"
                                required
                                autoFocus
                                autoComplete="off"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl sm:rounded-2xl py-3.5 sm:py-4 pl-12 pr-4 text-base sm:text-sm text-white focus:border-red-500 focus:outline-none transition-all placeholder-zinc-500"
                                placeholder="Identificador de Usuario"
                            />
                        </div>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors">
                                <span className="material-symbols-outlined text-[20px]">lock_open</span>
                            </span>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl sm:rounded-2xl py-3.5 sm:py-4 pl-12 pr-4 text-base sm:text-sm text-white focus:border-red-500 focus:outline-none transition-all placeholder-zinc-500"
                                placeholder="Código de Acceso"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-1 sm:px-2">
                        <div className="flex items-center gap-2 cursor-pointer group">
                            <div className="size-4 rounded border border-zinc-700 group-hover:border-red-500 transition-colors"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">Recordar sesión</span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 cursor-pointer">Recuperar acceso</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full h-12 sm:h-14 bg-white text-black font-black py-3 rounded-xl sm:rounded-2xl hover:bg-zinc-200 transition-all flex items-center justify-center overflow-hidden active:scale-95 disabled:opacity-50 shadow-xl"
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

                <div className="pt-2 sm:pt-4 text-center">
                    <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em]">
                        Encriptación de Grado Militar AES-256 Activa
                    </p>
                </div>
            </div>
        </div>
    );
}
