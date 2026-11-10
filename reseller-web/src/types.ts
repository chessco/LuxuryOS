/**
 * These types are derived from docs/contracts/reseller-pos.openapi.yaml.
 * The OpenAPI document remains the authoritative cross-application contract.
 */
export type ResellerPortalRole = 'REVENDEDOR' | 'TENANT_ADMIN' | 'SYSTEM_ADMIN';

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    username?: string | null;
    name?: string | null;
    tenantId: string;
    role: ResellerPortalRole | string;
  };
}

export interface ResellerProfile {
  id: string;
  name: string | null;
  tenantId: string;
  role: ResellerPortalRole;
  salesChannel: 'RESELLER_POS';
}

export interface ResellerCatalogItem {
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
  items: ResellerCatalogItem[];
}
