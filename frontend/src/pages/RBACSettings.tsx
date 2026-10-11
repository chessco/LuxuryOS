import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    RBACService,
    RoleName,
    PermissionKey,
    PERMISSION_DEFINITIONS,
    DEFAULT_ROLE_PERMISSIONS,
    RolePermissionsMatrix
} from '../services/rbac.service';

const ROLES: { key: RoleName; label: string; description: string; badgeColor: string }[] = [
    {
        key: 'TENANT_ADMIN',
        label: 'Administrador (Admin)',
        description: 'Control operativo total del taller, ventas y configuración.',
        badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    },
    {
        key: 'VENDEDOR',
        label: 'Vendedor / Asesor',
        description: 'Atención a clientes, creación de pedidos, pagos y seguimiento comercial.',
        badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    },
    {
        key: 'JOYERO',
        label: 'Joyero / Taller',
        description: 'Fabricación y reparación. Enfoque exclusivo en piezas técnicas y mano de obra.',
        badgeColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
    },
    {
        key: 'TENANT_USER',
        label: 'Usuario Estándar',
        description: 'Personal de soporte o visualizador limitado.',
        badgeColor: 'bg-muted text-muted-foreground border-border'
    },
    {
        key: 'SYSTEM_ADMIN',
        label: 'System Admin (Super)',
        description: 'Acceso global para soporte técnico y mantenimiento de infraestructura.',
        badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
    }
];

export default function RBACSettings() {
    const [matrix, setMatrix] = useState<RolePermissionsMatrix>(DEFAULT_ROLE_PERMISSIONS);
    const [selectedRole, setSelectedRole] = useState<RoleName>('JOYERO');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await RBACService.fetchPermissions();
        setMatrix(data);
        setLoading(false);
    };

    const handleToggle = (role: RoleName, perm: PermissionKey) => {
        setMatrix(prev => ({
            ...prev,
            [role]: {
                ...prev[role],
                [perm]: !prev[role][perm]
            }
        }));
    };

    const handleResetDefaults = () => {
        if (window.confirm('¿Deseas restaurar la configuración recomendada para todos los roles?')) {
            setMatrix(DEFAULT_ROLE_PERMISSIONS);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveStatus(null);
        try {
            await RBACService.savePermissions(matrix);
            setSaveStatus('¡Permisos RBAC guardados y aplicados correctamente en el sistema!');
            setTimeout(() => setSaveStatus(null), 4000);
        } catch (error: any) {
            setSaveStatus('Error al guardar en el servidor: ' + (error?.message || 'Error'));
        } finally {
            setSaving(false);
        }
    };

    const categories = Array.from(new Set(PERMISSION_DEFINITIONS.map(p => p.category)));

    return (
        <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full gap-8">
            <div>
                <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
                    <Link to="/settings" className="hover:text-foreground transition-colors">Configuración</Link>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    <span className="text-foreground/70">Control de Roles y Permisos (RBAC)</span>
                </nav>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-foreground text-3xl sm:text-4xl font-black tracking-tight font-display transition-colors">
                            Control de Accesos por Rol (RBAC)
                        </h1>
                        <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-1">
                            Configura qué información financiera, datos del cliente y funciones operativas puede ver y usar cada rol.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={handleResetDefaults}
                            className="flex-1 md:flex-initial px-4 py-3 rounded-2xl bg-muted border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all shadow-sm"
                        >
                            Restablecer
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 md:flex-initial px-6 py-3 rounded-2xl bg-foreground text-background text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-[18px]">save</span>
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </div>
            </div>

            {saveStatus && (
                <div className={`p-4 rounded-2xl border text-xs font-bold uppercase tracking-wider flex items-center gap-3 ${
                    saveStatus.startsWith('Error') 
                        ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                }`}>
                    <span className="material-symbols-outlined text-[20px]">
                        {saveStatus.startsWith('Error') ? 'error' : 'check_circle'}
                    </span>
                    <span>{saveStatus}</span>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {ROLES.map(role => {
                    const isSelected = selectedRole === role.key;
                    return (
                        <button
                            key={role.key}
                            onClick={() => setSelectedRole(role.key)}
                            className={`p-4 rounded-3xl border text-left transition-all flex flex-col justify-between gap-3 ${
                                isSelected
                                    ? 'bg-card border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                                    : 'bg-card/50 border-border hover:border-indigo-500/40 opacity-80 hover:opacity-100'
                            }`}
                        >
                            <div className="flex items-center justify-between w-full">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${role.badgeColor}`}>
                                    {role.key}
                                </span>
                                {isSelected && (
                                    <span className="material-symbols-outlined text-indigo-500 text-[18px]">check_circle</span>
                                )}
                            </div>
                            <div>
                                <h3 className="text-foreground text-xs font-black uppercase tracking-wide">{role.label}</h3>
                                <p className="text-muted-foreground text-[10px] leading-tight line-clamp-2 mt-1">{role.description}</p>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="bg-card border border-border rounded-[36px] p-6 sm:p-10 backdrop-blur-sm shadow-sm space-y-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-indigo-500 text-2xl">admin_panel_settings</span>
                            <h2 className="text-foreground text-xl font-black uppercase tracking-tight font-display">
                                Permisos para: {ROLES.find(r => r.key === selectedRole)?.label}
                            </h2>
                        </div>
                        <p className="text-muted-foreground text-xs font-medium mt-1">
                            Ajusta los accesos que aplican en pantalla cuando un usuario con este rol inicia sesión.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                const allActive = Object.values(matrix[selectedRole]).every(v => v);
                                setMatrix(prev => ({
                                    ...prev,
                                    [selectedRole]: Object.keys(prev[selectedRole]).reduce((acc, k) => {
                                        acc[k as PermissionKey] = !allActive;
                                        return acc;
                                    }, {} as Record<PermissionKey, boolean>)
                                }));
                            }}
                            className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground transition-all"
                        >
                            Alternar Todos
                        </button>
                    </div>
                </div>

                <div className="space-y-8">
                    {categories.map(cat => {
                        const permsInCat = PERMISSION_DEFINITIONS.filter(p => p.category === cat);
                        return (
                            <div key={cat} className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500/80 flex items-center gap-2">
                                    <span className="size-2 rounded-full bg-indigo-500"></span>
                                    {cat}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {permsInCat.map(perm => {
                                        const isChecked = matrix[selectedRole]?.[perm.key] ?? false;
                                        return (
                                            <div
                                                key={perm.key}
                                                onClick={() => handleToggle(selectedRole, perm.key)}
                                                className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                                                    isChecked
                                                        ? 'bg-indigo-500/5 border-indigo-500/30'
                                                        : 'bg-muted/30 border-border opacity-70 hover:opacity-100'
                                                }`}
                                            >
                                                <div className="space-y-1 pr-2">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-foreground text-xs font-black uppercase tracking-wide">
                                                            {perm.label}
                                                        </h4>
                                                        {selectedRole === 'JOYERO' && perm.key === 'view_payments' && (
                                                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                                                Protección Taller
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                                                        {perm.description}
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={isChecked}
                                                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors flex-shrink-0 ${
                                                        isChecked ? 'bg-indigo-600' : 'bg-muted border border-border'
                                                    }`}
                                                >
                                                    <div
                                                        className={`bg-white size-4 rounded-full shadow-md transform transition-transform ${
                                                            isChecked ? 'translate-x-6' : 'translate-x-0'
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
