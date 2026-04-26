import React, { useState, useEffect } from 'react';
import { UsersService, User } from '../services/users.service';

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const data = await UsersService.getAll();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
            try {
                await UsersService.delete(id);
                setUsers(prev => prev.filter(u => u.id !== id));
            } catch (error) {
                console.error('Error deleting user:', error);
                alert('No se pudo eliminar el usuario');
            }
        }
    };

    const handleSave = async (userData: any) => {
        try {
            if (editingUser) {
                await UsersService.update(editingUser.id, userData);
            } else {
                await UsersService.create(userData);
            }
            fetchUsers();
            setIsModalOpen(false);
            setEditingUser(null);
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Error al guardar el usuario. Verifica los datos.');
        }
    };

    const openModal = (user?: User) => {
        setEditingUser(user || null);
        setIsModalOpen(true);
    };

    const RoleBadge = ({ role }: { role: string }) => {
        const styles: Record<string, string> = {
            SYSTEM_ADMIN: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
            TENANT_ADMIN: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            VENDEDOR: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            TENANT_USER: 'bg-muted text-muted-foreground border-border',
        };

        const labels: Record<string, string> = {
            SYSTEM_ADMIN: 'System Admin',
            TENANT_ADMIN: 'Admin',
            VENDEDOR: 'Vendedor',
            TENANT_USER: 'Usuario',
        };

        return (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest border ${styles[role] || styles['TENANT_USER']} transition-colors`}>
                {labels[role] || role}
            </span>
        );
    };

    return (
        <div className="flex flex-col gap-10">
            <div>
                <h1 className="text-foreground text-4xl font-black tracking-tight font-display transition-colors">Gestión de Equipo</h1>
                <p className="text-muted-foreground text-sm font-medium mt-2 transition-colors">Control de accesos, roles y seguridad de Luxury OS.</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative w-full max-w-md group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-muted-foreground group-focus-within:text-foreground transition-colors">search</span>
                    </div>
                    <input
                        className="block w-full pl-10 pr-3 py-3 border border-border rounded-xl bg-card text-foreground placeholder-muted-foreground focus:border-indigo-500 outline-none text-sm transition-all shadow-sm"
                        placeholder="Buscar por email o nombre..."
                        type="text"
                    />
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
                >
                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                    <span>Nuevo Miembro</span>
                </button>
            </div>

            <div className="bg-card border border-border rounded-[32px] overflow-hidden backdrop-blur-sm shadow-sm transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Usuario</th>
                                <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Rol</th>
                                <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Fecha de Alta</th>
                                <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr><td colSpan={4} className="py-20 text-center text-muted-foreground text-xs font-black uppercase tracking-widest">Cargando equipo...</td></tr>
                            ) : users.map((user) => (
                                <tr key={user.id} className="group hover:bg-muted/30 transition-colors cursor-default">
                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-muted-foreground border border-border uppercase tracking-tighter">
                                                {user.name ? user.name.substring(0, 2) : user.email.substring(0, 2)}
                                            </div>
                                            <div>
                                                <p className="text-foreground text-sm font-bold group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{user.name || user.email.split('@')[0].replace('.', ' ')}</p>
                                                <p className="text-muted-foreground text-[10px] font-medium">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <RoleBadge role={user.role} />
                                    </td>
                                    <td className="py-5 px-8">
                                        <p className="text-muted-foreground text-xs font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
                                    </td>
                                    <td className="py-5 px-8 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openModal(user)}
                                                className="size-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all"
                                                title="Editar"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="size-9 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 flex items-center justify-center transition-all"
                                                title="Eliminar"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!isLoading && users.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center text-muted-foreground text-xs font-black uppercase tracking-widest">
                                        No hay miembros registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <UserModal
                    user={editingUser}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

const UserModal: React.FC<{ user: User | null, onClose: () => void, onSave: (data: any) => void }> = ({ user, onClose, onSave }) => {
    const [formData, setFormData] = useState<any>({
        email: user?.email || '',
        name: user?.name || '',
        password: '',
        role: user?.role || 'TENANT_USER',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-xl bg-background border border-border rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="px-10 py-8 border-b border-border flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-[24px]">{user ? 'manage_accounts' : 'person_add'}</span>
                        </div>
                        <div>
                            <h2 className="text-foreground text-lg font-black uppercase tracking-widest font-display">
                                {user ? 'Editar Perfil' : 'Nuevo Miembro'}
                            </h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-10 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form className="p-10 space-y-8" onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest px-1">Nombre Completo</label>
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full bg-muted border border-border rounded-2xl px-6 py-4 text-foreground focus:border-indigo-500 focus:outline-none transition-all placeholder-muted-foreground text-sm"
                                placeholder="Ej. Mateo Robles"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest px-1">Email Institucional</label>
                            <input
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                type="email"
                                className="w-full bg-muted border border-border rounded-2xl px-6 py-4 text-foreground focus:border-indigo-500 focus:outline-none transition-all placeholder-muted-foreground text-sm"
                                placeholder="nombre@luxuryos.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest px-1">Contraseña {user && '(Dejar en blanco para mantener)'}</label>
                        <input
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required={!user}
                            type="password"
                            className="w-full bg-muted border border-border rounded-2xl px-6 py-4 text-foreground focus:border-indigo-500 focus:outline-none transition-all placeholder-muted-foreground text-sm"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-muted-foreground text-[10px] font-black uppercase tracking-widest px-1">Rol de Acceso</label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full bg-muted border border-border rounded-2xl px-6 py-4 text-foreground focus:border-indigo-500 focus:outline-none transition-all text-sm appearance-none"
                        >
                            <option value="TENANT_USER">Usuario (Lectura/Escritura básica)</option>
                            <option value="VENDEDOR">Vendedor (Ventas y Pedidos)</option>
                            <option value="TENANT_ADMIN">Administrador (Control total)</option>
                        </select>
                    </div>

                    <div className="pt-6 flex justify-end gap-6">
                        <button type="button" onClick={onClose} className="px-8 py-4 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all text-[10px] font-black uppercase tracking-[0.2em]">Cancelar</button>
                        <button type="submit" className="px-12 py-4 rounded-2xl bg-foreground text-background hover:opacity-90 transition-all text-[10px] font-black uppercase tracking-[0.3em] shadow-xl">
                            {user ? 'Guardar Cambios' : 'Confirmar Registro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
