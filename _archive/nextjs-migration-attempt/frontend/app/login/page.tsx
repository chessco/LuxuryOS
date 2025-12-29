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
        <div className="min-h-screen flex items-center justify-center bg-black text-white px-4 selection:bg-white selection:text-black">
            <div className="max-w-md w-full space-y-12 bg-zinc-900/40 p-12 rounded-[2.5rem] border border-zinc-900 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute -top-24 -right-24 size-48 bg-white/5 rounded-full blur-3xl"></div>

                <div className="text-center relative z-10">
                    <div className="size-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-white/5">
                        <span className="material-symbols-outlined text-black text-4xl">diamond</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Luxury OS</h1>
                    <p className="text-zinc-500 text-[10px] uppercase font-black tracking-[0.3em]">Business Command Center</p>
                </div>

                <form className="space-y-6 relative z-10" onSubmit={handleLogin}>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Account Access</label>
                            <input
                                type="email"
                                required
                                placeholder="Email address"
                                className="w-full bg-zinc-950/50 border border-zinc-900 rounded-2xl px-6 py-4 focus:border-zinc-700 outline-none transition-all text-sm placeholder:text-zinc-800"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Secure Key</label>
                            <input
                                type="password"
                                required
                                placeholder="Password"
                                className="w-full bg-zinc-950/50 border border-zinc-900 rounded-2xl px-6 py-4 focus:border-zinc-700 outline-none transition-all text-sm placeholder:text-zinc-800"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-black py-5 rounded-2xl hover:bg-zinc-200 transition-all uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-white/5 active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? "Initializing..." : "Authorize Entry"}
                    </button>
                </form>

                <div className="text-center text-[9px] text-zinc-700 uppercase font-black tracking-[0.2em] relative z-10 pt-4">
                    Secure Multi-Tenant Infrastructure <br />
                    <span className="text-zinc-800">End-to-End Encryption Enabled</span>
                </div>
            </div>
        </div>
    );
}
