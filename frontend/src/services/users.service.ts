import api from './api';

export interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
    createdAt: string;
}

export const UsersService = {
    getAll: async () => {
        const response = await api.get<User[]>('/users');
        return response.data;
    },
    getOne: async (id: string) => {
        const response = await api.get<User>(`/users/${id}`);
        return response.data;
    },
    create: async (data: any) => {
        const response = await api.post<User>('/users', data);
        return response.data;
    },
    update: async (id: string, data: any) => {
        const response = await api.put<User>(`/users/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/users/${id}`);
    }
};
