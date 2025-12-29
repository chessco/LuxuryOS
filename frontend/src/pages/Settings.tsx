import React from 'react';

const SettingsPage: React.FC = () => {
    const sections = [
        { title: 'Perfil del Atelier', icon: 'storefront', description: 'Nombre, dirección e información comercial' },
        { title: 'Usuarios y Permisos', icon: 'badge', description: 'Gestione su equipo y roles de acceso' },
        { title: 'Notificaciones', icon: 'notifications', description: 'Alertas de pedidos y actualizaciones de inventario' },
        { title: 'Integraciones', icon: 'hub', description: 'Conecte su CRM, Webshop o pasarelas de pago' },
        { title: 'Facturación', icon: 'payments', description: 'Suscripción, facturas e historial de pagos' },
        { title: 'Seguridad', icon: 'security', description: 'Cambio de contraseña y 2FA' },
    ];

    return (
        <div className="flex-1 flex flex-col items-center max-w-5xl mx-auto w-full">
            <div className="w-full flex flex-col gap-10">
                <div>
                    <h1 className="text-white text-4xl font-black tracking-tight font-display">Configuración</h1>
                    <p className="text-zinc-500 text-sm font-medium mt-2">Personalice su experiencia y gestione los parámetros de Luxury OS.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sections.map(section => (
                        <button key={section.title} className="group flex items-start gap-6 p-8 rounded-3xl bg-zinc-900/30 border border-zinc-900 hover:border-zinc-700 transition-all text-left backdrop-blur-sm">
                            <div className="size-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-black transition-all shadow-xl duration-300">
                                <span className="material-symbols-outlined text-[28px]">{section.icon}</span>
                            </div>
                            <div className="flex-1 pt-1">
                                <h3 className="text-white text-base font-black uppercase tracking-widest leading-none mb-2">{section.title}</h3>
                                <p className="text-zinc-600 text-sm font-medium leading-relaxed group-hover:text-zinc-400 transition-colors">{section.description}</p>
                            </div>
                            <span className="material-symbols-outlined text-zinc-800 group-hover:text-white transition-colors self-center">chevron_right</span>
                        </button>
                    ))}
                </div>

                <div className="mt-6 p-8 rounded-3xl bg-zinc-950/50 border border-zinc-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="size-3 rounded-full bg-emerald-500 animate-pulse"></div>
                        <div>
                            <p className="text-white text-xs font-black uppercase tracking-widest">Sistema Actualizado</p>
                            <p className="text-zinc-600 text-[10px] uppercase tracking-widest mt-1">Luxury OS v1.2.4 (Jewelry Atelier Edition)</p>
                        </div>
                    </div>
                    <button className="px-6 py-2.5 rounded-xl border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-zinc-700 transition-all">
                        Ver Changelog
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
