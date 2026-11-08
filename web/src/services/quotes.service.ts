import api from './api';

export type QuoteStatus = 'DRAFT' | 'SENT' | 'AUTHORIZED' | 'CONVERTED' | 'CANCELLED';
export interface Quote { id: string; quoteCode: string; status: QuoteStatus; clientId: string; client: { name: string; phone?: string }; pieceType: string; notes?: string; laborCost?: number; materialCost?: number; totalAmount: number; validUntil?: string; createdAt: string; convertedOrderId?: string; specifications?: Record<string, any>; }
export interface QuotePayload { clientId: string; pieceType: string; notes?: string; laborCost?: number; materialCost?: number; totalAmount: number; validUntil?: string; specifications?: Record<string, unknown>; }

export const QuotesService = {
  list: async (status?: QuoteStatus) => (await api.get<Quote[]>('/quotes', { params: status ? { status } : {} })).data,
  create: async (payload: QuotePayload) => (await api.post<Quote>('/quotes', payload)).data,
  update: async (id: string, payload: Partial<QuotePayload>) => (await api.patch<Quote>(`/quotes/${id}`, payload)).data,
  sendWhatsApp: async (id: string) => (await api.post(`/quotes/${id}/send-whatsapp`)).data,
  cancel: async (id: string) => (await api.post(`/quotes/${id}/cancel`)).data,
  convert: async (id: string, targetType: string, operationalFields?: Record<string, unknown>) => (await api.post(`/quotes/${id}/convert`, { targetType, operationalFields })).data,
  getPublic: async (token: string) => (await api.get(`/public/quotes/${token}`)).data,
  authorize: async (token: string) => (await api.post(`/public/quotes/${token}/authorize`)).data,
};
