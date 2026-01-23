import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    pendingAmount: number;
    onRegisterPayment: (amount: number, method: string) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, totalAmount, pendingAmount, onRegisterPayment }) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('CARD');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(amount);
        if (value <= 0 || value > pendingAmount) {
            alert('Monto inválido');
            return;
        }

        setIsLoading(true);
        try {
            await onRegisterPayment(value, method);
            onClose();
        } catch (error) {
            console.error(error);
            alert('Error al registrar pago');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 z-[110] w-full max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-900 shadow-2xl flex flex-col transition-colors"
                        >
                            {/* Header */}
                            <div className="p-8 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/20 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="size-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center transition-colors">
                                        <span className="material-symbols-outlined text-white dark:text-black icon-fill transition-colors">payments</span>
                                    </div>
                                    <button onClick={onClose} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                <h3 className="text-zinc-900 dark:text-white text-xl font-black mb-1 transition-colors">Registrar Pago</h3>
                                <p className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest transition-colors">
                                    Saldo Pendiente: MXN {pendingAmount.toLocaleString()}
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="flex-1 p-8 space-y-10 overflow-y-auto custom-scrollbar">
                                <div className="space-y-4">
                                    <label className="block text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] px-1 transition-colors">Monto a Pagar</label>
                                    {pendingAmount <= 0 ? (
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-emerald-600 dark:text-emerald-500 text-[10px] font-black uppercase tracking-widest text-center transition-colors">
                                            El pedido ya está liquidado
                                        </div>
                                    ) : (
                                        <div className="relative group">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600 font-bold transition-colors">$</span>
                                            <input
                                                type="number"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 rounded-2xl py-5 pl-12 pr-6 text-zinc-900 dark:text-white text-2xl font-black outline-none focus:border-indigo-500 transition-all placeholder:text-zinc-200 dark:placeholder:text-zinc-800 shadow-inner [color-scheme:light] dark:[color-scheme:dark]"
                                                placeholder="0.00"
                                                max={pendingAmount}
                                                autoFocus
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] px-1 transition-colors">Método de Pago</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {[
                                            { id: 'CARD', label: 'Tarjeta de Crédito / Débito', icon: 'credit_card' },
                                            { id: 'CASH', label: 'Efectivo / Cash', icon: 'payments' },
                                            { id: 'TRANSFER', label: 'Transferencia Bancaria', icon: 'account_balance' }
                                        ].map((m) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => setMethod(m.id)}
                                                className={`flex items-center gap-4 px-6 py-4 rounded-2xl border transition-all ${method === m.id ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-black shadow-lg' : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-900 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-700'}`}
                                            >
                                                <span className="material-symbols-outlined text-[20px] transition-colors">{m.icon}</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest transition-colors">{m.label}</span>
                                                {method === m.id && <span className="material-symbols-outlined ml-auto text-white dark:text-black transition-colors">check_circle</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </form>

                            <div className="p-8 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/20 transition-colors">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading || !amount || parseFloat(amount) <= 0}
                                    className="w-full py-5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.3em] text-[10px] hover:bg-black dark:hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-black/10 dark:shadow-white/5 active:scale-95 transition-colors"
                                >
                                    {isLoading ? 'Procesando Transacción...' : 'Confirmar y Aplicar Pago'}
                                </button>
                                <p className="text-center text-zinc-400 dark:text-zinc-600 text-[8px] font-medium uppercase tracking-tighter mt-4 transition-colors">La transacción se registrará automáticamente en el historial.</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
