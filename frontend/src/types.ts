export interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    location: string;
    spend: string;
    status: 'VIP' | 'Activo' | 'Nuevo' | 'En Espera';
    joinDate: string;
    avatar?: string;
}

export enum OrderType {
    STANDARD = 'STANDARD',
    REPAIR = 'REPAIR',
    MANUFACTURE = 'MANUFACTURE',
    LAYAWAY = 'LAYAWAY'
}

export enum OrderStatus {
    // Common
    DRAFT = 'DRAFT',
    QUOTE_SENT = 'QUOTE_SENT',
    APPROVED = 'APPROVED',
    CANCELLED = 'CANCELLED',
    DELIVERED = 'DELIVERED',

    // Repair Specific
    RECEIVED = 'RECEIVED',
    DIAGNOSIS_PENDING = 'DIAGNOSIS_PENDING',
    WAITING_PARTS = 'WAITING_PARTS',
    IN_REPAIR = 'IN_REPAIR',
    REPAIR_COMPLETED = 'REPAIR_COMPLETED',

    // Manufacture Specific
    SPEC_PENDING = 'SPEC_PENDING',
    MATERIALS_PENDING = 'MATERIALS_PENDING',
    IN_PRODUCTION = 'IN_PRODUCTION',
    QUALITY_CHECK = 'QUALITY_CHECK',
    READY_FOR_PICKUP = 'READY_FOR_PICKUP',

    // Layaway Specific
    LAYAWAY_OPEN = 'LAYAWAY_OPEN',
    LAYAWAY_EXPIRED = 'LAYAWAY_EXPIRED'
}

export interface Payment {
    id: string;
    orderId: string;
    amount: number;
    method: string;
    reference?: string;
    recordedAt: string;
}

export interface Order {
    id: string;
    clientName: string; // Mapped from client.name usually
    clientId?: string;
    item: string; // Mapped from pieceType
    value: string; // Legacy
    status: string; // Legacy UI status or Mapped

    // New Fields
    type?: OrderType;
    orderStatus?: OrderStatus;
    totalAmount?: number;
    paidAmount?: number;
    balance?: number;
    specifications?: any;
    payments?: Payment[];

    priority: 'Baja' | 'Normal' | 'Alta' | 'Urgente';
    date: string;
}

export interface InventoryItem {
    id: string;
    sku: string;
    name: string;
    category: string;
    location: string;
    quantity: number;
    value: string;
    cost: string;
    status: 'Activo' | 'Bajo Stock' | 'Consignación';
}
