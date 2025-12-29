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

export interface Order {
    id: string;
    clientName: string;
    item: string;
    value: string;
    status: 'Lead' | 'Quotation' | 'Approved' | 'Production' | 'QC' | 'Ready' | 'Delivered';
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
