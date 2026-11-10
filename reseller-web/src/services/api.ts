import axios from 'axios';
import type {
  LoginResponse,
  ResellerCatalogResponse,
  ResellerProfile,
} from '../types';

const TOKEN_KEY = 'cared_revendedores_token';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const resellerSession = {
  getToken: () => window.localStorage.getItem(TOKEN_KEY),
  saveToken: (token: string) => window.localStorage.setItem(TOKEN_KEY, token),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', {
    email: identifier,
    password,
  });
  return response.data;
}

export async function getResellerProfile(): Promise<ResellerProfile> {
  const response = await api.get<ResellerProfile>('/reseller/profile');
  return response.data;
}

export async function getResellerCatalog(): Promise<ResellerCatalogResponse> {
  const response = await api.get<ResellerCatalogResponse>('/reseller/catalog');
  return response.data;
}

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(payload?.message)) return payload.message.join(', ');
    return payload?.message || 'No se pudo completar la solicitud.';
  }
  return 'Ocurrió un error inesperado.';
}
