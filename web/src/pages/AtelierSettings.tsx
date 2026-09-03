import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

import api from '../services/api';

interface AtelierSettingsData {
    name: string;
    address: string;
    phone: string;
    email: string;
    taxId: string;
    currency: string;
    labelCodeType: 'BARCODE' | 'QR';
    trackingExpirationDays: number;
}

const DEFAULT_SETTINGS: AtelierSettingsData = {
    name: 'Cared',
    address: 'Plaza Tutuli',
    phone: '+52 55 1234 5678',
    email: 'contacto@luxuryatelier.com',
    taxId: 'LUX123456789',
    currency: 'MXN',
    labelCodeType: 'BARCODE',
    trackingExpirationDays: 15
};

const AtelierSettings: React.FC = () => {
    const { variant } = useTheme();
    const [settings, setSettings] = useState<AtelierSettingsData>(DEFAULT_SETTINGS);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            const stored = localStorage.getItem('atelier_settings');
            let current = stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
            const storedCodeType = localStorage.getItem('label_code_type');
            if (storedCodeType) current.labelCodeType = storedCodeType;
            try {
                const { data: apiSettings } = await api.get('/settings');
                if (apiSettings) {
                    if (apiSettings.atelier_name) current.name = apiSettings.atelier_name;
                    if (apiSettings.atelier_address) current.address = apiSettings.atelier_address;
                    if (apiSettings.atelier_phone) current.phone = apiSettings.atelier_phone;
                    if (apiSettings.atelier_email) current.email = apiSettings.atelier_email;
                    if (apiSettings.atelier_tax_id) current.taxId = apiSettings.atelier_tax_id;
                    if (apiSettings.atelier_currency) current.currency = apiSettings.atelier_currency;
                    if (apiSettings.label_code_type) current.labelCodeType = apiSettings.label_code_type;
                    if (apiSettings.tracking_expiration_days) current.trackingExpirationDays = parseInt(apiSettings.tracking_expiration_days, 10);
                }
            } catch (e) {
                console.error("Failed to load settings from API", e);
            }
            setSettings({ ...DEFAULT_SETTINGS, ...current });
        };
        loadSettings();
    }, []);

    const handleChange = (field: keyof AtelierSettingsData, value: string) => {
        setSettings(prev => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const handleSave = async () => {
        localStorage.setItem('atelier_settings', JSON.stringify(settings));
        localStorage.setItem('label_code_type', settings.labelCodeType);
        try {
            await api.post('/settings', {
                atelier_name: settings.name,
                atelier_address: settings.address,
                atelier_phone: settings.phone,
                atelier_email: settings.email,
                atelier_tax_id: settings.taxId,
                atelier_currency: settings.currency,
                label_code_type: settings.labelCodeType,
                tracking_expiration_days: String(settings.trackingExpirationDays || 15),
            });
        } catch (e) {
            console.error("Failed to save settings to API", e);
        }
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

                {/* Label Code Type Section */}
                <section className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="size-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <span className="material-symbols-outlined">qr_code_scanner</span>
                        </div>
                        <div>
                            <h3 className="text-foreground text-lg font-bold">Formato de Código en Etiquetas</h3>
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mt-1">Selecciona el tipo de código a imprimir en las etiquetas de pedido</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => handleChange('labelCodeType', 'BARCODE')}
                            className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                                settings.labelCodeType === 'BARCODE'
                                    ? 'border-indigo-600 bg-indigo-500/10 shadow-md'
                                    : 'border-border bg-muted/20 hover:border-border/80'
                            }`}
                        >
                            <div className={`size-12 rounded-xl flex items-center justify-center ${
                                settings.labelCodeType === 'BARCODE' ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground'
                            }`}>
                                <span className="material-symbols-outlined text-2xl">barcode</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black uppercase tracking-wider text-foreground">Código de Barras</h4>
                                    {settings.labelCodeType === 'BARCODE' && (
                                        <span className="material-symbols-outlined text-indigo-500 text-sm">check_circle</span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">Estándar lineal Code 128</p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleChange('labelCodeType', 'QR')}
                            className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                                settings.labelCodeType === 'QR'
                                    ? 'border-indigo-600 bg-indigo-500/10 shadow-md'
                                    : 'border-border bg-muted/20 hover:border-border/80'
                            }`}
                        >
                            <div className={`size-12 rounded-xl flex items-center justify-center ${
                                settings.labelCodeType === 'QR' ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground'
                            }`}>
                                <span className="material-symbols-outlined text-2xl">qr_code_2</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black uppercase tracking-wider text-foreground">Código QR</h4>
                                    {settings.labelCodeType === 'QR' && (
                                        <span className="material-symbols-outlined text-indigo-500 text-sm">check_circle</span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">Matriz bidimensional 2D</p>
                            </div>
                        </button>
                    </div>
                </section>

                {/* Tracking Security & Expiration Settings */}
                <section className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-border">
                        <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-xl">share_location</span>
                        </div>
                        <div>
                            <h3 className="text-base font-black uppercase tracking-wider text-foreground">Seguimiento Público de Pedidos</h3>
                            <p className="text-xs text-muted-foreground font-medium">Control de vigencia y seguridad de enlaces compartidos</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-muted/20 border border-border">
                            <div className="space-y-1">
                                <h4 className="text-sm font-black uppercase tracking-wider text-foreground">Vigencia tras Entrega (Días)</h4>
                                <p className="text-xs text-muted-foreground max-w-md">
                                    Días durante los cuales el cliente podrá consultar el enlace de seguimiento una vez que el pedido esté en estado <strong>ENTREGADO</strong>. Tras este periodo, el enlace se desactivará automáticamente.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={settings.trackingExpirationDays || 15}
                                    onChange={(e) => handleChange('trackingExpirationDays', e.target.value as any)}
                                    className="w-24 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground font-bold text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                                <span className="text-xs font-bold text-muted-foreground">días</span>
                            </div>
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
