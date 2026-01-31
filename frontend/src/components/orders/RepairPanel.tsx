import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface RepairPanelProps {
    order: any; // Using any for UI flexibility
    onUpdateStatus: (data: any) => Promise<void>;
}

const REPAIR_STEPS = [
    { status: OrderStatus.RECEIVED, label: 'Recibido', icon: 'package_2' },
    { status: OrderStatus.DIAGNOSIS_PENDING, label: 'Diagnóstico', icon: 'biotech' },
    { status: OrderStatus.QUOTE_SENT, label: 'Presupuesto', icon: 'request_quote' },
    { status: OrderStatus.APPROVED, label: 'Aprobado', icon: 'task_alt' },
    { status: OrderStatus.IN_REPAIR, label: 'En Taller', icon: 'handyman' },
    { status: OrderStatus.REPAIR_COMPLETED, label: 'Listo', icon: 'verified' },
    { status: OrderStatus.DELIVERED, label: 'Entregado', icon: 'local_shipping' }
];

export const RepairPanel: React.FC<RepairPanelProps> = ({ order, onUpdateStatus }) => {
    const currentStatus = order.status || order.orderStatus || OrderStatus.RECEIVED;
    const currentIndex = REPAIR_STEPS.findIndex(s => s.status === currentStatus);

    const [diagnosis, setDiagnosis] = useState(order.specifications?.diagnosis || '');
    const [partsNeeded, setPartsNeeded] = useState(order.specifications?.partsNeeded || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveSpecs = async () => {
        setIsSaving(true);
        try {
            await onUpdateStatus({
                specifications: {
                    ...order.specifications,
                    diagnosis,
                    partsNeeded
                }
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleNextStatus = async () => {
        if (currentIndex < REPAIR_STEPS.length - 1) {
            const nextStatus = REPAIR_STEPS[currentIndex + 1].status;
            await onUpdateStatus({ status: nextStatus });
        }
    };

    return (
        <section className="bg-card border border-border rounded-[32px] p-8 backdrop-blur-sm shadow-sm transition-colors">
            <header className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-500 text-[20px] transition-colors">handyman</span>
                    </div>
                    <div>
                        <h3 className="text-foreground text-[10px] font-black uppercase tracking-widest font-display transition-colors">Panel de Gestión de Reparaciones</h3>
                        <p className="text-muted-foreground text-[9px] font-black uppercase tracking-widest mt-0.5 transition-colors">Control de Taller de Alta Joyería</p>
                    </div>
                </div>
                <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full transition-colors">
                    <span className="text-amber-600 dark:text-amber-500 text-[9px] font-black uppercase tracking-widest">Reparación Activa</span>
                </div>
            </header>

            {/* Stepper */}
            <div className="relative flex justify-between items-center mb-12 px-4">
                <div className="absolute left-0 right-0 h-px bg-border top-[20px] z-0 transition-colors">
                    <div
                        className="h-full bg-amber-500 transition-all duration-700 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                        style={{ width: `${(currentIndex / (REPAIR_STEPS.length - 1)) * 100}%` }}
                    />
                </div>
                {REPAIR_STEPS.map((step, idx) => {
                    const isActive = idx <= currentIndex;
                    const isCurrent = idx === currentIndex;

                    return (
                        <div key={step.status} className="relative z-10 flex flex-col items-center gap-2 group">
                            <div className={`size-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${isCurrent ? 'bg-amber-500 border-amber-400 text-black scale-110 shadow-[0_0_20px_rgba(245,158,11,0.4)]' :
                                isActive ? 'bg-background border-amber-500 text-amber-500' :
                                    'bg-background border-border text-muted-foreground/30'
                                }`}>
                                <span className="material-symbols-outlined text-[18px]">{step.icon}</span>
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'
                                }`}>{step.label}</span>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Technical Diagnosis */}
                <div className="space-y-4">
                    <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">biotech</span>
                        Diagnóstico Técnico
                    </label>
                    <textarea
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        placeholder="Describe el estado de la pieza y el trabajo requerido..."
                        className="w-full min-h-[120px] bg-input border border-border rounded-2xl p-4 text-sm text-foreground placeholder-muted-foreground focus:border-amber-500/30 dark:focus:border-amber-500/50 outline-none transition-all resize-none shadow-inner"
                    />
                </div>

                {/* Parts & Resources */}
                <div className="space-y-4">
                    <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                        Insumos y Repuestos
                    </label>
                    <textarea
                        value={partsNeeded}
                        onChange={(e) => setPartsNeeded(e.target.value)}
                        placeholder="Gemas a reponer, soldaduras, cierres..."
                        className="w-full min-h-[120px] bg-input border border-border rounded-2xl p-4 text-sm text-foreground placeholder-muted-foreground focus:border-amber-500/30 dark:focus:border-amber-500/50 outline-none transition-all resize-none shadow-inner"
                    />
                </div>
            </div>

            <footer className="mt-10 flex items-center justify-between gap-6 pt-8 border-t border-border transition-colors">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSaveSpecs}
                        disabled={isSaving}
                        className="px-6 py-3 bg-secondary hover:bg-secondary-hover text-secondary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-sm"
                    >
                        {isSaving ? 'Guardando...' : 'Guardar Datos Técnicos'}
                    </button>

                    {currentStatus !== OrderStatus.REPAIR_COMPLETED && currentStatus !== OrderStatus.DELIVERED && (
                        <button
                            onClick={() => onUpdateStatus({ status: OrderStatus.REPAIR_COMPLETED })}
                            className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                        >
                            Marcar como Listo
                        </button>
                    )}
                </div>

                {currentIndex < REPAIR_STEPS.length - 1 && (
                    <button
                        onClick={handleNextStatus}
                        className="flex items-center gap-3 px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-500/10 active:scale-95"
                    >
                        <span>Avanzar a: {REPAIR_STEPS[currentIndex + 1].label}</span>
                        <span className="material-symbols-outlined text-[18px]">trending_flat</span>
                    </button>
                )}
            </footer>
        </section>
    );
};
