import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('admin@pitayacode.io');
    const [password, setPassword] = useState('pitaya123');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/auth/login', {
                email,
                password
            });

            const { access_token, user } = response.data;

            localStorage.setItem("token", access_token);
            localStorage.setItem("user", JSON.stringify(user));

            setLoading(false);
            navigate("/dashboard");
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.response?.data?.message || 'Error al iniciar sesión. Por favor verifica tus credenciales.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white px-4 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-500">
            <div className="max-w-md w-full space-y-8 bg-white dark:bg-zinc-900/40 p-12 rounded-[40px] border border-zinc-200 dark:border-zinc-900 backdrop-blur-3xl shadow-xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-700">
                <div className="flex flex-col items-center gap-6">
                    <div className="flex items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-900 size-16 shadow-2xl shadow-indigo-500/20 animate-subtle-bounce">
                        <span className="material-symbols-outlined text-white text-3xl">diamond</span>
                    </div>
                    <div className="text-center flex flex-col gap-2">
                        <h2 className="text-3xl font-black tracking-tighter uppercase font-display text-zinc-900 dark:text-white">Luxury OS</h2>
                        <p className="text-zinc-400 dark:text-zinc-600 text-[10px] font-black uppercase tracking-[0.4em]">Business Command Center</p>
                    </div>
                </div>

                {error && (
                    <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs text-center font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-4">
                        {error}
                    </div>
                )}

                <form className="mt-8 space-y-8" onSubmit={handleLogin}>
                    <div className="space-y-4">
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-600 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">
                                <span className="material-symbols-outlined text-[20px]">person</span>
                            </span>
                            <input
                                type="text"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl py-4 pl-12 pr-4 text-sm text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white focus:outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-700"
                                placeholder="Identificador de Usuario"
                            />
                        </div>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-600 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">
                                <span className="material-symbols-outlined text-[20px]">lock_open</span>
                            </span>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl py-4 pl-12 pr-4 text-sm text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white focus:outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-700"
                                placeholder="Código de Acceso"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2 cursor-pointer group">
                            <div className="size-4 rounded border border-zinc-200 dark:border-zinc-800 group-hover:border-zinc-400 dark:group-hover:border-zinc-500 transition-colors"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-900 dark:group-hover:text-zinc-400 transition-colors">Recordar sesión</span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-500 hover:text-indigo-400 cursor-pointer">Recuperar acceso</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full h-14 bg-zinc-900 text-white dark:bg-white dark:text-black font-black py-3 rounded-2xl hover:bg-black dark:hover:bg-zinc-200 transition-all flex items-center justify-center overflow-hidden active:scale-95 disabled:opacity-50 shadow-xl shadow-black/5 dark:shadow-white/5"
                    >
                        <div className={`flex items-center gap-3 ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
                            <span className="text-xs uppercase tracking-[0.3em]">Acceso Seguro</span>
                            <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">arrow_forward</span>
                        </div>
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="size-5 border-2 border-white/20 dark:border-black/20 border-t-white dark:border-t-black rounded-full animate-spin"></div>
                            </div>
                        )}
                    </button>
                </form>

                <div className="pt-8 text-center">
                    <p className="text-[9px] text-zinc-300 dark:text-zinc-700 font-black uppercase tracking-[0.2em]">
                        Encriptación de Grado Militar AES-256 Activa
                    </p>
                </div>
            </div>
        </div>
    );
}
