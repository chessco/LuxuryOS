import React, { useState } from 'react';
import { OrdersService } from '../../services/orders.service';

interface DesignStageCardProps {
    order: any;
    assignableUsers: any[];
    onOrderUpdated: () => void;
}

export const DesignStageCard: React.FC<DesignStageCardProps> = ({ order, assignableUsers, onOrderUpdated }) => {
    const specs = order.specifications || {};
    const isDesignCompleted = Boolean(specs.designCompleted || specs.designStatus === 'COMPLETED');
    const assignedDesigner = specs.assignedDesigner || specs.designerName || (specs.requiresDesign ? specs.assignedTo : null);
    const assignedJeweler = specs.assignedJeweler || specs.jewelerName;

    const [designNotes, setDesignNotes] = useState(specs.designNotes || '');
    const [selectedJeweler, setSelectedJeweler] = useState(assignedJeweler || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [actionMsg, setActionMsg] = useState<string | null>(null);

    const currentUser = React.useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    }, []);

    const isDesignerOrAdmin =
        currentUser?.role === 'DISENADOR' ||
        currentUser?.role === 'DESIGNER' ||
        currentUser?.role === 'ADMIN' ||
        currentUser?.role === 'SYSTEM_ADMIN' ||
        currentUser?.role === 'TENANT_ADMIN' ||
        currentUser?.role === 'SUPER_ADMIN' ||
        currentUser?.role === 'SYSTEM';

    // Filter available jewelers
    const jewelersList = assignableUsers.filter(u => {
        const r = String(u.role || '').toUpperCase();
        const n = String(u.name || '').toLowerCase();
        const e = String(u.email || '').toLowerCase();
        return r === 'JOYERO' || n.includes('joyero') || e.includes('joyero');
    });

    const handleCompleteDesign = async () => {
        if (!window.confirm('¿Confirmar que el diseño ha sido completado? Esto habilitará la asignación al Joyero.')) {
            return;
        }
        setIsSaving(true);
        try {
            await OrdersService.completeDesign(order.id, {
                notes: designNotes.trim() || undefined,
            });
            setActionMsg('¡Diseño completado con éxito! ✨ Ahora puede asignar el trabajo al Joyero.');
            onOrderUpdated();
        } catch (err: any) {
            console.error('Error completing design:', err);
            const msg = err?.response?.data?.message || err?.message || 'Error al completar el diseño';
            alert(typeof msg === 'string' ? msg : 'Error al completar el diseño');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAssignJeweler = async () => {
        if (!isDesignCompleted) {
            alert('El diseño debe estar completado antes de poder asignar la orden al Joyero.');
            return;
        }
        if (!selectedJeweler.trim()) {
            alert('Por favor, selecciona un Joyero para la fase de producción.');
            return;
        }
        setIsAssigning(true);
        try {
            const userMatch = jewelersList.find(u => (u.name || u.email) === selectedJeweler);
            await OrdersService.assignJewelerAfterDesign(order.id, selectedJeweler, userMatch?.id);
            setActionMsg(`¡Orden asignada a ${selectedJeweler}! Pasa a la bandeja de Producción del Joyero. 🔨`);
            onOrderUpdated();
        } catch (err: any) {
            console.error('Error assigning jeweler:', err);
            const msg = err?.response?.data?.message || err?.message || 'Error al asignar el Joyero';
            alert(typeof msg === 'string' ? msg : 'Error al asignar el Joyero');
        } finally {
            setIsAssigning(false);
        }
    };

    return (
        <section className="bg-card border border-indigo-500/30 rounded-[36px] p-6 sm:p-8 backdrop-blur-sm shadow-md transition-colors mb-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-border">
                <div className="flex items-center gap-3.5">
                    <div className="size-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-sm shrink-0">
                        <span className="material-symbols-outlined text-[26px]">palette</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                Etapa 1 • Modelado y Diseño
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                                isDesignCompleted
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            }`}>
                                {isDesignCompleted ? 'Diseño Completado' : 'En Proceso de Diseño'}
                            </span>
                        </div>
                        <h3 className="text-foreground text-xl font-black uppercase tracking-tight font-display mt-1">
                            Flujo de Diseño y Doble Asignación (RF-05)
                        </h3>
                    </div>
                </div>

                {actionMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-in fade-in">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        <span>{actionMsg}</span>
                    </div>
                )}
            </div>

            {/* Doble Asignación Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* 1. Responsable del Diseño */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black">
                            <span className="material-symbols-outlined text-[20px]">brush</span>
                        </div>
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">
                                Responsable de Diseño
                            </span>
                            <span className="text-sm font-bold text-foreground">
                                {assignedDesigner || 'Sin Diseñador asignado'}
                            </span>
                        </div>
                    </div>
                    {isDesignCompleted ? (
                        <div className="text-right">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                <span className="material-symbols-outlined text-[13px]">verified</span>
                                Listo
                            </span>
                            {specs.designCompletedAt && (
                                <span className="text-[9px] text-muted-foreground block mt-0.5">
                                    {new Date(specs.designCompletedAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                            Pendiente
                        </span>
                    )}
                </div>

                {/* 2. Responsable de Joyería / Producción */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                            <span className="material-symbols-outlined text-[20px]">hardware</span>
                        </div>
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">
                                Responsable de Producción (Joyero)
                            </span>
                            <span className="text-sm font-bold text-foreground">
                                {assignedJeweler || 'Pendiente de asignación'}
                            </span>
                        </div>
                    </div>
                    {assignedJeweler ? (
                        <div className="text-right">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                                <span className="material-symbols-outlined text-[13px]">handyman</span>
                                Asignado
                            </span>
                            {specs.assignedJewelerAt && (
                                <span className="text-[9px] text-muted-foreground block mt-0.5">
                                    {new Date(specs.assignedJewelerAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-md border border-border">
                            Requiere Diseño
                        </span>
                    )}
                </div>
            </div>

            {/* Design Notes & Actions */}
            <div className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">notes</span>
                        Notas, Referencias y Especificaciones del Diseñador
                    </label>
                    <textarea
                        value={designNotes}
                        disabled={!isDesignerOrAdmin || isDesignCompleted}
                        onChange={(e) => setDesignNotes(e.target.value)}
                        placeholder="Registrar detalles del modelado 3D, archivo Rhino/Matrix, especificaciones para el Joyero..."
                        className="w-full min-h-[90px] bg-muted/30 border border-border rounded-2xl p-4 text-xs text-foreground placeholder-muted-foreground focus:border-indigo-500 outline-none resize-none transition-all disabled:opacity-70"
                    />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    {/* Botón Marcar Diseño Completado */}
                    {!isDesignCompleted ? (
                        <button
                            type="button"
                            disabled={isSaving || !isDesignerOrAdmin}
                            onClick={handleCompleteDesign}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-[18px]">check_box</span>
                            <span>{isSaving ? 'Guardando...' : 'Marcar Diseño Completado'}</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <span className="material-symbols-outlined text-[20px]">task_alt</span>
                            <span>El diseño fue completado por {specs.designCompletedBy || 'el Diseñador'}.</span>
                        </div>
                    )}

                    {/* Selector y Asignación a Joyero */}
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <select
                                value={selectedJeweler}
                                disabled={!isDesignCompleted || isAssigning || !isDesignerOrAdmin}
                                onChange={(e) => setSelectedJeweler(e.target.value)}
                                className="w-full bg-muted/50 border border-border rounded-xl py-2.5 px-3.5 text-xs text-foreground focus:border-indigo-500 outline-none appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">Seleccionar Joyero...</option>
                                {jewelersList.map(j => (
                                    <option key={j.id} value={j.name || j.email}>
                                        {j.name || j.email}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                                <span className="material-symbols-outlined text-base">unfold_more</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={!isDesignCompleted || !selectedJeweler.trim() || isAssigning || !isDesignerOrAdmin}
                            onClick={handleAssignJeweler}
                            title={!isDesignCompleted ? 'Primero complete el diseño para habilitar la asignación al Joyero' : 'Asignar al Joyero'}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined text-[18px]">send</span>
                            <span>{isAssigning ? 'Asignando...' : 'Asignar a Joyero'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};
