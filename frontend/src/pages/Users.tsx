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
            TENANT_USER: 'bg-zinc-500/10 text-zinc-400 border-zinc-700',
        };

        const labels: Record<string, string> = {
            SYSTEM_ADMIN: 'System Admin',
            TENANT_ADMIN: 'Admin',
            TENANT_USER: 'Usuario',
        };

        return (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest border ${styles[role] || styles['TENANT_USER']}`}>
                {labels[role] || role}
            </span>
        );
    };

    return (
        <div className="flex flex-col gap-10">
            <div>
                <h1 className="text-zinc-900 dark:text-white text-4xl font-black tracking-tight font-display">Gestión de Equipo</h1>
                <p className="text-zinc-400 dark:text-zinc-500 text-sm font-medium mt-2">Control de accesos, roles y seguridad de Luxury OS.</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative w-full max-w-md group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">search</span>
                    </div>
                    <input
                        className="block w-full pl-10 pr-3 py-3 border border-zinc-200 dark:border-zinc-900 rounded-xl bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-zinc-400 dark:focus:border-zinc-700 outline-none text-sm transition-all shadow-sm"
                        placeholder="Buscar por email o nombre..."
                        type="text"
                    />
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-zinc-900 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-black/5 dark:shadow-white/5 active:scale-95"
                >
                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                    <span>Nuevo Miembro</span>
                </button>
            </div>

            <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-900 rounded-[32px] overflow-hidden backdrop-blur-sm shadow-sm transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                                <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Usuario</th>
                                <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Rol</th>
                                <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Fecha de Alta</th>
                                <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                            {isLoading ? (
                                <tr><td colSpan={4} className="py-20 text-center text-zinc-500 text-xs font-black uppercase tracking-widest">Cargando equipo...</td></tr>
                            ) : users.map((user) => (
                                <tr key={user.id} className="group hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors cursor-default">
                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-400 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 uppercase tracking-tighter">
                                                {user.name ? user.name.substring(0, 2) : user.email.substring(0, 2)}
                                            </div>
                                            <div>
                                                <p className="text-zinc-900 dark:text-white text-sm font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{user.name || user.email.split('@')[0].replace('.', ' ')}</p>
                                                <p className="text-zinc-400 dark:text-zinc-500 text-[10px] font-medium">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <RoleBadge role={user.role} />
                                    </td>
                                    <td className="py-5 px-8">
                                        <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
                                    </td>
                                    <td className="py-5 px-8 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openModal(user)}
                                                className="size-9 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-all"
                                                title="Editar"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="size-9 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center transition-all"
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
                                    <td colSpan={4} className="py-20 text-center text-zinc-500 text-xs font-black uppercase tracking-widest">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-xl bg-zinc-950 border border-zinc-900 rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="px-10 py-8 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/40">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-white/10">
                            <span className="material-symbols-outlined text-black text-[24px]">{user ? 'manage_accounts' : 'person_add'}</span>
                        </div>
                        <div>
                            <h2 className="text-white text-lg font-black uppercase tracking-widest font-display">
                                {user ? 'Editar Perfil' : 'Nuevo Miembro'}
                            </h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-10 flex items-center justify-center rounded-xl hover:bg-zinc-900 text-zinc-600 hover:text-white transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form className="p-10 space-y-8" onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Nombre Completo</label>
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-white focus:outline-none transition-all placeholder-zinc-700 text-sm"
                                placeholder="Ej. Mateo Robles"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Email Institucional</label>
                            <input
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                type="email"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-white focus:outline-none transition-all placeholder-zinc-700 text-sm"
                                placeholder="nombre@luxuryos.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Contraseña {user && '(Dejar en blanco para mantener)'}</label>
                        <input
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required={!user}
                            type="password"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-white focus:outline-none transition-all placeholder-zinc-700 text-sm"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Rol de Acceso</label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-white focus:outline-none transition-all text-sm appearance-none"
                        >
                            <option value="TENANT_USER">Usuario (Lectura/Escritura básica)</option>
                            <option value="TENANT_ADMIN">Administrador (Control total)</option>
                        </select>
                    </div>

                    <div className="pt-6 flex justify-end gap-6">
                        <button type="button" onClick={onClose} className="px-8 py-4 rounded-xl hover:bg-zinc-900 text-zinc-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em]">Cancelar</button>
                        <button type="submit" className="px-12 py-4 rounded-2xl bg-white text-black hover:bg-zinc-200 transition-all text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-white/5">
                            {user ? 'Guardar Cambios' : 'Confirmar Registro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
