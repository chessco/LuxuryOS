import React, { useState } from 'react';

interface ManufacturePanelProps {
    order: any;
    onUpdateStatus: (data: any) => Promise<void>;
}

const DEFAULT_MANUFACTURE_STEPS = [
    { stage: 'SPEC_PENDING', label: 'Diseño', icon: 'brush' },
    { stage: 'MATERIALS_PENDING', label: 'Gemas', icon: 'diamond' },
    { stage: 'IN_PRODUCTION', label: 'Fundición', icon: 'bolt' },
    { stage: 'IN_PRODUCTION_ENGASTE', label: 'Engaste', icon: 'settings_suggest' },
    { stage: 'QUALITY_CHECK', label: 'Control', icon: 'fact_check' },
    { stage: 'DELIVERED', label: 'Entrega', icon: 'local_shipping' }
];

const AVAILABLE_ICONS = [
    'brush', 'diamond', 'bolt', 'settings_suggest', 'fact_check', 'local_shipping',
    'package_2', 'handyman', 'precision_manufacturing', 'auto_awesome', 'verified',
    'cut', 'palette', 'shield', 'workspace_premium', 'construction', 'hardware',
    'architecture', 'photo_camera', 'inventory_2'
];

export const ManufacturePanel: React.FC<ManufacturePanelProps> = ({ order, onUpdateStatus }) => {
    const currentStage = order.stage || order.status || 'SPEC_PENDING';

    const getActiveIndex = () => {
        const stageUpper = (currentStage || '').toUpperCase();
        if (stageUpper === 'DELIVERED') return 5;
        if (stageUpper === 'QUALITY_CHECK') return 4;
        if (stageUpper === 'IN_PRODUCTION_ENGASTE') return 3;
        if (stageUpper === 'IN_PRODUCTION') return 2;
        if (stageUpper === 'MATERIALS_PENDING') return 1;
        return 0;
    };

    const currentIndex = getActiveIndex();

    const [designNotes, setDesignNotes] = useState(order.specifications?.designNotes || order.specifications?.diagnosis || '');
    const [materialsNeeded, setMaterialsNeeded] = useState(order.specifications?.materialsNeeded || order.specifications?.partsNeeded || '');
    const [isSaving, setIsSaving] = useState(false);
    const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

    const customStepIcons: Record<number, string> = order.specifications?.customStepIcons || {};

    const handleSaveSpecs = async () => {
        setIsSaving(true);
        try {
            await onUpdateStatus({
                specifications: {
                    ...order.specifications,
                    designNotes,
                    materialsNeeded
                }
            });
        } finally {
            setIsSaving(false);
        }
    };

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAuthorized = user.role === 'SYSTEM_ADMIN' || user.role === 'TENANT_ADMIN';

    const handleStepClick = async (step: typeof DEFAULT_MANUFACTURE_STEPS[0]) => {
        if (!isAuthorized) return;
        try {
            await onUpdateStatus({
                stage: step.stage,
                status: step.stage === 'DELIVERED' ? 'DELIVERED' : (step.stage === 'READY_FOR_PICKUP' ? 'READY_FOR_PICKUP' : 'IN_PRODUCTION')
            });
        } catch (error) {
            console.error("Failed to update manufacture stage", error);
        }
    };

    const handleSelectIcon = async (icon: string) => {
        if (editingStepIndex === null) return;
        const updatedIcons = { ...customStepIcons, [editingStepIndex]: icon };
        setEditingStepIndex(null);
        try {
            await onUpdateStatus({
                specifications: {
                    ...order.specifications,
                    customStepIcons: updatedIcons
                }
            });
        } catch (error) {
            console.error("Failed to update step icon", error);
        }
    };

    const handleNextStatus = async () => {
        if (currentIndex < DEFAULT_MANUFACTURE_STEPS.length - 1) {
            const nextStep = DEFAULT_MANUFACTURE_STEPS[currentIndex + 1];
            await handleStepClick(nextStep);
        }
    };

    return (
        <section className="bg-card border border-border rounded-[32px] p-8 backdrop-blur-sm shadow-sm transition-colors relative">
            <header className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-[20px] transition-colors">precision_manufacturing</span>
                    </div>
                    <div>
                        <h3 className="text-foreground text-[10px] font-black uppercase tracking-widest font-display transition-colors">Panel de Gestión de Fabricación</h3>
                        <p className="text-muted-foreground text-[9px] font-black uppercase tracking-widest mt-0.5 transition-colors">Control de Taller de Alta Joyería</p>
                    </div>
                </div>
                <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full transition-colors">
                    <span className="text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest">Fabricación Activa</span>
                </div>
            </header>

            {/* Stepper */}
            <div className="relative flex justify-between items-center mb-12 px-4">
                <div className="absolute left-0 right-0 h-px bg-border top-[20px] z-0 transition-colors">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-700 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                        style={{ width: `${(currentIndex / (DEFAULT_MANUFACTURE_STEPS.length - 1)) * 100}%` }}
                    />
                </div>
                {DEFAULT_MANUFACTURE_STEPS.map((step, idx) => {
                    const isActive = idx <= currentIndex;
                    const isCurrent = idx === currentIndex;
                    const iconName = customStepIcons[idx] || step.icon;

                    return (
                        <div key={idx} className="relative z-10 flex flex-col items-center gap-2 group">
                            {/* Edit icon button */}
                            {isAuthorized && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setEditingStepIndex(editingStepIndex === idx ? null : idx); }}
                                    className="absolute -top-3 -right-2 size-5 rounded-full bg-card border border-border text-muted-foreground hover:text-indigo-500 hover:border-indigo-500/50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-md z-20"
                                    title="Editar icono de este paso"
                                >
                                    <span className="material-symbols-outlined text-[12px]">edit</span>
                                </button>
                            )}

                            <div 
                                onClick={() => handleStepClick(step)}
                                className={`size-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                                    isCurrent ? 'bg-indigo-600 border-indigo-400 text-white scale-110 shadow-[0_0_20px_rgba(99,102,241,0.4)] cursor-pointer' :
                                    isActive ? 'bg-background border-indigo-500 text-indigo-500 hover:border-indigo-400 cursor-pointer' :
                                        'bg-background border-border text-muted-foreground/30 hover:border-zinc-500/50 cursor-pointer'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">{iconName}</span>
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${
                                isActive ? 'text-foreground font-black' : 'text-muted-foreground'
                            }`}>{step.label}</span>
                        </div>
                    );
                })}
            </div>

            {/* Icon Picker Popover */}
            {editingStepIndex !== null && (
                <div className="mb-8 p-4 bg-muted/60 border border-border rounded-2xl animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
                            Seleccionar icono para "{DEFAULT_MANUFACTURE_STEPS[editingStepIndex].label}":
                        </span>
                        <button onClick={() => setEditingStepIndex(null)} className="text-muted-foreground hover:text-foreground">
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {AVAILABLE_ICONS.map(icon => (
                            <button
                                key={icon}
                                type="button"
                                onClick={() => handleSelectIcon(icon)}
                                className="size-9 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all text-foreground shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Technical Design Specs */}
                <div className="space-y-4">
                    <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">brush</span>
                        Especificaciones de Diseño & CAD
                    </label>
                    <textarea
                        value={designNotes}
                        onChange={(e) => setDesignNotes(e.target.value)}
                        placeholder="Detalles del diseño 3D, medidas exactas, renders y requerimientos del cliente..."
                        className="w-full min-h-[120px] bg-input border border-border rounded-2xl p-4 text-sm text-foreground placeholder-muted-foreground focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all resize-none shadow-inner"
                    />
                </div>

                {/* Gems & Materials */}
                <div className="space-y-4">
                    <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">diamond</span>
                        Gemas, Metales e Insumos
                    </label>
                    <textarea
                        value={materialsNeeded}
                        onChange={(e) => setMaterialsNeeded(e.target.value)}
                        placeholder="Especificaciones de diamantes, tipo de metal, gramos asignados y soldaduras..."
                        className="w-full min-h-[120px] bg-input border border-border rounded-2xl p-4 text-sm text-foreground placeholder-muted-foreground focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all resize-none shadow-inner"
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

                    {currentIndex < DEFAULT_MANUFACTURE_STEPS.length - 1 && (
                        <button
                            onClick={() => handleStepClick(DEFAULT_MANUFACTURE_STEPS[DEFAULT_MANUFACTURE_STEPS.length - 2])}
                            className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                        >
                            Marcar como Listo
                        </button>
                    )}
                </div>

                {currentIndex < DEFAULT_MANUFACTURE_STEPS.length - 1 && (
                    <button
                        onClick={handleNextStatus}
                        className="flex items-center gap-3 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/10 active:scale-95"
                    >
                        <span>Avanzar a: {DEFAULT_MANUFACTURE_STEPS[currentIndex + 1].label}</span>
                        <span className="material-symbols-outlined text-[18px]">trending_flat</span>
                    </button>
                )}
            </footer>
        </section>
    );
};
