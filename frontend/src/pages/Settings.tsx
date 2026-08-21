import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const ThemeOption: React.FC<{ id: 'pitaya' | 'notion', name: string, desc: string, previewClass: string }> = ({ id, name, desc, previewClass }) => {
    const { variant, setVariant } = useTheme();
    const isActive = variant === id;

    return (
        <button
            onClick={() => setVariant(id)}
            className={`flex flex-col gap-4 p-6 rounded-[32px] border-2 transition-all text-left group ${isActive ? 'border-primary bg-primary/5 shadow-xl scale-[1.02]' : 'border-border bg-card hover:border-primary/30'
                }`}
        >
            <div className={`w-full aspect-video rounded-2xl border border-border overflow-hidden transition-colors ${previewClass}`}>
                <div className="p-3 flex flex-col gap-2 h-full">
                    <div className="h-2 w-1/2 rounded-full bg-slate-400/20"></div>
                    <div className="h-2 w-3/4 rounded-full bg-slate-400/10"></div>
                    <div className="mt-auto flex gap-2">
                        <div className="size-4 rounded-full bg-indigo-500/20"></div>
                        <div className="size-4 rounded-full bg-indigo-500/40"></div>
                    </div>
                </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-1">
                    <h4 className="text-foreground text-xs font-black uppercase tracking-widest">{name}</h4>
                    {isActive && <span className="material-symbols-outlined text-primary text-sm icon-fill">check_circle</span>}
                </div>
                <p className="text-muted-foreground text-[10px] font-medium leading-relaxed">{desc}</p>
            </div>
        </button>
    );
};

const SettingsPage: React.FC = () => {
    const { mode, toggleMode } = useTheme();
    const sections = [
        { title: 'Perfil del Atelier', icon: 'home_repair_service', description: 'Nombre, dirección e información comercial', path: '/settings/atelier' },
        { title: 'Usuarios y Permisos', icon: 'manage_accounts', description: 'Gestione su equipo y roles de acceso', path: '/settings/users' },
        { title: 'Procesos y Turnos', icon: 'confirmation_number', description: 'Reglas de asignación y flujo de atención', path: '/settings/queue' },
        { title: 'Notificaciones', icon: 'notifications_active', description: 'Alertas de pedidos y actualizaciones de inventario', path: '/settings/notifications' },
        { title: 'Integraciones', icon: 'api', description: 'Conecte su CRM, Webshop o pasarelas de pago', path: '/settings/integrations' },
        { title: 'Facturación', icon: 'account_balance_wallet', description: 'Suscripción, facturas e historial de pagos', path: '/settings/billing' },
        { title: 'Seguridad', icon: 'verified_user', description: 'Cambio de contraseña y 2FA', path: '/settings/security' },
    ];

    return (
        <div className="flex-1 flex flex-col items-center max-w-5xl mx-auto w-full">
            <div className="w-full flex flex-col gap-10">
                <div>
                    <h1 className="text-foreground text-4xl font-black tracking-tight font-display transition-colors">Configuración</h1>
                    <p className="text-muted-foreground text-sm font-medium mt-2 transition-colors">Personalice su experiencia y gestione los parámetros de Luxury OS.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sections.map(section => (
                        <Link
                            key={section.title}
                            to={section.path}
                            className="group flex items-start gap-6 p-8 rounded-3xl bg-card border border-border hover:border-indigo-500/50 transition-all text-left backdrop-blur-sm shadow-sm hover:shadow-xl duration-500"
                        >
                            <div className="size-14 rounded-2xl bg-muted border border-border flex items-center justify-center shrink-0 group-hover:bg-foreground group-hover:text-background transition-all shadow-xl duration-300">
                                <span className="material-symbols-outlined text-[28px]">{section.icon}</span>
                            </div>
                            <div className="flex-1 pt-1">
                                <h3 className="text-foreground text-base font-black uppercase tracking-widest leading-none mb-2 transition-colors">{section.title}</h3>
                                <p className="text-muted-foreground text-sm font-medium leading-relaxed transition-colors">{section.description}</p>
                            </div>
                            <span className="material-symbols-outlined text-muted-foreground/30 group-hover:text-foreground transition-colors self-center">chevron_right</span>
                        </Link>
                    ))}
                </div>

                <div className="mt-4">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-foreground text-lg font-black uppercase tracking-widest font-display transition-colors">Personalización Visual</h2>
                            <p className="text-muted-foreground text-xs font-medium mt-1 uppercase tracking-widest">Selecciona el ADN visual de tu espacio de trabajo</p>
                        </div>
                        <button
                            onClick={toggleMode}
                            className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-muted border border-border hover:border-primary/50 transition-all shadow-sm"
                        >
                            <span className="material-symbols-outlined text-xl">
                                {mode === 'light' ? 'dark_mode' : 'light_mode'}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {mode === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
                            </span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <ThemeOption
                            id="pitaya"
                            name="Estilo Pitaya"
                            desc="El original. Look Premium, contrastes marcados y acabado de lujo."
                            previewClass={mode === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'}
                        />
                        <ThemeOption
                            id="notion"
                            name="Estilo Notion"
                            desc="Minimalismo funcional. Tonos suaves y estética ultra limpia."
                            previewClass={mode === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white border-l-[16px] border-l-[#f7f6f3] border-t border-t-[#f7f6f3]'}
                        />
                    </div>
                </div>

                <div className="mt-6 p-8 rounded-3xl bg-muted/30 border border-border/50 flex items-center justify-between transition-colors shadow-inner">
                    <div className="flex items-center gap-4">
                        <div className="size-3 rounded-full bg-emerald-500 animate-pulse"></div>
                        <div>
                            <p className="text-foreground text-xs font-black uppercase tracking-widest transition-colors">Sistema Actualizado</p>
                            <p className="text-muted-foreground/50 text-[10px] uppercase tracking-widest mt-1 transition-colors">Luxury OS v1.2.4 (Jewelry Atelier Edition)</p>
                        </div>
                    </div>
                    <button className="px-6 py-2.5 rounded-xl border border-border text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-foreground hover:border-indigo-500/50 transition-all">
                        Ver Changelog
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
