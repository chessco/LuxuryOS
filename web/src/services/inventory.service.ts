import api from './api';

export type InventoryAvailabilityStatus = 'AVAILABLE' | 'LOW_STOCK' | 'RESERVED' | 'OUT_OF_STOCK';

export interface InventoryArticle {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  unitPrice: number;
  currency: string;
  stockOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  availabilityStatus: InventoryAvailabilityStatus;
}

export interface InventorySummary {
  productCount: number;
  stockOnHandQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface InventoryResponse {
  items: InventoryArticle[];
  summary: InventorySummary;
}

export interface CreateInventoryArticleInput {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  unitPrice: number;
  currency: string;
  stockOnHand: number;
  availableToResellers: boolean;
}

export const InventoryService = {
  async list(): Promise<InventoryResponse> {
    const response = await api.get<InventoryResponse>('/reseller/inventory');
    return response.data;
  },

  async create(input: CreateInventoryArticleInput): Promise<void> {
    await api.post('/reseller/catalog', input);
  },
};
