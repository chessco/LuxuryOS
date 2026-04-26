import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

interface QueueSettingsData {
    assignmentMethod: 'MANUAL' | 'ROUND_ROBIN' | 'LOAD_BALANCED';
    maxTicketsPerStaff: number;
    enableStaffNotifications: boolean;
    autoBumpVIP: boolean;
    assignmentCooldown: number;
}

const DEFAULT_SETTINGS: QueueSettingsData = {
    assignmentMethod: 'MANUAL',
    maxTicketsPerStaff: 1,
    enableStaffNotifications: true,
    autoBumpVIP: true,
    assignmentCooldown: 2
};

const QueueSettings: React.FC = () => {
    const { variant } = useTheme();
    const [settings, setSettings] = useState<QueueSettingsData>(DEFAULT_SETTINGS);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('queue_settings');
        if (stored) {
            try {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
    }, []);

    const handleChange = (field: keyof QueueSettingsData, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const handleSave = () => {
        localStorage.setItem('queue_settings', JSON.stringify(settings));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden max-w-4xl mx-auto w-full p-4 md:p-8">
            <header className="flex items-center gap-4 mb-8">
                <Link to="/settings" className="p-2 -ml-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                    <h1 className="text-foreground text-3xl font-black tracking-tight font-display">Procesos y Turnos</h1>
                    <p className="text-muted-foreground text-sm font-medium">Configuración de asignación y flujo de atención</p>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto space-y-8 pb-10 custom-scrollbar">

                {/* Method Section */}
                <section className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="size-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <span className="material-symbols-outlined">alt_route</span>
                        </div>
                        <div>
                            <h3 className="text-foreground text-lg font-bold">Método de Asignación</h3>
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mt-1">Cómo se distribuyen los tickets al personal</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { id: 'MANUAL', label: 'Manual (Pull)', desc: 'El staff toma los tickets manualmente desde la lista.', icon: 'touch_app' },
                            { id: 'ROUND_ROBIN', label: 'Round Robin', desc: 'Asignación circular automática y equitativa.', icon: 'sync' },
                            { id: 'LOAD_BALANCED', label: 'Carga Balanceada', desc: 'Asigna al staff con menos tickets activos.', icon: 'balance' }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => handleChange('assignmentMethod', opt.id)}
                                className={`flex flex-col gap-3 p-5 rounded-2xl border transition-all text-left group ${settings.assignmentMethod === opt.id
                                        ? 'bg-foreground text-background border-foreground shadow-xl scale-[1.02]'
                                        : 'bg-muted/30 border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-2xl">{opt.icon}</span>
                                <div>
                                    <h4 className="font-bold text-sm uppercase tracking-wide">{opt.label}</h4>
                                    <p className={`text-[10px] mt-1 ${settings.assignmentMethod === opt.id ? 'opacity-80' : 'opacity-60'}`}>{opt.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Rules Section */}
                <section className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <span className="material-symbols-outlined">tune</span>
                        </div>
                        <div>
                            <h3 className="text-foreground text-lg font-bold">Reglas y Límites</h3>
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mt-1">Saturación y prioridades</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/50">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-muted-foreground">group_add</span>
                                <div>
                                    <h4 className="text-foreground font-bold text-sm">Tickets Simultáneos</h4>
                                    <p className="text-muted-foreground text-xs">Máximo de clientes atendidos a la vez por agente</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-xl font-black tabular-nums">{settings.maxTicketsPerStaff}</span>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="1"
                                    value={settings.maxTicketsPerStaff}
                                    onChange={(e) => handleChange('maxTicketsPerStaff', parseInt(e.target.value))}
                                    className="w-32 accent-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/50">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-muted-foreground">timer</span>
                                <div>
                                    <h4 className="text-foreground font-bold text-sm">Cooldown de Asignación</h4>
                                    <p className="text-muted-foreground text-xs">Minutos de espera antes de asignar otro ticket (Auto)</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2">
                                <input
                                    type="number"
                                    value={settings.assignmentCooldown}
                                    onChange={(e) => handleChange('assignmentCooldown', parseInt(e.target.value))}
                                    className="w-12 py-1 bg-transparent text-right font-bold outline-none"
                                />
                                <span className="text-xs font-bold text-muted-foreground pr-1">min</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/50">
                            <div className="flex items-center gap-3">
                                <div className={`size-8 rounded-lg flex items-center justify-center transition-colors ${settings.autoBumpVIP ? 'bg-amber-500/20 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
                                    <span className="material-symbols-outlined text-lg">diamond</span>
                                </div>
                                <div>
                                    <h4 className="text-foreground font-bold text-sm">Prioridad VIP Automática</h4>
                                    <p className="text-muted-foreground text-xs">Subir clientes VIP al inicio de la fila automáticamente</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.autoBumpVIP}
                                    onChange={(e) => handleChange('autoBumpVIP', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/50">
                            <div className="flex items-center gap-3">
                                <div className={`size-8 rounded-lg flex items-center justify-center transition-colors ${settings.enableStaffNotifications ? 'bg-blue-500/20 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
                                    <span className="material-symbols-outlined text-lg">notifications</span>
                                </div>
                                <div>
                                    <h4 className="text-foreground font-bold text-sm">Notificaciones al Staff</h4>
                                    <p className="text-muted-foreground text-xs">Alertar al personal cuando se les asigna un ticket</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.enableStaffNotifications}
                                    onChange={(e) => handleChange('enableStaffNotifications', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                            </label>
                        </div>
                    </div>
                </section>
            </div>

            <div className="flex items-center justify-end pt-6 border-t border-border">
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-foreground text-background px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg hover:opacity-90 active:scale-95 transition-all"
                >
                    {saved ? (
                        <>
                            <span className="material-symbols-outlined">check</span>
                            <span>Guardado</span>
                        </>
                    ) : (
                        <span>Guardar Cambios</span>
                    )}
                </button>
            </div>
        </div>
    );
};

export default QueueSettings;
