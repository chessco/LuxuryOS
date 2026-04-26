import api from './api';
// Removed mockData import
// Removed mockData import

export interface CreateClientDto {
    name: string;
    email?: string;
    phone?: string;
    tags?: string[];
}

export const ClientsService = {
    getAll: async () => {
        const response = await api.get<any[]>('/clients');
        // Mapper to adapt DB model to Frontend Mock model if needed, or just use as is
        // For now assuming the backend returns compatible structure or we adapt here
        return response.data.map(c => ({
            ...c,
            status: 'Active', // Default status as it might not be in DB yet
            totalSpent: '0 MXN', // Placeholder until calculated
            lastOrder: '—',
            initials: c.name.substring(0, 2).toUpperCase(),
            initialsColor: 'bg-zinc-800 text-zinc-400'
        }));
    },
    create: async (data: CreateClientDto) => {
        const response = await api.post('/clients', data);
        return response.data;
    },
    update: async (id: string, data: Partial<CreateClientDto>) => {
        const response = await api.patch(`/clients/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/clients/${id}`);
    }
};
