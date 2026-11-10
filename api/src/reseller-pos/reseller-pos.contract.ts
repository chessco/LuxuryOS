/**
 * Server-side representation of the reseller POS HTTP contract.
 *
 * The canonical cross-consumer specification lives in
 * docs/contracts/reseller-pos.openapi.yaml. Keep both serializers and tests
 * aligned with that document; do not expose Prisma records directly.
 */
export type ResellerSalesChannel = 'RESELLER_POS';
export type ResellerPortalRole = 'REVENDEDOR' | 'TENANT_ADMIN' | 'SYSTEM_ADMIN';

export interface ResellerProfileResponse {
  id: string;
  name: string | null;
  tenantId: string;
  role: ResellerPortalRole;
  salesChannel: ResellerSalesChannel;
}

export interface ResellerCatalogItemResponse {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  unitPrice: number;
  currency: string;
  availableQuantity: number;
}

export interface ResellerCatalogResponse {
  items: ResellerCatalogItemResponse[];
}

export type ResellerInventoryAvailabilityStatus =
  | 'AVAILABLE'
  | 'LOW_STOCK'
  | 'RESERVED'
  | 'OUT_OF_STOCK';

export interface ResellerInventoryItemResponse {
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
  availabilityStatus: ResellerInventoryAvailabilityStatus;
}

export interface ResellerInventorySummaryResponse {
  productCount: number;
  stockOnHandQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface ResellerInventoryResponse {
  items: ResellerInventoryItemResponse[];
  summary: ResellerInventorySummaryResponse;
}
