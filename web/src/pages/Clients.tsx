import React, { useState, useEffect, useMemo } from 'react';
import {
    ClientsService,
    ClientType,
    ClientPortalAccess,
    CreateClientDto,
} from '../services/clients.service';
import { useLocation } from 'react-router-dom';
import { RBACService } from '../services/rbac.service';
import { ClientHistoryModal } from '../components/orders/ClientHistoryModal';

// Adapting Client interface for the view
export interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    type?: ClientType;
    portalAccess?: ClientPortalAccess;
    totalSpent: string;
    totalSpentNumber?: number | null;
    ordersCount?: number;
    lastOrder: string;
    initials: string;
    initialsColor: string;
    location?: string;
    tags?: string[];
    createdAt?: string;
}

type SegmentFilter = 'ALL' | ClientType;

const CLIENT_TYPE_OPTIONS: {
    value: ClientType;
    label: string;
    subtitle: string;
    icon: string;
}[] = [
    {
        value: 'RETAIL',
        label: 'Cliente Final',
        subtitle: 'Mostrador / Taller',
        icon: 'person',
    },
    {
        value: 'VIP',
        label: 'Cliente VIP',
        subtitle: 'Preferente',
        icon: 'workspace_premium',
    },
    {
        value: 'RESELLER',
        label: 'Revendedor',
        subtitle: 'Mayorista / POS',
        icon: 'storefront',
    },
];

const SONORA_CITIES = [
    'Cd Obregon, Sonora',
    'Hermosillo, Sonora',
    'Navojoa, Sonora',
    'Guaymas, Sonora',
    'Nogales, Sonora',
];

function suggestPortalUsername(name: string): string {
    const cleaned = String(name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '')
        .slice(0, 30);
    return cleaned || '';
}

function getClientTypeLabel(type?: ClientType): string {
    if (type === 'RESELLER') return 'Revendedor';
    if (type === 'VIP') return 'VIP';
    return 'Cliente Final';
}

