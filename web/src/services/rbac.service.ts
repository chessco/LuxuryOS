import api from './api';

export type RoleName = 'SYSTEM_ADMIN' | 'TENANT_ADMIN' | 'VENDEDOR' | 'JOYERO' | 'TENANT_USER';

export type PermissionKey =
    | 'view_payments'
    | 'register_payments'
    | 'view_labor_cost'
    | 'view_costs_margins'
    | 'view_client_contact'
    | 'modify_order_details'
    | 'delete_orders'
    | 'reverse_workflow_status'
    | 'view_envelope_photos';

export interface PermissionDefinition {
    key: PermissionKey;
    label: string;
    description: string;
    category: 'Finanzas' | 'Taller & Producción' | 'Clientes' | 'Seguridad';
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
    {
        key: 'view_payments',
        label: 'Ver Estado del Pago',
        description: 'Visualizar importes pagados, pendientes y avances financieros de la orden',
        category: 'Finanzas'
    },
    {
        key: 'register_payments',
        label: 'Registrar y Gestionar Pagos',
        description: 'Capacidad para abonar pagos, liquidar o cancelar transacciones',
        category: 'Finanzas'
    },
    {
        key: 'view_labor_cost',
        label: 'Ver Mano de Obra y Comisión',
        description: 'Ver costos de taller asignados a la orden general',
        category: 'Taller & Producción'
    },
    {
        key: 'view_costs_margins',
        label: 'Ver Costos y Márgenes del Atelier',
        description: 'Visualizar costo de materiales, costo interno y margen de utilidad neta',
        category: 'Finanzas'
    },
    {
        key: 'view_client_contact',
        label: 'Ver Contacto Directo del Cliente',
        description: 'Acceso a botones de WhatsApp, teléfono y correo electrónico directo',
        category: 'Clientes'
    },
    {
        key: 'modify_order_details',
        label: 'Modificar Datos de la Orden',
        description: 'Editar especificaciones, prioridad, fechas y notas técnicas',
        category: 'Taller & Producción'
    },
    {
        key: 'reverse_workflow_status',
        label: 'Retroceder Estatus Operativo',
        description: 'Mover pedidos hacia etapas previas en el flujo de trabajo',
        category: 'Seguridad'
    },
    {
        key: 'delete_orders',
        label: 'Eliminar Pedidos',
        description: 'Borrar permanentemente órdenes y sus registros asociados',
        category: 'Seguridad'
    },
    {
        key: 'view_envelope_photos',
        label: 'Ver Fotos del Sobre Físico',
        description: 'Acceso a la galería de fotos del sobre y documentación fotográfica',
        category: 'Taller & Producción'
    }
];

export type RolePermissionsMatrix = Record<RoleName, Record<PermissionKey, boolean>>;

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsMatrix = {
    SYSTEM_ADMIN: {
        view_payments: true,
        register_payments: true,
        view_labor_cost: true,
        view_costs_margins: true,
        view_client_contact: true,
        modify_order_details: true,
        delete_orders: true,
        reverse_workflow_status: true,
        view_envelope_photos: true,
    },
    TENANT_ADMIN: {
        view_payments: true,
        register_payments: true,
        view_labor_cost: true,
        view_costs_margins: true,
        view_client_contact: true,
        modify_order_details: true,
        delete_orders: true,
        reverse_workflow_status: true,
        view_envelope_photos: true,
    },
    VENDEDOR: {
        view_payments: true,
        register_payments: true,
        view_labor_cost: true,
        view_costs_margins: false,
        view_client_contact: true,
        modify_order_details: true,
        delete_orders: false,
        reverse_workflow_status: false,
        view_envelope_photos: true,
    },
    JOYERO: {
        view_payments: false, // Oculto por diseño para Joyero
        register_payments: false,
        view_labor_cost: true,
        view_costs_margins: false,
        view_client_contact: false,
        modify_order_details: false,
        delete_orders: false,
        reverse_workflow_status: false,
        view_envelope_photos: true,
    },
    TENANT_USER: {
        view_payments: false,
        register_payments: false,
        view_labor_cost: true,
        view_costs_margins: false,
        view_client_contact: false,
        modify_order_details: false,
        delete_orders: false,
        reverse_workflow_status: false,
        view_envelope_photos: true,
    }
};

const LOCAL_STORAGE_KEY = 'luxuryos_rbac_permissions';

export class RBACService {
    private static currentMatrix: RolePermissionsMatrix = DEFAULT_ROLE_PERMISSIONS;
    private static loaded = false;

    static getEffectiveRole(rawUser?: any): RoleName {
        const user = rawUser || this.getCurrentUser();
        const role = String(user?.role || '').toUpperCase();
        const email = String(user?.email || '').toLowerCase();
        const name = String(user?.name || '').toLowerCase();

        if (role === 'SYSTEM_ADMIN' || role === 'SUPER_ADMIN' || email.includes('system@')) {
            return 'SYSTEM_ADMIN';
        }
        if (role === 'TENANT_ADMIN' || role === 'ADMIN' || email.includes('admin@')) {
            return 'TENANT_ADMIN';
        }
        if (role === 'JOYERO' || role.includes('JOYER') || email.includes('joyero') || name.includes('joyero')) {
            return 'JOYERO';
        }
        if (role === 'VENDEDOR' || email.includes('ventas') || email.includes('vendedor')) {
            return 'VENDEDOR';
        }
        return (role as RoleName) || 'TENANT_USER';
    }

    static getCurrentUser(): any {
        try {
            const raw = localStorage.getItem('user');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        } catch {}
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                return JSON.parse(decodeURIComponent(escape(window.atob(base64))));
            }
        } catch {}
        return {};
    }

    static getMatrix(): RolePermissionsMatrix {
        if (!this.loaded) {
            try {
                const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (cached) {
                    this.currentMatrix = { ...DEFAULT_ROLE_PERMISSIONS, ...JSON.parse(cached) };
                }
            } catch {}
            this.loaded = true;
        }
        return this.currentMatrix;
    }

    static async fetchPermissions(): Promise<RolePermissionsMatrix> {
        try {
            const response = await api.get('/settings');
            const data = response.data || {};
            if (data.rbac_permissions) {
                const parsed = JSON.parse(data.rbac_permissions);
                this.currentMatrix = { ...DEFAULT_ROLE_PERMISSIONS, ...parsed };
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.currentMatrix));
                return this.currentMatrix;
            }
        } catch (error) {
            console.warn('[RBACService] Using default/cached permissions:', error);
        }
        return this.getMatrix();
    }

    static async savePermissions(matrix: RolePermissionsMatrix): Promise<void> {
        this.currentMatrix = matrix;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(matrix));
        try {
            await api.post('/settings', {
                rbac_permissions: JSON.stringify(matrix)
            });
        } catch (error) {
            console.error('[RBACService] Failed to save to server:', error);
            throw error;
        }
    }

    static hasPermission(permission: PermissionKey, customUser?: any): boolean {
        const role = this.getEffectiveRole(customUser);
        const matrix = this.getMatrix();
        const rolePerms = matrix[role] || DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.TENANT_USER;

        // Regla inviolable: Joyero nunca ve pagos a menos que se configure explícitamente en la matriz
        return rolePerms[permission] ?? false;
    }
}
