import React, { useState } from 'react';
import { MOCK_CLIENTS_DATA, ClientMock } from '../mockData';

export default function ClientsPage() {
    // --- CRUD State & Logic ---
    const [clients, setClients] = useState<Record<string, ClientMock>>(MOCK_CLIENTS_DATA);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<ClientMock | null>(null);

    const handleDelete = (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
            const newClients = { ...clients };
            delete newClients[id];
            setClients(newClients);
        }
    };

    const handleSave = (clientData: Partial<ClientMock>) => {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

        if (editingClient) {
            // Edit
            setClients(prev => ({
                ...prev,
                [editingClient.id]: {
                    ...editingClient,
                    ...clientData,
                    initials: clientData.name?.substring(0, 2).toUpperCase() || editingClient.initials
                } as ClientMock
            }));
        } else {
            // Create
            const id = Math.floor(Math.random() * 10000).toString();
            const newClient: ClientMock = {
                id,
                name: clientData.name || 'Nuevo Cliente',
                email: clientData.email || '',
                phone: clientData.phone || '',
                status: 'Active',
                totalSpent: '0 MXN',
                lastOrder: '—',
                tags: [],
                initials: clientData.name?.substring(0, 2).toUpperCase() || 'NC',
                initialsColor: 'bg-zinc-800 text-zinc-400',
                ...clientData
            } as ClientMock;
            setClients(prev => ({ ...prev, [id]: newClient }));
        }
        setIsModalOpen(false);
        setEditingClient(null);
    };

    const openModal = (client?: ClientMock) => {
        setEditingClient(client || null);
        setIsModalOpen(true);
    };

    // --- Helper for Status Badge (from original design) ---
    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            VIP: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            Active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            Inactive: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
        };
        // Fallback for mock data status mismatch
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
                <h1 className="text-white text-4xl font-black tracking-tight font-display">Cartera de Clientes</h1>
                <p className="text-zinc-500 text-sm font-medium mt-2">Gestión de relaciones VIP y seguimiento comercial.</p>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative w-full max-w-md group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-zinc-500 group-focus-within:text-white transition-colors">search</span>
                    </div>
                    <input
                        className="block w-full pl-10 pr-3 py-3 border border-zinc-900 rounded-xl bg-zinc-900/50 text-white placeholder-zinc-500 focus:border-zinc-700 outline-none text-sm transition-all shadow-sm"
                        placeholder="Buscar cliente por nombre, email o teléfono..."
                        type="text"
                    />
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-white/5"
                >
                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                    <span>Nuevo Cliente</span>
                </button>
            </div>

            {/* Table Container (Restored Design) */}
            <div className="bg-zinc-900/30 border border-zinc-900 rounded-3xl overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-900/50">
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Cliente</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Status</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Ubicación / Contacto</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Total Gastado</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {Object.values(clients).map((client) => (
                                <tr key={client.id} className="group hover:bg-zinc-900/40 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`size-10 rounded-full flex items-center justify-center text-xs font-black ${client.initialsColor}`}>
                                                {client.initials}
                                            </div>
                                            <div>
                                                <p className="text-white text-sm font-bold">{client.name}</p>
                                                <p className="text-zinc-500 text-xs">{client.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <StatusBadge status={client.status} />
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-zinc-300 text-xs font-medium">CDMX, México</span>
                                            <span className="text-zinc-600 text-[10px] font-bold">{client.phone}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <p className="text-white font-bold text-sm">{client.totalSpent}</p>
                                        <p className="text-zinc-600 text-[10px]">Última: {client.lastOrder}</p>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openModal(client)}
                                                className="size-8 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white flex items-center justify-center transition-colors"
                                                title="Editar"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(client.id)}
                                                className="size-8 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors"
                                                title="Eliminar"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {Object.keys(clients).length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-10 text-center text-zinc-500 text-sm font-medium">
                                        No hay clientes registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer (Static for now) */}
                <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] hidden md:block">
                        Mostrando {Object.keys(clients).length} clientes
                    </p>
                    <div className="flex gap-2">
                        <button className="size-8 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-600 hover:text-white flex items-center justify-center transition-all disabled:opacity-50" disabled>
                            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                        </button>
                        <button className="size-8 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-600 hover:text-white flex items-center justify-center transition-all">
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

// ... ClientModal component (Reusing the one I built in previous step)
const ClientModal: React.FC<{ client: ClientMock | null, onClose: () => void, onSave: (data: Partial<ClientMock>) => void }> = ({ client, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<ClientMock>>(client || {
        name: '',
        email: '',
        phone: '',
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-900 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="px-8 py-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/40">
                    <h2 className="text-white text-lg font-black uppercase tracking-widest font-display">
                        {client ? 'Editar Cliente' : 'Nuevo Cliente'}
                    </h2>
                    <button onClick={onClose} className="size-8 flex items-center justify-center rounded-lg hover:bg-zinc-900 text-zinc-600 hover:text-white transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form className="p-8 space-y-6" onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
                    <div className="space-y-2">
                        <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Nombre Completo</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white focus:outline-none transition-all placeholder-zinc-700"
                            placeholder="Ej. Sofía Martínez"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Correo Electrónico</label>
                            <input
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                type="email"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white focus:outline-none transition-all placeholder-zinc-700"
                                placeholder="cliente@ejemplo.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Teléfono</label>
                            <input
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white focus:outline-none transition-all placeholder-zinc-700"
                                placeholder="+52 ..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Etiquetas (Enter para agregar)</label>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 min-h-[50px] flex flex-wrap gap-2 items-center focus-within:border-zinc-700 transition-colors">
                            {formData.tags?.map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-white flex items-center gap-1">
                                    {tag}
                                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tag) }))} className="hover:text-red-400">×</button>
                                </span>
                            ))}
                            <input
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleAddTag}
                                className="bg-transparent border-none text-white focus:outline-none text-sm flex-1 min-w-[100px]"
                                placeholder={formData.tags?.length ? "" : "Escribe etiquetas..."}
                            />
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl hover:bg-zinc-900 text-zinc-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest">Cancelar</button>
                        <button type="submit" className="px-8 py-3 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all text-xs font-bold uppercase tracking-widest shadow-lg shadow-white/10">Guardar Cliente</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
