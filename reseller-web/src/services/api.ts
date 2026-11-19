import axios from 'axios';
import type {
  CreateResellerSaleInput,
  LoginResponse,
  ResellerCatalogResponse,
  ResellerCreditResponse,
  ResellerInventoryResponse,
  ResellerProfile,
  ResellerSale,
  ResellerSaleStatus,
  ResellerQuote,
  ResellerCommissions,
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

export async function getResellerInventory(): Promise<ResellerInventoryResponse> {
  const response = await api.get<ResellerInventoryResponse>('/reseller/inventory');
  return response.data;
}

export async function calculateResellerQuote(items: Array<{ productId: string; quantity: number }>): Promise<ResellerQuote> {
  const response = await api.post<ResellerQuote>('/reseller/quotes', { items });
  return response.data;
}

export async function getResellerCommissions(params: { page?: number; status?: string; currency?: string; from?: string; to?: string } = {}): Promise<ResellerCommissions> {
  const response = await api.get<ResellerCommissions>('/reseller/commissions', { params });
  return response.data;
}

export function readQuoteConflict(error: unknown): { code: string; message: string; currentQuote: ResellerQuote | null } | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) return null;
  const data = error.response.data as { code?: string; message?: string; currentQuote?: ResellerQuote };
  if (data.code !== 'QUOTE_DRIFT' && data.code !== 'INSUFFICIENT_STOCK') return null;
  return { code: data.code, message: data.message || 'La cotización cambió', currentQuote: data.currentQuote || null };
}

export async function createResellerSale(
  payload: CreateResellerSaleInput,
  idempotencyKey: string,
): Promise<ResellerSale> {
  const response = await api.post<ResellerSale>('/reseller/sales', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return response.data;
}

export async function getResellerSales(status?: ResellerSaleStatus, q?: string): Promise<ResellerSale[]> {
  const response = await api.get<ResellerSale[]>('/reseller/sales', {
    params: {
      ...(status ? { status } : {}),
      ...(q?.trim() ? { q: q.trim() } : {}),
    },
  });
  return response.data;
}

export async function cancelResellerSale(saleId: string, reason?: string): Promise<ResellerSale> {
  const response = await api.post<ResellerSale>(`/reseller/sales/${saleId}/cancel`, {
    ...(reason?.trim() ? { reason: reason.trim() } : {}),
  });
  return response.data;
}

export async function getResellerCredit(): Promise<ResellerCreditResponse> {
  const response = await api.get<ResellerCreditResponse>('/reseller/credit');
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
