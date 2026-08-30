import React, { useState, useEffect } from 'react';
import axios from 'axios';

const IntegrationsPage: React.FC = () => {
    const [settings, setSettings] = useState<Record<string, string>>({
        whatsapp_provider: 'FLOW',
        flow_api_url: '',
        flow_internal_key: '',
        pitayacore_api_url: '',
        pitayacore_api_key: '',
        pitayacore_tenant_id: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSettings(prev => ({ 
                whatsapp_provider: 'PITAYACORE',
                pitayacore_api_url: 'https://pitayacore-api.pitayacode.io/api',
                pitayacore_api_key: 'pitaya_internal_secret_2026',
                pitayacore_tenant_id: '87e0dd95-fd29-4e63-a219-18478c58e4c8',
                ...prev, 
                ...response.data 
            }));
        } catch (error) {
            console.error('Error fetching settings:', error);
            alert('No se pudieron cargar las configuraciones');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${import.meta.env.VITE_API_URL}/settings`, settings, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Configuraciones guardadas con éxito');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Error al guardar las configuraciones');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center max-w-5xl mx-auto w-full">
            <div className="w-full flex flex-col gap-10">
                <div>
                    <h1 className="text-foreground text-4xl font-black tracking-tight font-display transition-colors">Integraciones</h1>
                    <p className="text-muted-foreground text-sm font-medium mt-2 transition-colors">Conecte Luxury OS con herramientas externas para potenciar su flujo de trabajo.</p>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {/* Flow Integration Card */}
                    <div className="group relative overflow-hidden p-8 rounded-[40px] bg-card border border-border shadow-2xl backdrop-blur-md">
                        <div className="absolute top-0 right-0 p-8">
                             <div className="size-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <span className="material-symbols-outlined text-[40px]">chat_bubble</span>
                             </div>
                        </div>

                        <div className="max-w-2xl w-full">
                            <h2 className="text-2xl font-black uppercase tracking-wider mb-2">WhatsApp Bot</h2>
                            <p className="text-muted-foreground text-sm font-medium mb-8 leading-relaxed">
                                Automatice las notificaciones de turnos y recordatorios al WhatsApp de sus clientes seleccionando entre la integración oficial o una API externa basada en una librería JS.
                            </p>

                            <div className="flex flex-col gap-2 mb-8">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Proveedor de WhatsApp Activo</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSettings(s => ({ ...s, whatsapp_provider: 'FLOW' }))}
                                        className={`py-4 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition ${
                                            (settings.whatsapp_provider || 'FLOW') === 'FLOW'
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                                : 'border-border bg-muted/30 text-muted-foreground hover:border-indigo-500/50 hover:text-foreground'
                                        }`}
                                    >
                                        Meta Oficial (Flow)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSettings(s => ({ ...s, whatsapp_provider: 'PITAYACORE' }))}
                                        className={`py-4 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition ${
                                            settings.whatsapp_provider === 'PITAYACORE'
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                                : 'border-border bg-muted/30 text-muted-foreground hover:border-indigo-500/50 hover:text-foreground'
                                        }`}
                                    >
                                        Librería JS (PitayaCore)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSettings(s => ({ ...s, whatsapp_provider: 'LINKS' }))}
                                        className={`py-4 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition ${
                                            settings.whatsapp_provider === 'LINKS'
                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                                : 'border-border bg-muted/30 text-muted-foreground hover:border-emerald-500/50 hover:text-foreground'
                                        }`}
                                    >
                                        🔗 Links (WA Web)
                                    </button>
                                </div>
                            </div>

                            {settings.whatsapp_provider === 'LINKS' ? (
                                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 flex flex-col gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-emerald-500 text-[20px]">link</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-foreground">WhatsApp Web — Sin configuración requerida</p>
                                            <p className="text-xs text-muted-foreground font-medium">No necesitas API ni credenciales. Todo funciona con links directos.</p>
                                        </div>
                                    </div>
                                    <ul className="grid grid-cols-1 gap-2 pl-1">
                                        {[
                                            { icon: 'smartphone', label: 'Botón "WA App"', desc: 'Abre WhatsApp nativo con el mensaje pre-cargado' },
                                            { icon: 'language', label: 'Botón "WA Web"', desc: 'Abre web.whatsapp.com directamente en el navegador' },
                                            { icon: 'pin', label: 'Código de país México +52', desc: 'Se agrega automáticamente en números de 10 dígitos' },
                                        ].map(({ icon, label, desc }) => (
                                            <li key={label} className="flex items-start gap-3 py-2 border-b border-emerald-500/10 last:border-0">
                                                <span className="material-symbols-outlined text-[15px] text-emerald-500 mt-0.5">{icon}</span>
                                                <div>
                                                    <span className="text-xs font-black text-foreground">{label}</span>
                                                    <span className="text-xs text-muted-foreground font-medium"> — {desc}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="text-[10px] font-medium text-muted-foreground/60 mt-1">
                                        El usuario final debe tener WhatsApp iniciado en su navegador o app para recibir el mensaje.
                                    </p>
                                </div>
                            ) : (settings.whatsapp_provider || 'FLOW') === 'FLOW' ? (
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Flow API URL</label>
                                        <input 
                                            type="text" 
                                            value={settings.flow_api_url || ''}
                                            onChange={(e) => setSettings({ ...settings, flow_api_url: e.target.value })}
                                            placeholder="https://flow-api.pitayacode.io"
                                            className="bg-muted/50 border border-border rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Internal API Key</label>
                                        <div className="relative">
                                            <input 
                                                type="password" 
                                                value={settings.flow_internal_key || ''}
                                                onChange={(e) => setSettings({ ...settings, flow_internal_key: e.target.value })}
                                                placeholder="••••••••••••••••"
                                                className="w-full bg-muted/50 border border-border rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground/30">key</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">PitayaCore API URL</label>
                                        <input 
                                            type="text" 
                                            value={settings.pitayacore_api_url || ''}
                                            onChange={(e) => setSettings({ ...settings, pitayacore_api_url: e.target.value })}
                                            placeholder="https://pitayacore-api.pitayacode.io/api"
                                            className="bg-muted/50 border border-border rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">PitayaCore API Key (Connection Token)</label>
                                        <div className="relative">
                                            <input 
                                                type="password" 
                                                value={settings.pitayacore_api_key || ''}
                                                onChange={(e) => setSettings({ ...settings, pitayacore_api_key: e.target.value })}
                                                placeholder="••••••••••••••••"
                                                className="w-full bg-muted/50 border border-border rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground/30">key</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Tenant ID de CRED en PitayaCore</label>
                                        <input 
                                            type="text" 
                                            value={settings.pitayacore_tenant_id || ''}
                                            onChange={(e) => setSettings({ ...settings, pitayacore_tenant_id: e.target.value })}
                                            placeholder="Escribe el tenant id (ej. 87E0D095)"
                                            className="bg-muted/50 border border-border rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="mt-10 flex items-center gap-4">
                                <button 
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-10 py-4 rounded-2xl bg-foreground text-background font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-3 shadow-xl"
                                >
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                    {!saving && <span className="material-symbols-outlined text-sm">save</span>}
                                </button>
                                
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Servicio Activo</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Placeholder for other integrations */}
                    <div className="opacity-40 grayscale pointer-events-none p-8 rounded-[40px] border border-dashed border-border flex items-center justify-between">
                         <div className="flex items-center gap-6">
                            <div className="size-14 rounded-2xl bg-muted border border-border flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl">shopping_cart</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest">Shopify Integration</h3>
                                <p className="text-xs font-medium">Próximamente</p>
                            </div>
                         </div>
                         <span className="material-symbols-outlined">lock</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IntegrationsPage;
