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

export type ResellerInventoryAvailabilityStatus = 'AVAILABLE' | 'LOW_STOCK' | 'RESERVED' | 'OUT_OF_STOCK';

export interface ResellerInventoryItem {
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

export interface ResellerInventorySummary {
  productCount: number;
  stockOnHandQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface ResellerInventoryResponse {
  items: ResellerInventoryItem[];
  summary: ResellerInventorySummary;
}

export type ResellerSaleStatus = 'DRAFT' | 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'EXPIRED';
export type ResellerPaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface ResellerSaleItem {
  id: string;
  productId: string;
  skuSnapshot: string;
  nameSnapshot: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  createdAt: string;
}

export interface ResellerSalePayment {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  status: ResellerPaymentStatus;
  recordedById: string | null;
  recordedByName: string | null;
  recordedAt: string;
}

export interface ResellerSaleReservation {
  id: string;
  productId: string;
  quantity: number;
  status: 'ACTIVE' | 'CONSUMED' | 'RELEASED' | 'EXPIRED';
  expiresAt: string | null;
}

export interface ResellerSale {
  id: string;
  handoffCode: string;
  resellerId: string;
  resellerName: string | null;
  salesChannel: 'RESELLER_POS' | 'JEWELRY_INTERNAL';
  status: ResellerSaleStatus;
  paymentStatus: ResellerPaymentStatus;
  currency: string;
  customerName: string | null;
  customerPhone: string | null;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  creditedAmount?: number;
  balanceDue: number;
  notes: string | null;
  cancellationReason: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: ResellerSaleItem[];
  payments: ResellerSalePayment[];
  reservations: ResellerSaleReservation[];
}

export interface CreateResellerSaleInput {
  items: Array<{ productId: string; quantity: number }>;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}

export type ResellerCreditFacilityType = 'REVOLVING' | 'NON_REVOLVING';
export type ResellerCreditObligationStatus = 'OPEN' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface ResellerCreditPayment {
  id: string;
  obligationId: string;
  amount: number;
  method: string;
  reference: string | null;
  notes: string | null;
  recordedById: string | null;
  recordedByName: string | null;
  recordedAt: string;
}

export interface ResellerCreditObligation {
  id: string;
  code: string;
  facilityType: ResellerCreditFacilityType;
  title: string;
  currency: string;
  principalAmount: number;
  paidAmount: number;
  balanceDue: number;
  termDays: number;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  status: ResellerCreditObligationStatus;
  daysRemaining: number;
  isOverdue: boolean;
  saleHandoffCode: string | null;
  notes: string | null;
  payments: ResellerCreditPayment[];
}

export interface ResellerCreditAccountSummary {
  id: string | null;
  subjectType: 'RESELLER' | 'CLIENT';
  subjectName: string | null;
  revolvingLimit: number;
  revolvingUsed: number;
  revolvingAvailable: number;
  activeNonRevolvingCount: number;
  activeNonRevolvingTotal: number;
  overdueCount: number;
  overdueAmount: number;
  currency: string;
  defaultTermDays: number;
  status: 'ACTIVE' | 'SUSPENDED';
  canDrawCredit: boolean;
  canDrawRevolving: boolean;
  blockReason: string | null;
}

export interface ResellerCreditResponse {
  account: ResellerCreditAccountSummary;
  revolvingObligations: ResellerCreditObligation[];
  nonRevolvingObligations: ResellerCreditObligation[];
}
