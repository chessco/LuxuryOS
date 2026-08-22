import React, { useState, useEffect } from 'react';
import { ClientsService } from '../services/clients.service';
import { useLocation } from 'react-router-dom';

// Adapting Client interface for the view
export interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    totalSpent: string;
    lastOrder: string;
    initials: string;
    initialsColor: string;
    location?: string;
    tags?: string[];
}

export default function ClientsPage() {
    // --- CRUD State & Logic ---
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const location = useLocation();

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

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
            await ClientsService.delete(id);
            // Optimistic update or refetch
            setClients(prev => prev.filter(c => c.id !== id));
        }
    };

    const handleSave = async (clientData: any) => {
        if (!clientData.name || !clientData.name.trim()) {
            alert('El nombre del cliente es obligatorio');
            return;
        }
        try {
            if (editingClient) {
                // Edit
                await ClientsService.update(editingClient.id, clientData);
                fetchClients(); // Refetch for simplicity
            } else {
                // Create
                await ClientsService.create(clientData);
                fetchClients();
            }
            setIsModalOpen(false);
            setEditingClient(null);
        } catch (error) {
            console.error('Error saving client:', error);
            alert('Error al guardar el cliente');
        }
    };

    const openModal = (client?: Client) => {
        setEditingClient(client || null);
        setIsModalOpen(true);
    };

    // --- Helper for Status Badge (from original design) ---
    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            VIP: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
            Active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            Inactive: 'bg-muted text-muted-foreground border-border',
        };
        const mappedStatus = status === 'Active' ? 'Active' : status === 'VIP' ? 'VIP' : 'Inactive';

        return (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest border ${styles[mappedStatus] || styles['Active']}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="flex flex-col gap-10">
            {/* Header Steps */}
            <div>
                <h1 className="text-foreground text-4xl font-black tracking-tight font-display transition-colors">Cartera de Clientes</h1>
                <p className="text-muted-foreground text-sm font-medium mt-2 transition-colors">Gestión de relaciones VIP y seguimiento comercial.</p>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative w-full max-w-md group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-muted-foreground group-focus-within:text-foreground transition-colors">search</span>
                    </div>
                    <input
                        className="block w-full pl-10 pr-3 py-3 border border-border rounded-xl bg-muted/50 text-foreground placeholder-muted-foreground focus:border-indigo-500 outline-none text-sm transition-all shadow-sm"
                        placeholder="Buscar cliente por nombre, email o teléfono..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
                >
                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                    <span>Nuevo Cliente</span>
                </button>
            </div>

            {/* Table Container (Restored Design) */}
            <div className="bg-card border border-border rounded-3xl overflow-hidden backdrop-blur-sm shadow-sm transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Cliente</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Ubicación / Contacto</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Gastado</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Cargando clientes...</td></tr>
                            ) : clients
                                .filter(c =>
                                    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    (c.phone || '').toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map((client) => (
                                    <tr key={client.id} className="group hover:bg-muted/30 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`size-10 rounded-full flex items-center justify-center text-xs font-black ${client.initialsColor}`}>
                                                    {client.initials}
                                                </div>
                                                <div>
                                                    <p className="text-foreground text-sm font-bold">{client.name}</p>
                                                    <p className="text-muted-foreground text-xs">{client.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <StatusBadge status={client.status} />
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-foreground text-xs font-medium">{client.location || 'Cd Obregon, Sonora'}</span>
                                                <span className="text-muted-foreground text-[10px] font-bold">{client.phone}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-foreground font-bold text-sm">{client.totalSpent}</p>
                                            <p className="text-muted-foreground text-[10px]">Última: {client.lastOrder}</p>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openModal(client)}
                                                    className="size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                                                    title="Editar"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(client.id)}
                                                    className="size-8 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 flex items-center justify-center transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            {!isLoading && clients.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-10 text-center text-muted-foreground text-sm font-medium">
                                        No hay clientes registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer (Static for now) */}
                <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] hidden md:block">
                        Mostrando {clients.length} clientes
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
                />
            )}
        </div>
    );
}

// ... ClientModal component
const ClientModal: React.FC<{ client: Client | null, onClose: () => void, onSave: (data: Partial<Client>) => void }> = ({ client, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Client>>(client || {
        name: '',
        email: '',
        phone: '',
        location: 'Cd Obregon, Sonora',
        tags: []
    });

    const [tagInput, setTagInput] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput) {
            e.preventDefault();
            setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput] }));
            setTagInput('');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-background border border-border rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-muted/20">
                    <h2 className="text-foreground text-lg font-black uppercase tracking-widest font-display">
                        {client ? 'Editar Cliente' : 'Nuevo Cliente'}
                    </h2>
                    <button onClick={onClose} className="size-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form className="p-8 space-y-6" onSubmit={(e) => { 
                    e.preventDefault(); 
                    if (!formData.name?.trim()) {
                        alert("El nombre del cliente es obligatorio.");
                        return;
                    }
                    onSave(formData); 
                }}>
                    <div className="space-y-2">
                        <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Nombre Completo</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:border-indigo-500 focus:outline-none transition-all placeholder-muted-foreground"
                            placeholder="Ej. Sofía Martínez"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Ubicación</label>
                        <select
                            name="location"
                            value={formData.location || 'Cd Obregon, Sonora'}
                            onChange={handleChange as any}
                            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:border-indigo-500 focus:outline-none transition-all appearance-none cursor-pointer"
                        >
                            <option value="Cd Obregon, Sonora">Cd Obregon, Sonora</option>
                            <option value="Hermosillo, Sonora">Hermosillo, Sonora</option>
                            <option value="Navojoa, Sonora">Navojoa, Sonora</option>
                            <option value="Guaymas, Sonora">Guaymas, Sonora</option>
                            <option value="Nogales, Sonora">Nogales, Sonora</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
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

                    <div className="pt-6 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all text-xs font-bold uppercase tracking-widest">Cancelar</button>
                        <button type="submit" className="px-8 py-3 rounded-xl bg-foreground text-background hover:opacity-90 transition-all text-xs font-bold uppercase tracking-widest shadow-lg">Guardar Cliente</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
