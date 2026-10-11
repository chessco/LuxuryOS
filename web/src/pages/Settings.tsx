import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

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
    const [clearing, setClearing] = useState(false);
    
    // Auth info
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

    const handleClearDemoData = async () => {
        const confirm1 = window.confirm(
            '⚠️ ATENCIÓN: Esta acción eliminará permanentemente todas las órdenes (reparaciones, fabricaciones, apartados), el historial de turnos y todos los clientes registrados en la base de datos de pruebas.\n\n¿Deseas continuar?'
        );
        if (!confirm1) return;

        const confirm2 = window.prompt(
            'Para confirmar la eliminación permanente de todos los datos de pruebas, escribe "BORRAR TODO" a continuación:'
        );
        if (confirm2 !== 'BORRAR TODO') {
            alert('Confirmación incorrecta. Acción cancelada.');
            return;
        }

        try {
            setClearing(true);
            await api.post('/settings/clear-demo-data');
            
            // Clean local mock inventory from localStorage if any exists
            localStorage.removeItem('inventory_data');
            
            alert('¡Datos de prueba eliminados exitosamente! La sucursal ha quedado limpia.');
            window.location.reload();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Error al eliminar los datos de prueba.');
        } finally {
            setClearing(false);
        }
    };

    const sections = [
        { title: 'Perfil del Atelier', icon: 'home_repair_service', description: 'Nombre, dirección e información comercial', path: '/settings/atelier' },
        { title: 'Usuarios del Equipo', icon: 'manage_accounts', description: 'Gestione su equipo y cuentas de usuario', path: '/settings/users' },
        { title: 'Permisos por Rol (RBAC)', icon: 'admin_panel_settings', description: 'Defina qué puede ver y hacer cada rol (Joyero, Vendedor, Admin)', path: '/settings/rbac' },
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

                {/* Danger Zone for System Admin only */}
                {isSystemAdmin && (
                    <div className="mt-6 p-8 rounded-3xl bg-red-500/5 border border-red-500/20 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between transition-colors shadow-sm">
                        <div className="flex items-start gap-4">
                            <span className="material-symbols-outlined text-red-500 text-[32px] mt-1">warning</span>
                            <div>
                                <h3 className="text-red-500 text-sm font-black uppercase tracking-widest transition-colors">Zona de Peligro – Acciones del Sistema</h3>
                                <p className="text-muted-foreground text-xs font-medium leading-relaxed mt-1 transition-colors">
                                    Elimina de forma permanente todas las órdenes, clientes, inventarios y el historial de turnos de prueba. Esta acción no se puede deshacer.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClearDemoData}
                            disabled={clearing}
                            className="w-full md:w-auto px-6 py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 whitespace-nowrap"
                        >
                            {clearing ? 'Limpiando...' : 'Borrar Datos de Pruebas'}
                        </button>
                    </div>
                )}

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
