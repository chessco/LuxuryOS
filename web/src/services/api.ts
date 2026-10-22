import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

// Las fotos guardadas en disco vienen como "/uploads/..." (ruta de la API). Si se
// usan tal cual, el navegador las pide al dominio de la web y salen rotas.
export const resolveMediaUrl = (url?: string | null): string => {
    if (!url) return '';
    return url.startsWith('/uploads/') ? `${API_URL}${url}` : url;
};

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
