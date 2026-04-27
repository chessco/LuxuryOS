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
            
            // Allow any positive payment if totalAmount is 0 (advance)
            // or if the value is within the pending amount
            const isValid = totalAmount === 0 ? value > 0 : (value > 0 && value <= pendingAmount);

            if (!isValid) {
                alert(totalAmount === 0 ? 'Monto debe ser mayor a 0' : 'Monto inválido o excede el saldo');
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
                            className="fixed inset-y-0 right-0 z-[110] w-full max-w-md bg-background border-l border-border shadow-2xl flex flex-col transition-colors"
                        >
                            {/* Header */}
                            <div className="p-8 border-b border-border bg-muted/20 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="size-10 rounded-xl bg-primary flex items-center justify-center transition-colors">
                                        <span className="material-symbols-outlined text-primary-foreground icon-fill transition-colors">payments</span>
                                    </div>
                                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                <h3 className="text-foreground text-xl font-black mb-1 transition-colors">Registrar Pago</h3>
                                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest transition-colors">
                                    Saldo Pendiente: MXN {pendingAmount.toLocaleString()}
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="flex-1 p-8 space-y-10 overflow-y-auto custom-scrollbar">
                                <div className="space-y-4">
                                    <label className="block text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] px-1 transition-colors">Monto a Pagar</label>
                                    {(pendingAmount <= 0 && totalAmount > 0) ? (
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-emerald-600 text-[10px] font-black uppercase tracking-widest text-center transition-colors">
                                            El pedido ya está liquidado
                                        </div>
                                    ) : (
                                        <div className="relative group">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground/50 font-bold transition-colors">$</span>
                                            <input
                                                type="number"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="w-full bg-muted/50 border border-border rounded-2xl py-5 pl-12 pr-6 text-foreground text-2xl font-black outline-none focus:border-indigo-500 transition-all placeholder:text-muted-foreground/30 shadow-inner [color-scheme:light] dark:[color-scheme:dark]"
                                                placeholder="0.00"
                                                max={totalAmount > 0 ? pendingAmount : undefined}
                                                autoFocus
                                            />
                                            {totalAmount === 0 && (
                                                <p className="mt-2 px-2 text-indigo-500 text-[9px] font-bold uppercase tracking-widest animate-pulse">
                                                    Registrando Anticipo (Total pendiente por definir)
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] px-1 transition-colors">Método de Pago</label>
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
                                                className={`flex items-center gap-4 px-6 py-4 rounded-2xl border transition-all ${method === m.id ? 'bg-foreground border-foreground text-background shadow-lg' : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-indigo-500/50'}`}
                                            >
                                                <span className="material-symbols-outlined text-[20px] transition-colors">{m.icon}</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest transition-colors">{m.label}</span>
                                                {method === m.id && <span className="material-symbols-outlined ml-auto text-background transition-colors">check_circle</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </form>

                            <div className="p-8 border-t border-border bg-muted/20 transition-colors">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading || !amount || parseFloat(amount) <= 0}
                                    className="w-full py-5 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-[0.3em] text-[10px] hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-black/10 dark:shadow-white/5 active:scale-95 transition-colors"
                                >
                                    {isLoading ? 'Procesando Transacción...' : 'Confirmar y Aplicar Pago'}
                                </button>
                                <p className="text-center text-muted-foreground/70 text-[8px] font-medium uppercase tracking-tighter mt-4 transition-colors">La transacción se registrará automáticamente en el historial.</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
