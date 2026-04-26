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
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 selection:bg-foreground selection:text-background transition-colors duration-500">
            <div className="max-w-md w-full space-y-8 bg-card p-12 rounded-[40px] border border-border backdrop-blur-3xl shadow-xl transition-all duration-700">
                <div className="flex flex-col items-center gap-6">
                    <div className="flex items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-900 size-16 shadow-2xl shadow-indigo-500/20 animate-subtle-bounce">
                        <span className="material-symbols-outlined text-white text-3xl">diamond</span>
                    </div>
                    <div className="text-center flex flex-col gap-2">
                        <h2 className="text-3xl font-black tracking-tighter uppercase font-display text-foreground transition-colors">Luxury OS</h2>
                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.4em] transition-colors">Business Command Center</p>
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
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors">
                                <span className="material-symbols-outlined text-[20px]">person</span>
                            </span>
                            <input
                                type="text"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-muted border border-border rounded-2xl py-4 pl-12 pr-4 text-sm text-foreground focus:border-indigo-500 focus:outline-none transition-all placeholder-muted-foreground"
                                placeholder="Identificador de Usuario"
                            />
                        </div>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors">
                                <span className="material-symbols-outlined text-[20px]">lock_open</span>
                            </span>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-muted border border-border rounded-2xl py-4 pl-12 pr-4 text-sm text-foreground focus:border-indigo-500 focus:outline-none transition-all placeholder-muted-foreground"
                                placeholder="Código de Acceso"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2 cursor-pointer group">
                            <div className="size-4 rounded border border-border group-hover:border-indigo-500 transition-colors"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">Recordar sesión</span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-400 cursor-pointer">Recuperar acceso</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full h-14 bg-foreground text-background font-black py-3 rounded-2xl hover:opacity-90 transition-all flex items-center justify-center overflow-hidden active:scale-95 disabled:opacity-50 shadow-xl"
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
                    <p className="text-[9px] text-muted-foreground/50 font-black uppercase tracking-[0.2em]">
                        Encriptación de Grado Militar AES-256 Activa
                    </p>
                </div>
            </div>
        </div>
    );
}