export default function ClientsPage() {
    // --- CRUD State & Logic ---
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [historyClient, setHistoryClient] = useState<Client | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('ALL');
    const location = useLocation();

    const user = useMemo(() => {
        try {
            const raw = localStorage.getItem('user');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        } catch {}
        return RBACService.getCurrentUser();
    }, []);

    const role = RBACService.getEffectiveRole(user);
    const isAdmin = Boolean(
        role === 'SYSTEM_ADMIN' ||
        role === 'TENANT_ADMIN' ||
        user?.role === 'SYSTEM_ADMIN' ||
        user?.role === 'TENANT_ADMIN' ||
        String(user?.email || '').toLowerCase().includes('admin') ||
        String(user?.email || '').toLowerCase().includes('system')
    );
    const canViewTotalSpent = isAdmin;

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const search = params.get('search');
        if (search) {
            setSearchQuery(search);
        }
    }, [location.search]);

    const fetchClients = async () => {
        try {
            setIsLoading(true);
            const data = await ClientsService.getAll();
            setClients(data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const segmentCounts = useMemo(() => {
        const counts = { ALL: clients.length, RETAIL: 0, VIP: 0, RESELLER: 0 };
        for (const c of clients) {
            const t = c.type || 'RETAIL';
            if (t === 'RESELLER') counts.RESELLER += 1;
            else if (t === 'VIP') counts.VIP += 1;
            else counts.RETAIL += 1;
        }
        return counts;
    }, [clients]);

    const filteredClients = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return clients.filter((c) => {
            const clientType: ClientType = c.type || 'RETAIL';
            if (segmentFilter !== 'ALL' && clientType !== segmentFilter) {
                return false;
            }
            if (!q) return true;
            return (
                (c.name || '').toLowerCase().includes(q) ||
                (c.email || '').toLowerCase().includes(q) ||
                (c.phone || '').toLowerCase().includes(q) ||
                (c.portalAccess?.username || '').toLowerCase().includes(q)
            );
        });
    }, [clients, segmentFilter, searchQuery]);

    const handleDelete = async (id: string, name?: string) => {
        if (!isAdmin) {
            alert('Solo los administradores tienen permiso para eliminar clientes.');
            return;
        }
        const confirmMsg = name
            ? `¿Estás seguro de que deseas eliminar permanentemente al cliente "${name}"?\n\nEsta acción eliminará al cliente y todos sus registros asociados de forma irreversible.`
            : '¿Estás seguro de que deseas eliminar permanentemente este cliente y sus registros asociados?';

        if (window.confirm(confirmMsg)) {
            try {
                await ClientsService.delete(id);
                setClients(prev => prev.filter(c => c.id !== id));
                if (isModalOpen && editingClient?.id === id) {
                    setIsModalOpen(false);
                    setEditingClient(null);
                }
            } catch (error: any) {
                console.error('Error deleting client:', error);
                alert(error?.response?.data?.message || 'Error al eliminar el cliente');
            }
        }
    };

    const handleExportCSV = () => {
        if (!clients || clients.length === 0) {
            alert('No hay clientes registrados para exportar.');
            return;
        }

        const headers = [
            'ID',
            'Nombre',
            'Tipo de Cliente',
            'Usuario Portal',
            'Teléfono',
            'Correo Electrónico',
            'Ubicación',
            'Total Gastado',
            'Órdenes Totales',
            'Última Orden',
            'Fecha Registro',
        ];

        const escapeCSV = (val: any) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const rows = clients.map(c => [
            escapeCSV(c.id),
            escapeCSV(c.name),
            escapeCSV(getClientTypeLabel(c.type)),
            escapeCSV(c.portalAccess?.enabled ? (c.portalAccess.username || c.portalAccess.email || 'Activo') : '—'),
            escapeCSV(c.phone || ''),
            escapeCSV(c.email || ''),
            escapeCSV(c.location || ''),
            escapeCSV(c.totalSpent || (c.totalSpentNumber ? `${c.totalSpentNumber} MXN` : '0 MXN')),
            escapeCSV(c.ordersCount || 0),
            escapeCSV(c.lastOrder || '—'),
            escapeCSV(c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-MX') : '—'),
        ]);

        const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const today = new Date().toISOString().split('T')[0];
        link.href = url;
        link.setAttribute('download', `respaldo_clientes_luxuryos_${today}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleSave = async (clientData: CreateClientDto) => {
        if (!clientData.name || !clientData.name.trim()) {
            throw new Error('El nombre del cliente es obligatorio');
        }
        try {
            if (editingClient) {
                await ClientsService.update(editingClient.id, clientData);
            } else {
                await ClientsService.create(clientData);
            }
            await fetchClients();
            setIsModalOpen(false);
            setEditingClient(null);
        } catch (error: any) {
            console.error('Error saving client:', error);
            const apiMsg = error?.response?.data?.message;
            const message = Array.isArray(apiMsg)
                ? apiMsg.join(', ')
                : apiMsg || error?.message || 'Error al guardar el cliente';
            throw new Error(message);
        }
    };

    const openModal = (client?: Client) => {
        setEditingClient(client || null);
        setIsModalOpen(true);
    };

    // --- Helper for Segment Badge ---
    const StatusBadge = ({ status, type }: { status: string; type?: ClientType }) => {
        const resolvedType = type || (status === 'Revendedor' ? 'RESELLER' : status === 'VIP' ? 'VIP' : 'RETAIL');
        const styles: Record<ClientType, string> = {
            RESELLER: 'bg-red-500/10 text-red-500 border-red-500/25',
            VIP: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
            RETAIL: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        };
        const label =
            resolvedType === 'RESELLER'
                ? 'Revendedor'
                : resolvedType === 'VIP'
                    ? 'VIP'
                    : status || 'Active';

        return (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest border ${styles[resolvedType]}`}>
                {label}
            </span>
        );
    };

    return (
        <div className="flex flex-col gap-8">
            {/* Header Steps */}
            <div>
                <h1 className="text-foreground text-4xl font-black tracking-tight font-display transition-colors">Cartera de Clientes</h1>
                <p className="text-muted-foreground text-sm font-medium mt-2 transition-colors">Gestión de relaciones VIP, clientes de mostrador y red de revendedores.</p>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative w-full max-w-md group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-muted-foreground group-focus-within:text-foreground transition-colors">search</span>
                    </div>
                    <input
                        className="block w-full pl-10 pr-3 py-3 border border-border rounded-xl bg-muted/50 text-foreground placeholder-muted-foreground focus:border-indigo-500 outline-none text-sm transition-all shadow-sm"
                        placeholder="Buscar por nombre, email, teléfono o usuario portal..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportCSV}
                        disabled={clients.length === 0}
                        className="flex items-center gap-2 border border-border bg-muted/40 hover:bg-muted text-foreground px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Exportar cartera de clientes a formato CSV para respaldo"
                    >
                        <span className="material-symbols-outlined text-[20px] text-emerald-500">download</span>
                        <span>Exportar CSV</span>
                    </button>
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[20px]">person_add</span>
                        <span>Nuevo Cliente</span>
                    </button>
                </div>
            </div>

            {/* Segment Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
                {([
                    { key: 'ALL' as const, label: 'Todos', count: segmentCounts.ALL },
                    { key: 'RETAIL' as const, label: 'Clientes Finales', count: segmentCounts.RETAIL },
                    { key: 'VIP' as const, label: 'VIP', count: segmentCounts.VIP },
                    { key: 'RESELLER' as const, label: 'Revendedores', count: segmentCounts.RESELLER },
                ]).map((tab) => {
                    const active = segmentFilter === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setSegmentFilter(tab.key)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all flex items-center gap-2 ${
                                active
                                    ? tab.key === 'RESELLER'
                                        ? 'bg-red-500/15 text-red-400 border-red-500/40'
                                        : 'bg-foreground text-background border-foreground'
                                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/40'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span
                                className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                                    active
                                        ? 'bg-background/20 text-current'
                                        : 'bg-muted text-muted-foreground'
                                }`}
                            >
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Table Container */}
            <div className="bg-card border border-border rounded-3xl overflow-hidden backdrop-blur-sm shadow-sm transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Cliente</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Segmento / Portal</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Ubicación / Contacto</th>
                                {canViewTotalSpent && (
                                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Gastado</th>
                                )}
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr><td colSpan={canViewTotalSpent ? 5 : 4} className="py-10 text-center text-muted-foreground">Cargando clientes...</td></tr>
                            ) : filteredClients.map((client) => (
                                <tr key={client.id} className="group hover:bg-muted/30 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`size-10 rounded-full flex items-center justify-center text-xs font-black ${client.initialsColor}`}>
                                                {client.initials}
                                            </div>
                                            <div>
                                                <p className="text-foreground text-sm font-bold">{client.name}</p>
                                                <p className="text-muted-foreground text-xs">{client.email || '—'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col items-start gap-1.5">
                                            <StatusBadge status={client.status} type={client.type} />
                                            {client.type === 'RESELLER' && (
                                                client.portalAccess?.enabled ? (
                                                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        <span className="material-symbols-outlined text-[12px]">verified_user</span>
                                                        Portal: @{client.portalAccess.username || client.portalAccess.email}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                                                        Sin acceso portal
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-foreground text-xs font-medium">{client.location || 'Cd Obregon, Sonora'}</span>
                                            <span className="text-muted-foreground text-[10px] font-bold">{client.phone || '—'}</span>
                                        </div>
                                    </td>
                                    {canViewTotalSpent && (
                                        <td className="py-4 px-6">
                                            <p className="text-foreground font-bold text-sm">{client.totalSpent || '0 MXN'}</p>
                                            <p className="text-muted-foreground text-[10px]">Última: {client.lastOrder || '—'}</p>
                                        </td>
                                    )}
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setHistoryClient(client)}
                                                className="size-8 rounded-lg hover:bg-indigo-500/10 text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center transition-colors"
                                                title="Historial de Reparaciones"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">history</span>
                                            </button>
                                            <button
                                                onClick={() => openModal(client)}
                                                className="size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                                                title="Editar"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleDelete(client.id, client.name)}
                                                    className="size-8 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 flex items-center justify-center transition-colors"
                                                    title="Eliminar cliente"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!isLoading && filteredClients.length === 0 && (
                                <tr>
                                    <td colSpan={canViewTotalSpent ? 5 : 4} className="py-10 text-center text-muted-foreground text-sm font-medium">
                                        No hay clientes que coincidan con el filtro seleccionado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] hidden md:block">
                        Mostrando {filteredClients.length} de {clients.length} clientes
                    </p>
                    <div className="flex gap-2">
                        <button className="size-8 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground flex items-center justify-center transition-all disabled:opacity-50" disabled>
                            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                        </button>
                        <button className="size-8 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground flex items-center justify-center transition-all">
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <ClientModal
                    client={editingClient}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    isAdmin={isAdmin}
                />
            )}

            <ClientHistoryModal
                isOpen={Boolean(historyClient)}
                onClose={() => setHistoryClient(null)}
                clientId={historyClient?.id}
                clientName={historyClient?.name}
            />
        </div>
    );
}

// ... ClientModal component
const ClientModal: React.FC<{
    client: Client | null;
    onClose: () => void;
    onSave: (data: CreateClientDto) => Promise<void>;
    onDelete?: (id: string, name?: string) => void;
    isAdmin?: boolean;
}> = ({ client, onClose, onSave, onDelete, isAdmin }) => {
    const [formData, setFormData] = useState<{
        name: string;
        email: string;
        phone: string;
        location: string;
        type: ClientType;
        tags: string[];
    }>({
        name: client?.name || '',
        email: client?.email || '',
        phone: client?.phone || '',
        location: client?.location || 'Cd Obregon, Sonora',
        type: client?.type || 'RETAIL',
        tags: Array.isArray(client?.tags) ? client.tags : [],
    });

    const [tagInput, setTagInput] = useState('');
    const [enablePortal, setEnablePortal] = useState<boolean>(
        Boolean(client?.portalAccess?.enabled),
    );
    const [portalUsername, setPortalUsername] = useState<string>(
        client?.portalAccess?.username || '',
    );
    const [portalPassword, setPortalPassword] = useState<string>('');
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormError(null);
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSelectType = (nextType: ClientType) => {
        setFormError(null);
        setFormData(prev => ({ ...prev, type: nextType }));
        if (nextType !== 'RESELLER') {
            setEnablePortal(false);
        }
    };

    const handleTogglePortal = () => {
        setFormError(null);
        const next = !enablePortal;
        setEnablePortal(next);
        if (next && !portalUsername && formData.name) {
            setPortalUsername(suggestPortalUsername(formData.name));
        }
    };

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            const trimmed = tagInput.trim();
            setFormData(prev => ({
                ...prev,
                tags: prev.tags.includes(trimmed) ? prev.tags : [...prev.tags, trimmed],
            }));
            setTagInput('');
        }
    };

    const locationOptions = useMemo(() => {
        if (formData.location && !SONORA_CITIES.includes(formData.location)) {
            return [formData.location, ...SONORA_CITIES];
        }
        return SONORA_CITIES;
    }, [formData.location]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!formData.name.trim()) {
            setFormError('El nombre del cliente es obligatorio.');
            return;
        }

        const payload: CreateClientDto = {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            location: formData.location,
            type: formData.type,
            tags: formData.tags,
        };

        if (isAdmin) {
            if (formData.type === 'RESELLER' && enablePortal) {
                const cleanUsername = portalUsername.trim().toLowerCase();
                if (!/^[a-z0-9._-]{3,30}$/.test(cleanUsername)) {
                    setFormError(
                        'El usuario del portal debe tener de 3 a 30 caracteres (letras minúsculas, números, punto, guion o guion bajo).',
                    );
                    return;
                }
                const alreadyLinked = Boolean(client?.portalAccess?.userId);
                const cleanPassword = portalPassword.trim();
                if (!alreadyLinked && cleanPassword.length < 10) {
                    setFormError(
                        'La contraseña inicial del portal debe tener al menos 10 caracteres.',
                    );
                    return;
                }
                if (alreadyLinked && cleanPassword && cleanPassword.length < 10) {
                    setFormError(
                        'La nueva contraseña del portal debe tener al menos 10 caracteres.',
                    );
                    return;
                }
                payload.portalAccess = {
                    enable: true,
                    username: cleanUsername,
                    email: formData.email.trim() || undefined,
                    ...(cleanPassword ? { password: cleanPassword } : {}),
                };
            } else if (client?.portalAccess?.enabled) {
                payload.portalAccess = { enable: false };
            }
        }

        try {
            setIsSaving(true);
            await onSave(payload);
        } catch (err: any) {
            setFormError(err?.message || 'Error al guardar el cliente.');
        } finally {
            setIsSaving(false);
        }
    };

    const alreadyLinked = Boolean(client?.portalAccess?.userId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background border border-border rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-muted/20 sticky top-0 backdrop-blur-md z-10">
                    <h2 className="text-foreground text-lg font-black uppercase tracking-widest font-display">
                        {client ? 'Editar Cliente' : 'Nuevo Cliente'}
                    </h2>
                    <button onClick={onClose} type="button" className="size-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form className="p-8 space-y-6" onSubmit={handleSubmit}>
                    {formError && (
                        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-400 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            <span>{formError}</span>
                        </div>
                    )}

                    {/* Tipo de Cliente */}
                    <div className="space-y-2">
                        <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                            Tipo de Cliente (Segmento Comercial)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {CLIENT_TYPE_OPTIONS.map((option) => {
                                const selected = formData.type === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleSelectType(option.value)}
                                        className={`text-left rounded-2xl border p-3.5 transition-all flex items-start gap-3 ${
                                            selected
                                                ? option.value === 'RESELLER'
                                                    ? 'border-red-500/60 bg-red-500/10 text-foreground shadow-sm'
                                                    : option.value === 'VIP'
                                                        ? 'border-indigo-500/60 bg-indigo-500/10 text-foreground shadow-sm'
                                                        : 'border-emerald-500/60 bg-emerald-500/10 text-foreground shadow-sm'
                                                : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[20px] mt-0.5">
                                            {option.icon}
                                        </span>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wider text-foreground">
                                                {option.label}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                {option.subtitle}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Nombre Completo</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:border-indigo-500 focus:outline-none transition-all placeholder-muted-foreground"
                            placeholder="Ej. Araceli Ruiz"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Ubicación</label>
                        <select
                            name="location"
                            value={formData.location || 'Cd Obregon, Sonora'}
                            onChange={handleChange}
                            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:border-indigo-500 focus:outline-none transition-all appearance-none cursor-pointer"
                        >
                            {locationOptions.map((city) => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Correo Electrónico</label>
                            <input
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                type="email"
                                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:border-indigo-500 focus:outline-none transition-all placeholder-muted-foreground"
                                placeholder="cliente@ejemplo.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Teléfono</label>
                            <input
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:border-indigo-500 focus:outline-none transition-all placeholder-muted-foreground"
                                placeholder="+52 ..."
                            />
                        </div>
                    </div>

                    {/* Panel de Acceso al Portal de Revendedores */}
                    {formData.type === 'RESELLER' && (
                        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.04] p-5 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px] text-red-400">
                                            point_of_sale
                                        </span>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                                            Acceso al Portal de Revendedores (POS)
                                        </h3>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Vincula esta ficha comercial con una cuenta digital para consultar catálogo y registrar ventas POS.
                                    </p>
                                </div>
                                {isAdmin && (
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={enablePortal}
                                        onClick={handleTogglePortal}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                            enablePortal ? 'bg-red-500' : 'bg-zinc-700'
                                        }`}
                                        title="Habilitar acceso digital al Portal POS"
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                                                enablePortal ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                )}
                            </div>

                            {!isAdmin ? (
                                <p className="text-xs text-muted-foreground bg-muted/60 rounded-xl px-3.5 py-2.5 border border-border">
                                    {alreadyLinked
                                        ? `Portal activo con usuario @${client?.portalAccess?.username || client?.portalAccess?.email}. Solo un Administrador puede modificar credenciales.`
                                        : 'Solo un Administrador puede habilitar o modificar el acceso al Portal de Revendedores.'}
                                </p>
                            ) : enablePortal ? (
                                <div className="space-y-4 pt-1">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                                                    Usuario de acceso *
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => setPortalUsername(suggestPortalUsername(formData.name))}
                                                    className="text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300"
                                                >
                                                    Sugerir
                                                </button>
                                            </div>
                                            <input
                                                value={portalUsername}
                                                onChange={(e) => {
                                                    setFormError(null);
                                                    setPortalUsername(e.target.value.toLowerCase());
                                                }}
                                                placeholder="ej. araceli.ruiz"
                                                autoComplete="off"
                                                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:border-red-500 focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                                                {alreadyLinked ? 'Nueva contraseña (opcional)' : 'Contraseña inicial *'}
                                            </label>
                                            <input
                                                type="password"
                                                value={portalPassword}
                                                onChange={(e) => {
                                                    setFormError(null);
                                                    setPortalPassword(e.target.value);
                                                }}
                                                placeholder={
                                                    alreadyLinked
                                                        ? 'Dejar en blanco para mantener actual'
                                                        : 'Mínimo 10 caracteres'
                                                }
                                                autoComplete="new-password"
                                                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:border-red-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[15px] text-emerald-400">info</span>
                                        <span>
                                            Podrá iniciar sesión en el Portal de Revendedores con el usuario{' '}
                                            <strong className="text-foreground">
                                                {portalUsername.trim() || 'asignado'}
                                            </strong>{' '}
                                            (o con su correo electrónico) y su contraseña.
                                        </span>
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    Activa el interruptor si deseas crear o vincular sus credenciales para entrar al Portal POS. También puedes clasificarlo hoy solo en cartera y darle acceso después.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Etiquetas (Enter para agregar)</label>
                        <div className="bg-muted border border-border rounded-xl px-4 py-3 min-h-[50px] flex flex-wrap gap-2 items-center focus-within:border-indigo-500 transition-colors">
                            {formData.tags?.map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-background border border-border rounded text-xs text-foreground flex items-center gap-1">
                                    {tag}
                                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tag) }))} className="hover:text-red-500">×</button>
                                </span>
                            ))}
                            <input
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleAddTag}
                                className="bg-transparent border-none text-foreground focus:outline-none text-sm flex-1 min-w-[100px]"
                                placeholder={formData.tags?.length ? "" : "Escribe etiquetas..."}
                            />
                        </div>
                    </div>

                    <div className="pt-6 flex items-center justify-between gap-4 border-t border-border">
                        <div>
                            {client && onDelete && isAdmin && (
                                <button
                                    type="button"
                                    onClick={() => onDelete(client.id, client.name)}
                                    className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all text-xs font-bold uppercase tracking-widest flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                    <span>Eliminar</span>
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <button type="button" onClick={onClose} disabled={isSaving} className="px-6 py-3 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all text-xs font-bold uppercase tracking-widest">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="px-8 py-3 rounded-xl bg-foreground text-background hover:opacity-90 transition-all text-xs font-bold uppercase tracking-widest shadow-lg disabled:opacity-50">
                                {isSaving ? 'Guardando...' : 'Guardar Cliente'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
