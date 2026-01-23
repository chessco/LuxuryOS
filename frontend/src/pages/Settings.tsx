import React from 'react';
import { Link } from 'react-router-dom';

const SettingsPage: React.FC = () => {
    const sections = [
        { title: 'Perfil del Atelier', icon: 'home_repair_service', description: 'Nombre, dirección e información comercial', path: '/settings/atelier' },
        { title: 'Usuarios y Permisos', icon: 'manage_accounts', description: 'Gestione su equipo y roles de acceso', path: '/settings/users' },
        { title: 'Notificaciones', icon: 'notifications_active', description: 'Alertas de pedidos y actualizaciones de inventario', path: '/settings/notifications' },
        { title: 'Integraciones', icon: 'api', description: 'Conecte su CRM, Webshop o pasarelas de pago', path: '/settings/integrations' },
        { title: 'Facturación', icon: 'account_balance_wallet', description: 'Suscripción, facturas e historial de pagos', path: '/settings/billing' },
        { title: 'Seguridad', icon: 'verified_user', description: 'Cambio de contraseña y 2FA', path: '/settings/security' },
    ];

    return (
        <div className="flex-1 flex flex-col items-center max-w-5xl mx-auto w-full">
            <div className="w-full flex flex-col gap-10">
                <div>
                    <h1 className="text-zinc-900 dark:text-white text-4xl font-black tracking-tight font-display transition-colors">Configuración</h1>
                    <p className="text-zinc-500 text-sm font-medium mt-2 transition-colors">Personalice su experiencia y gestione los parámetros de Luxury OS.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sections.map(section => (
                        <Link
                            key={section.title}
                            to={section.path}
                            className="group flex items-start gap-6 p-8 rounded-3xl bg-white dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-left backdrop-blur-sm shadow-sm hover:shadow-xl dark:shadow-none"
                        >
                            <div className="size-14 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-zinc-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all shadow-xl duration-300">
                                <span className="material-symbols-outlined text-[28px]">{section.icon}</span>
                            </div>
                            <div className="flex-1 pt-1">
                                <h3 className="text-zinc-900 dark:text-white text-base font-black uppercase tracking-widest leading-none mb-2 transition-colors">{section.title}</h3>
                                <p className="text-zinc-500 dark:text-zinc-600 text-sm font-medium leading-relaxed group-hover:text-zinc-700 dark:group-hover:text-zinc-400 transition-colors">{section.description}</p>
                            </div>
                            <span className="material-symbols-outlined text-zinc-300 dark:text-zinc-800 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors self-center">chevron_right</span>
                        </Link>
                    ))}
                </div>

                <div className="mt-6 p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-900/50 flex items-center justify-between transition-colors shadow-inner">
                    <div className="flex items-center gap-4">
                        <div className="size-3 rounded-full bg-emerald-500 animate-pulse"></div>
                        <div>
                            <p className="text-zinc-900 dark:text-white text-xs font-black uppercase tracking-widest transition-colors">Sistema Actualizado</p>
                            <p className="text-zinc-400 dark:text-zinc-600 text-[10px] uppercase tracking-widest mt-1 transition-colors">Luxury OS v1.2.4 (Jewelry Atelier Edition)</p>
                        </div>
                    </div>
                    <button className="px-6 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-700 transition-all">
                        Ver Changelog
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
