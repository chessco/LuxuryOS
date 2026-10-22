import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    pendingAmount: number;
    laborCost?: number;
    materialCost?: number;
    paidAmount?: number;
    payments?: any[];
    pieceType?: string;
    onRegisterPayment: (amount: number, method: string) => Promise<void>;
}

const METHOD_LABELS: Record<string, string> = {
    CARD: 'Tarjeta',
    CASH: 'Efectivo',
    TRANSFER: 'Transferencia',
};

const formatMoney = (n: number) =>
    `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PaymentModal: React.FC<PaymentModalProps> = ({ 
    isOpen, 
    onClose, 
    totalAmount, 
    pendingAmount, 
    laborCost,
    materialCost,
    paidAmount,
    payments,
    pieceType,
    onRegisterPayment
}) => {
    const [amount, setAmount] = useState(pendingAmount > 0 ? String(pendingAmount) : '');
    const [method, setMethod] = useState('CARD');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && pendingAmount > 0) {
            setAmount(String(pendingAmount));
        }
    }, [isOpen, pendingAmount]);

    if (!isOpen) return null;

    // Información para quien cobra: lo ya pagado (anticipos / pagos parciales) y lo que quedará pendiente
    const previousPayments = [...(payments || [])].sort(
        (a, b) => new Date(b.recordedAt || 0).getTime() - new Date(a.recordedAt || 0).getTime(),
    );
    const alreadyPaid = paidAmount !== undefined
        ? Number(paidAmount)
        : previousPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const amountValue = parseFloat(amount) || 0;
    const remainingAfter = Math.max(0, pendingAmount - amountValue);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(amount);
        
        // Allow any positive payment if totalAmount is 0 (advance)
        // or if the value is within the pending amount (with slight float tolerance)
        const isValid = totalAmount === 0 
            ? value > 0 
            : (value > 0 && Math.round(value * 100) <= Math.round(pendingAmount * 100) + 10);

        if (!isValid) {
            alert(totalAmount === 0 ? 'Monto debe ser mayor a 0' : 'Monto inválido o excede el saldo pendiente');
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

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm cursor-pointer"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 z-[160] w-full max-w-md bg-background border-l border-border shadow-2xl flex flex-col transition-colors"
                    >
                        {/* Header */}
                        <div className="p-6 sm:p-8 border-b border-border bg-muted/20 transition-colors">
                            <div className="flex items-center justify-between mb-4">
                                <div className="size-10 rounded-xl bg-primary flex items-center justify-center transition-colors">
                                    <span className="material-symbols-outlined text-primary-foreground icon-fill transition-colors">payments</span>
                                </div>
                                <button onClick={onClose} className="size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <h3 className="text-foreground text-xl font-black mb-1 transition-colors">Registrar Pago</h3>
                            <div className="flex flex-col gap-1.5 mt-2">
                                {totalAmount > 0 && (
                                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-between">
                                        <span>Total de la orden:</span>
                                        <span className="text-foreground font-mono text-xs font-black">MXN {formatMoney(totalAmount)}</span>
                                    </p>
                                )}
                                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-between">
                                    <span>Pagado / anticipos:</span>
                                    <span className="text-emerald-500 font-mono text-xs font-black">MXN {formatMoney(alreadyPaid)}</span>
                                </p>
                                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-between">
                                    <span>Saldo Pendiente:</span>
                                    <span className="text-amber-500 font-mono text-xs font-black">MXN {formatMoney(pendingAmount)}</span>
                                </p>
                                {(laborCost !== undefined || materialCost !== undefined) && (
                                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground pt-1 border-t border-border/40">
                                        {laborCost !== undefined && (
                                            <span>Mano de Obra: <strong className="text-foreground">${Number(laborCost).toLocaleString()} MXN</strong></span>
                                        )}
                                        {materialCost !== undefined && (
                                            <span>Material: <strong className="text-foreground">${Number(materialCost).toLocaleString()} MXN</strong></span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 p-6 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto custom-scrollbar">
                            {/* Pagos anteriores (anticipos y pagos parciales) */}
                            <div className="space-y-3">
                                <label className="block text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] px-1 transition-colors">
                                    Pagos anteriores {previousPayments.length > 0 && `(${previousPayments.length})`}
                                </label>
                                {previousPayments.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-border p-4 text-center text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                                        Sin anticipos ni pagos registrados
                                    </div>
                                ) : (
                                    <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                                        {previousPayments.map((p: any, idx: number) => (
                                            <div key={p.id || idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                                                <div>
                                                    <p className="text-foreground text-sm font-black tabular-nums">{formatMoney(Number(p.amount))} MXN</p>
                                                    <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                                                        {METHOD_LABELS[p.method] || p.method}
                                                        {p.recordedAt ? ` • ${new Date(p.recordedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
                                                    </p>
                                                </div>
                                                <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <label className="block text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] transition-colors">Monto a Pagar</label>
                                    {pendingAmount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setAmount(String(pendingAmount))}
                                            className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-wider"
                                        >
                                            Pagar Todo (${pendingAmount.toLocaleString()})
                                        </button>
                                    )}
                                </div>
                                {(pendingAmount <= 0 && totalAmount > 0) ? (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-emerald-600 text-[10px] font-black uppercase tracking-widest text-center transition-colors">
                                        El pedido ya está liquidado
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground/50 font-bold transition-colors text-xl">$</span>
                                            <input
                                                type="number"
                                                step="any"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="w-full bg-muted/50 border border-border rounded-2xl py-4 sm:py-5 pl-12 pr-6 text-foreground text-2xl font-black outline-none focus:border-indigo-500 transition-all placeholder:text-muted-foreground/30 shadow-inner [color-scheme:light] dark:[color-scheme:dark]"
                                                placeholder="0.00"
                                                autoFocus
                                            />
                                        </div>
                                        {totalAmount > 0 && amountValue > 0 && (
                                            <p className="px-2 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                                                {remainingAfter > 0
                                                    ? <>Quedará pendiente: <span className="text-amber-500 font-black">{formatMoney(remainingAfter)} MXN</span></>
                                                    : <span className="text-emerald-500 font-black">Con este pago la orden queda liquidada</span>}
                                            </p>
                                        )}
                                        {totalAmount === 0 && (
                                            <p className="px-2 text-indigo-500 text-[9px] font-bold uppercase tracking-widest animate-pulse">
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
                                            className={`flex items-center gap-4 px-6 py-4 rounded-2xl border transition-all cursor-pointer ${method === m.id ? 'bg-foreground border-foreground text-background shadow-lg' : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-indigo-500/50'}`}
                                        >
                                            <span className="material-symbols-outlined text-[20px] transition-colors">{m.icon}</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest transition-colors">{m.label}</span>
                                            {method === m.id && <span className="material-symbols-outlined ml-auto text-background transition-colors">check_circle</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </form>

                        <div className="p-6 sm:p-8 border-t border-border bg-muted/20 transition-colors">
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || !amount || parseFloat(amount) <= 0}
                                className="w-full py-4 sm:py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-[0.25em] text-xs hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl active:scale-95 cursor-pointer"
                            >
                                {isLoading ? 'Procesando Transacción...' : `Confirmar y Cobrar $${Number(amount || 0).toLocaleString()} MXN`}
                            </button>
                            <p className="text-center text-muted-foreground/70 text-[8px] font-medium uppercase tracking-tighter mt-3 transition-colors">La transacción se registrará automáticamente en el historial del cliente.</p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};
