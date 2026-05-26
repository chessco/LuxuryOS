import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

interface AtelierSettingsData {
    name: string;
    address: string;
    phone: string;
    email: string;
    taxId: string;
    currency: string;
}

const DEFAULT_SETTINGS: AtelierSettingsData = {
    name: 'Luxury Atelier',
    address: 'Av. Presidente Masaryk 123, Polanco, CDMX',
    phone: '+52 55 1234 5678',
    email: 'contacto@luxuryatelier.com',
    taxId: 'LUX123456789',
    currency: 'MXN'
};

const AtelierSettings: React.FC = () => {
    const { variant } = useTheme();
    const [settings, setSettings] = useState<AtelierSettingsData>(DEFAULT_SETTINGS);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('atelier_settings');
        if (stored) {
            try {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
    }, []);

    const handleChange = (field: keyof AtelierSettingsData, value: string) => {
        setSettings(prev => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const handleSave = () => {
        localStorage.setItem('atelier_settings', JSON.stringify(settings));
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
                    <h1 className="text-foreground text-3xl font-black tracking-tight font-display">Perfil del Atelier</h1>
                    <p className="text-muted-foreground text-sm font-medium">Nombre, dirección e información comercial</p>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto space-y-8 pb-10 custom-scrollbar">

                {/* Info Section */}
                <section className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <span className="material-symbols-outlined">storefront</span>
                        </div>
                        <div>
                            <h3 className="text-foreground text-lg font-bold">Información General</h3>
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mt-1">Datos públicos de la joyería</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest px-1">Nombre Comercial</label>
                            <input
                                type="text"
                                value={settings.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest px-1">Dirección</label>
                            <input
                                type="text"
                                value={settings.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                                className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest px-1">Teléfono</label>
                                <input
                                    type="text"
                                    value={settings.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest px-1">Email Público</label>
                                <input
                                    type="email"
                                    value={settings.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Commercial Section */}
                <section className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <span className="material-symbols-outlined">receipt_long</span>
                        </div>
                        <div>
                            <h3 className="text-foreground text-lg font-bold">Datos Fiscales y Comerciales</h3>
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mt-1">Identificación para comprobantes y recibos</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest px-1">RFC / Tax ID</label>
                            <input
                                type="text"
                                value={settings.taxId}
                                onChange={(e) => handleChange('taxId', e.target.value)}
                                className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest px-1">Moneda Base</label>
                            <select
                                value={settings.currency}
                                onChange={(e) => handleChange('currency', e.target.value)}
                                className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="MXN">Pesos Mexicanos (MXN)</option>
                                <option value="USD">Dólares Estadounidenses (USD)</option>
                                <option value="EUR">Euros (EUR)</option>
                            </select>
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

export default AtelierSettings;
