import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { resolveMediaUrl } from '../services/api';

type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
type StatusFilter = 'NON_ARCHIVED' | ProductStatus | 'ALL';
type MovementType = 'INITIAL_STOCK' | 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
type KardexFilter = 'ALL' | 'ENTRIES' | 'EXIT' | 'ADJUSTMENT';

type KardexMovement = {
    id: string;
    type: MovementType;
    quantityDelta: number;
    balanceAfter: number | null;
    unitCost: number | null;
    currency: string;
    comments: string | null;
    entryId: string | null;
    saleId: string | null;
    supplierName: string | null;
    customerName: string | null;
    salesChannel: string | null;
    createdByName: string | null;
    createdAt: string;
};

type KardexResponse = {
    product: InventoryProduct;
    summary: {
        totalIn: number;
        totalOut: number;
        netAdjustments: number;
        movementCount: number;
        calculatedStock?: number;
    };
    movements: KardexMovement[];
};

type InventoryProduct = {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    category: string | null;
    imageUrl: string | null;
    unitCost: number | null;
    unitPrice: number;
    resellerPrice: number | null;
    wholesalePrice: number | null;
    currency: string;
    stockOnHand: number;
    reservedQuantity: number;
    availableQuantity: number;
    availableToResellers: boolean;
    status: ProductStatus;
    hasHistory?: boolean;
};

type ProductFormState = {
    sku: string;
    name: string;
    description: string;
    category: string;
    imageUrl: string;
    unitCost: string;
    unitPrice: string;
    resellerPrice: string;
    wholesalePrice: string;
    currency: string;
    availableToResellers: boolean;
    status: ProductStatus;
};

const EMPTY_FORM: ProductFormState = {
    sku: '',
    name: '',
    description: '',
    category: '',
    imageUrl: '',
    unitCost: '',
    unitPrice: '',
    resellerPrice: '',
    wholesalePrice: '',
    currency: 'MXN',
    availableToResellers: true,
    status: 'ACTIVE',
};

const DEFAULT_CATEGORIES = ['Joyería', 'Relojería', 'Gemas', 'Accesorios'];

const STATUS_META: Record<ProductStatus, { label: string; className: string }> = {
    ACTIVE: {
        label: 'Activo',
        className: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    INACTIVE: {
        label: 'Inactivo',
        className: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
    ARCHIVED: {
        label: 'Archivado',
        className: 'text-muted-foreground bg-muted border-border',
    },
};

const MOVEMENT_META: Record<MovementType, { label: string; className: string }> = {
    INITIAL_STOCK: {
        label: 'Inv. inicial',
        className: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    },
    ENTRY: {
        label: 'Entrada',
        className: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    EXIT: {
        label: 'Salida',
        className: 'text-red-500 bg-red-500/10 border-red-500/20',
    },
    ADJUSTMENT: {
        label: 'Ajuste',
        className: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
};

const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(value));

const money = (value: number | string, currency = 'MXN') =>
    new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: currency || 'MXN',
        maximumFractionDigits: 2,
    }).format(Number(value || 0));

const compressImageFile = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.78): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No fue posible leer la imagen seleccionada.'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('El archivo seleccionado no es una imagen válida.'));
            img.onload = () => {
                let { width, height } = img;
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('No fue posible procesar la imagen.'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = String(reader.result || '');
        };
        reader.readAsDataURL(file);
    });

const getApiErrorMessage = (error: any, fallback: string): string => {
    const message = error?.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string' && message.trim()) return message;
    return fallback;
};

const InventoryPage: React.FC = () => {
    const [products, setProducts] = useState<InventoryProduct[]>([]);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('NON_ARCHIVED');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    // Modal state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
    const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Delete / archive confirmation state
    const [deletingProduct, setDeletingProduct] = useState<InventoryProduct | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // Kardex modal state
    const [kardexProduct, setKardexProduct] = useState<InventoryProduct | null>(null);
    const [kardexData, setKardexData] = useState<KardexResponse | null>(null);
    const [kardexLoading, setKardexLoading] = useState(false);
    const [kardexError, setKardexError] = useState('');
    const [kardexFilter, setKardexFilter] = useState<KardexFilter>('ALL');
    const [showMovementForm, setShowMovementForm] = useState(false);
    const [movementForm, setMovementForm] = useState<{
        type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
        direction: 'ADD' | 'SUBTRACT';
        quantity: string;
        unitCost: string;
        comments: string;
    }>({
        type: 'ENTRY',
        direction: 'ADD',
        quantity: '1',
        unitCost: '',
        comments: '',
    });
    const [movementSaving, setMovementSaving] = useState(false);
    const [movementError, setMovementError] = useState('');

    const loadInventory = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get<InventoryProduct[]>('/commerce/products');
            setProducts(response.data);
        } catch (requestError: any) {
            setError(getApiErrorMessage(requestError, 'No fue posible cargar el inventario. Intenta actualizar de nuevo.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadInventory();
    }, []);

    const categories = useMemo(
        () => [...new Set(products.map((product) => product.category).filter(Boolean) as string[])].sort(),
        [products],
    );

    const categorySuggestions = useMemo(
        () => [...new Set([...DEFAULT_CATEGORIES, ...categories])].sort(),
        [categories],
    );

    const rows = useMemo(
        () =>
            products.filter((product) => {
                const matchesStatus =
                    statusFilter === 'ALL'
                        ? true
                        : statusFilter === 'NON_ARCHIVED'
                          ? product.status !== 'ARCHIVED'
                          : product.status === statusFilter;
                if (!matchesStatus) return false;
                if (category && product.category !== category) return false;
                const needle = query.trim().toLowerCase();
                if (!needle) return true;
                const text = `${product.sku} ${product.name} ${product.category || ''} ${product.description || ''}`.toLowerCase();
                return text.includes(needle);
            }),
        [category, products, query, statusFilter],
    );

    const summary = useMemo(
        () =>
            products
                .filter((product) => product.status === 'ACTIVE')
                .reduce(
                    (totals, product) => {
                        const available = Math.max(0, Number(product.stockOnHand) - Number(product.reservedQuantity));
                        totals.activeCount += 1;
                        totals.stock += Number(product.stockOnHand);
                        totals.reserved += Number(product.reservedQuantity);
                        totals.available += available;
                        totals.value += Number(product.unitPrice || 0) * Number(product.stockOnHand);
                        if (available > 0 && available <= 1) totals.lowStock += 1;
                        return totals;
                    },
                    { activeCount: 0, stock: 0, reserved: 0, available: 0, value: 0, lowStock: 0 },
                ),
        [products],
    );

    const openCreateModal = () => {
        setEditingProduct(null);
        setForm(EMPTY_FORM);
        setFormError('');
        setIsFormOpen(true);
    };

    const openEditModal = (product: InventoryProduct) => {
        setEditingProduct(product);
        setForm({
            sku: product.sku,
            name: product.name,
            description: product.description || '',
            category: product.category || '',
            imageUrl: product.imageUrl || '',
            unitCost: product.unitCost !== null && product.unitCost !== undefined ? String(product.unitCost) : '',
            unitPrice: String(product.unitPrice ?? 0),
            resellerPrice: product.resellerPrice !== null && product.resellerPrice !== undefined ? String(product.resellerPrice) : '',
            wholesalePrice: product.wholesalePrice !== null && product.wholesalePrice !== undefined ? String(product.wholesalePrice) : '',
            currency: product.currency || 'MXN',
            availableToResellers: product.availableToResellers,
            status: product.status,
        });
        setFormError('');
        setIsFormOpen(true);
    };

    const closeFormModal = () => {
        if (saving) return;
        setIsFormOpen(false);
        setEditingProduct(null);
        setFormError('');
    };

    const handleImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setFormError('');
        try {
            const compressed = await compressImageFile(file);
            setForm((current) => ({ ...current, imageUrl: compressed }));
        } catch (err: any) {
            setFormError(err?.message || 'No fue posible procesar la imagen.');
        }
    };

    const handleSaveProduct = async (event: React.FormEvent) => {
        event.preventDefault();
        setFormError('');

        const sku = form.sku.trim().toUpperCase();
        const name = form.name.trim();
        const unitCostRaw = form.unitCost.trim();
        const unitCost = unitCostRaw ? Number(unitCostRaw) : null;
        const unitPrice = Number(form.unitPrice);
        const resellerPriceRaw = form.resellerPrice.trim();
        const wholesalePriceRaw = form.wholesalePrice.trim();
        const resellerPrice = resellerPriceRaw ? Number(resellerPriceRaw) : null;
        const wholesalePrice = wholesalePriceRaw ? Number(wholesalePriceRaw) : null;

        if (!sku) {
            setFormError('El SKU es obligatorio.');
            return;
        }
        if (!name) {
            setFormError('El nombre del artículo es obligatorio.');
            return;
        }
        if (unitCost !== null && (!Number.isFinite(unitCost) || unitCost < 0)) {
            setFormError('Ingresa un costo válido (mayor o igual a 0).');
            return;
        }
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            setFormError('Ingresa un Precio 1 (Ventas) válido (mayor o igual a 0).');
            return;
        }
        if (resellerPrice !== null && (!Number.isFinite(resellerPrice) || resellerPrice < 0)) {
            setFormError('Ingresa un Precio 2 (Revendedor) válido (mayor o igual a 0).');
            return;
        }
        if (wholesalePrice !== null && (!Number.isFinite(wholesalePrice) || wholesalePrice < 0)) {
            setFormError('Ingresa un Precio 3 (Mayorista) válido (mayor o igual a 0).');
            return;
        }

        const payload = {
            sku,
            name,
            description: form.description.trim() || null,
            category: form.category.trim() || null,
            imageUrl: form.imageUrl.trim() || null,
            unitCost,
            unitPrice,
            resellerPrice,
            wholesalePrice,
            currency: form.currency,
            availableToResellers: form.availableToResellers,
            status: form.status,
        };

        setSaving(true);
        try {
            if (editingProduct) {
                await api.patch<InventoryProduct>(`/commerce/products/${editingProduct.id}`, payload);
                setNotice(`Artículo "${name}" (${sku}) actualizado correctamente.`);
            } else {
                await api.post<InventoryProduct>('/commerce/products', payload);
                setNotice(`Artículo "${name}" (${sku}) creado en el catálogo.`);
            }
            setIsFormOpen(false);
            setEditingProduct(null);
            await loadInventory();
        } catch (requestError: any) {
            setFormError(getApiErrorMessage(requestError, 'No fue posible guardar el artículo.'));
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingProduct) return;
        setDeleteError('');
        setDeleting(true);
        try {
            const response = await api.delete<{ deleted: boolean; archived: boolean; message?: string }>(
                `/commerce/products/${deletingProduct.id}`,
            );
            setNotice(
                response.data?.message ||
                    (response.data?.archived
                        ? `Artículo "${deletingProduct.name}" archivado.`
                        : `Artículo "${deletingProduct.name}" eliminado del inventario.`),
            );
            setDeletingProduct(null);
            await loadInventory();
        } catch (requestError: any) {
            setDeleteError(getApiErrorMessage(requestError, 'No fue posible eliminar el artículo.'));
        } finally {
            setDeleting(false);
        }
    };

    const loadKardex = async (productId: string) => {
        setKardexLoading(true);
        setKardexError('');
        try {
            const response = await api.get<KardexResponse>(`/commerce/products/${productId}/kardex`);
            setKardexData(response.data);
            setKardexProduct(response.data.product);
            setEditingProduct((current) =>
                current && current.id === response.data.product.id ? response.data.product : current,
            );
        } catch (requestError: any) {
            setKardexError(getApiErrorMessage(requestError, 'No fue posible cargar el kardex del artículo.'));
        } finally {
            setKardexLoading(false);
        }
    };

    const openKardexModal = (product: InventoryProduct) => {
        setKardexProduct(product);
        setKardexData(null);
        setKardexFilter('ALL');
        setShowMovementForm(false);
        setMovementError('');
        setMovementForm({
            type: 'ENTRY',
            direction: 'ADD',
            quantity: '1',
            unitCost: product.unitCost !== null && product.unitCost !== undefined ? String(product.unitCost) : '',
            comments: '',
        });
        void loadKardex(product.id);
    };

    const closeKardexModal = () => {
        if (movementSaving) return;
        setKardexProduct(null);
        setKardexData(null);
        setKardexError('');
        setMovementError('');
    };

    const visibleMovements = useMemo(() => {
        const list = kardexData?.movements || [];
        if (kardexFilter === 'ALL') return list;
        if (kardexFilter === 'ENTRIES') {
            return list.filter((m) => m.type === 'INITIAL_STOCK' || m.type === 'ENTRY');
        }
        return list.filter((m) => m.type === kardexFilter);
    }, [kardexData, kardexFilter]);

    const handleRecordMovement = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!kardexProduct) return;
        setMovementError('');

        const quantity = Number(movementForm.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) {
            setMovementError('La cantidad debe ser un número entero mayor a 0.');
            return;
        }

        const unitCostRaw = movementForm.unitCost.trim();
        const unitCost = unitCostRaw ? Number(unitCostRaw) : null;
        if (unitCost !== null && (!Number.isFinite(unitCost) || unitCost < 0)) {
            setMovementError('El costo unitario debe ser mayor o igual a 0.');
            return;
        }

        const quantityDelta =
            movementForm.type === 'ENTRY'
                ? quantity
                : movementForm.type === 'EXIT'
                  ? -quantity
                  : movementForm.direction === 'SUBTRACT'
                    ? -quantity
                    : quantity;

        setMovementSaving(true);
        try {
            await api.post(`/commerce/products/${kardexProduct.id}/movements`, {
                type: movementForm.type,
                quantityDelta,
                unitCost: movementForm.type === 'ENTRY' ? unitCost : null,
                comments: movementForm.comments.trim() || null,
            });
            setMovementForm({
                type: 'ENTRY',
                direction: 'ADD',
                quantity: '1',
                unitCost:
                    kardexProduct.unitCost !== null && kardexProduct.unitCost !== undefined
                        ? String(kardexProduct.unitCost)
                        : '',
                comments: '',
            });
            setShowMovementForm(false);
            setNotice(`Movimiento registrado en el kardex de "${kardexProduct.name}".`);
            await Promise.all([loadKardex(kardexProduct.id), loadInventory()]);
        } catch (requestError: any) {
            setMovementError(getApiErrorMessage(requestError, 'No fue posible registrar el movimiento.'));
        } finally {
            setMovementSaving(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center max-w-[1400px] mx-auto w-full">
            <div className="w-full flex flex-col gap-8">
                <div className="flex flex-col lg:flex-row flex-wrap justify-between gap-6 items-start lg:items-end">
                    <div className="flex flex-col gap-3 max-w-2xl">
                        <p className="text-red-500 text-[10px] font-black uppercase tracking-[0.2em]">Inventario</p>
                        <h1 className="text-foreground text-4xl font-black tracking-tight font-display">Inventario</h1>
                        <p className="text-muted-foreground text-sm font-medium">
                            Catálogo, existencias y precios sincronizados en tiempo real con el punto de venta.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            to="/inventory/operations"
                            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card text-foreground hover:border-red-500 transition-all h-12 px-6 text-xs font-black uppercase tracking-[0.2em]"
                        >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">move_to_inbox</span>
                            <span>Nueva entrada</span>
                        </Link>
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="flex items-center justify-center gap-2 rounded-xl bg-foreground text-background transition-all h-12 px-8 text-xs font-black uppercase tracking-[0.2em] shadow-xl active:scale-95"
                        >
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add</span>
                            <span>Nuevo artículo</span>
                        </button>
                    </div>
                </div>

                {notice && (
                    <div
                        role="status"
                        className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3.5 text-sm text-emerald-500"
                    >
                        <span>{notice}</span>
                        <button
                            type="button"
                            onClick={() => setNotice('')}
                            className="text-xs font-black uppercase tracking-widest hover:opacity-80"
                            aria-label="Cerrar notificación"
                        >
                            Cerrar
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <SummaryStat label="Valor de catálogo" value={money(summary.value)} />
                    <SummaryStat label="Artículos activos" value={String(summary.activeCount)} />
                    <SummaryStat label="Existencia" value={String(summary.stock)} />
                    <SummaryStat label="Reservadas" value={String(summary.reserved)} />
                    <SummaryStat
                        label="Disponibles"
                        value={String(summary.available)}
                        badge={summary.lowStock ? `${summary.lowStock} bajo` : undefined}
                    />
                </div>

                <div className="bg-card rounded-2xl p-6 border border-border flex flex-col lg:flex-row justify-between gap-4 shadow-sm">
                    <label className="relative flex items-center w-full lg:max-w-md h-12 rounded-xl bg-muted/50 border border-border overflow-hidden focus-within:border-red-500 transition-all">
                        <span className="grid place-items-center h-full w-12 text-muted-foreground material-symbols-outlined" aria-hidden="true">
                            search
                        </span>
                        <span className="sr-only">Buscar inventario</span>
                        <input
                            className="h-full w-full outline-none text-sm text-foreground bg-transparent pr-2 placeholder-muted-foreground"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar por nombre, SKU o categoría..."
                            type="search"
                        />
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="sr-only" htmlFor="inventory-category">Categoría</label>
                        <select
                            id="inventory-category"
                            value={category}
                            onChange={(event) => setCategory(event.target.value)}
                            className="h-12 rounded-xl bg-muted/50 border border-border px-4 text-xs font-bold uppercase tracking-widest text-foreground focus:border-red-500 focus:outline-none"
                        >
                            <option value="">Todas las categorías</option>
                            {categories.map((value) => (
                                <option key={value} value={value}>{value}</option>
                            ))}
                        </select>
                        <label className="sr-only" htmlFor="inventory-status">Estado</label>
                        <select
                            id="inventory-status"
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                            className="h-12 rounded-xl bg-muted/50 border border-border px-4 text-xs font-bold uppercase tracking-widest text-foreground focus:border-red-500 focus:outline-none"
                        >
                            <option value="NON_ARCHIVED">Activos e inactivos</option>
                            <option value="ACTIVE">Solo activos</option>
                            <option value="INACTIVE">Solo inactivos</option>
                            <option value="ARCHIVED">Archivados</option>
                            <option value="ALL">Todos</option>
                        </select>
                        <button
                            type="button"
                            onClick={() => void loadInventory()}
                            disabled={loading}
                            className="h-12 rounded-xl border border-border bg-card px-5 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-red-500 disabled:opacity-50 transition-all"
                            aria-label="Actualizar inventario"
                        >
                            {loading ? 'Cargando…' : 'Actualizar'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-500">
                        {error}
                    </div>
                )}

                <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">
                                <th className="px-8 py-5 font-bold">Artículo</th>
                                <th className="px-5 py-5 font-bold">Categoría</th>
                                <th className="px-5 py-5 font-bold text-center">Existencia</th>
                                <th className="px-5 py-5 font-bold text-center">Reservadas</th>
                                <th className="px-5 py-5 font-bold text-center">Disponible</th>
                                <th className="px-5 py-5 font-bold text-right">
                                    <span>Costo</span>
                                    <span className="block text-[9px] font-medium opacity-70">Unitario</span>
                                </th>
                                <th className="px-5 py-5 font-bold text-right">
                                    <span>Precio 1</span>
                                    <span className="block text-[9px] font-medium opacity-70">Ventas</span>
                                </th>
                                <th className="px-5 py-5 font-bold text-right">
                                    <span>Precio 2</span>
                                    <span className="block text-[9px] font-medium opacity-70">Revendedor</span>
                                </th>
                                <th className="px-5 py-5 font-bold text-right">
                                    <span>Precio 3</span>
                                    <span className="block text-[9px] font-medium opacity-70">Mayorista</span>
                                </th>
                                <th className="px-8 py-5 font-bold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading && (
                                <tr>
                                    <td colSpan={10} className="px-8 py-16 text-center text-sm text-muted-foreground">
                                        Cargando inventario…
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                !error &&
                                rows.map((product) => {
                                    const available = Math.max(0, Number(product.stockOnHand) - Number(product.reservedQuantity));
                                    const statusInfo = STATUS_META[product.status];
                                    const imgSrc = resolveMediaUrl(product.imageUrl);

                                    return (
                                        <tr key={product.id} className="group hover:bg-muted/30 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-5">
                                                    <div className="h-14 w-14 rounded-2xl border border-border bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                                                        {imgSrc ? (
                                                            <img src={imgSrc} alt={product.name} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-[24px] text-muted-foreground" aria-hidden="true">
                                                                diamond
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h2 className="font-bold text-foreground text-base leading-tight uppercase tracking-tighter">
                                                                {product.name}
                                                            </h2>
                                                            {product.status !== 'ACTIVE' && (
                                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border ${statusInfo.className}`}>
                                                                    {statusInfo.label}
                                                                </span>
                                                            )}
                                                            {!product.availableToResellers && (
                                                                <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-border bg-muted text-muted-foreground">
                                                                    Solo interno
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                                            <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                                                                SKU: {product.sku}
                                                            </span>
                                                            {product.description && (
                                                                <>
                                                                    <span className="w-1 h-1 rounded-full bg-border" />
                                                                    <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest line-clamp-1 max-w-xs">
                                                                        {product.description}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-6 text-xs font-medium text-muted-foreground">
                                                {product.category || 'Sin categoría'}
                                            </td>
                                            <td className="px-5 py-6 text-center font-black text-foreground">{product.stockOnHand}</td>
                                            <td className="px-5 py-6 text-center font-black text-muted-foreground">{product.reservedQuantity}</td>
                                            <td className="px-5 py-6 text-center">
                                                <span className="font-black text-foreground">{available}</span>
                                                {available > 0 && available <= 1 && (
                                                    <span className="ml-2 inline-block h-2 w-2 rounded-full bg-red-500" title="Stock bajo" />
                                                )}
                                            </td>
                                            <td className="px-5 py-6 text-right">
                                                {product.unitCost !== null && product.unitCost !== undefined ? (
                                                    <>
                                                        <p className="font-bold text-muted-foreground text-base">{money(product.unitCost, product.currency)}</p>
                                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">
                                                            {product.currency}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <span className="text-xs font-bold text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-6 text-right">
                                                <p className="font-bold text-foreground text-base">{money(product.unitPrice, product.currency)}</p>
                                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">
                                                    {product.currency}
                                                </p>
                                            </td>
                                            <td className="px-5 py-6 text-right">
                                                {product.resellerPrice !== null && product.resellerPrice !== undefined ? (
                                                    <>
                                                        <p className="font-bold text-foreground text-base">{money(product.resellerPrice, product.currency)}</p>
                                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">
                                                            {product.currency}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <span className="text-xs font-bold text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-6 text-right">
                                                {product.wholesalePrice !== null && product.wholesalePrice !== undefined ? (
                                                    <>
                                                        <p className="font-bold text-foreground text-base">{money(product.wholesalePrice, product.currency)}</p>
                                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">
                                                            {product.currency}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <span className="text-xs font-bold text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="inline-flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openKardexModal(product)}
                                                        className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:border-red-500 transition-all"
                                                        aria-label={`Ver kardex de ${product.name}`}
                                                        title="Ver kardex (entradas, salidas y ajustes)"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">history</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(product)}
                                                        className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:border-red-500 transition-all"
                                                        aria-label={`Editar ${product.name}`}
                                                        title="Editar artículo"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setDeleteError('');
                                                            setDeletingProduct(product);
                                                        }}
                                                        disabled={product.reservedQuantity > 0}
                                                        className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-red-500 hover:border-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                        aria-label={`Eliminar ${product.name}`}
                                                        title={
                                                            product.reservedQuantity > 0
                                                                ? 'No se puede eliminar mientras tenga unidades reservadas'
                                                                : product.hasHistory
                                                                  ? 'Archivar artículo'
                                                                  : 'Eliminar artículo'
                                                        }
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                                                            {product.hasHistory ? 'archive' : 'delete'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            {!loading && !error && rows.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="px-8 py-16 text-center">
                                        <p className="font-bold text-foreground">No hay artículos que coincidan.</p>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Modifica los filtros o crea un nuevo artículo con el botón “Nuevo artículo”.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <div className="px-8 py-5 border-t border-border bg-muted/30">
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest" aria-live="polite">
                            Mostrando {rows.length} de {products.length} artículos
                        </p>
                    </div>
                </div>
            </div>

            {isFormOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="inventory-modal-title"
                >
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border px-6 py-5">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
                                    {editingProduct ? 'Editar catálogo' : 'Alta de catálogo'}
                                </p>
                                <h2 id="inventory-modal-title" className="text-xl font-black text-foreground">
                                    {editingProduct ? `Editar ${editingProduct.name}` : 'Nuevo artículo'}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                {editingProduct && (
                                    <button
                                        type="button"
                                        onClick={() => openKardexModal(editingProduct)}
                                        className="h-9 rounded-xl border border-border bg-background px-3 text-xs font-black uppercase tracking-widest text-foreground hover:border-red-500 inline-flex items-center gap-1.5 transition-all"
                                        title="Ver kardex del artículo"
                                        aria-label={`Ver kardex de ${editingProduct.name}`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                                            receipt_long
                                        </span>
                                        <span>Kardex</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={closeFormModal}
                                    className="h-9 w-9 rounded-xl border border-border text-muted-foreground hover:text-foreground inline-flex items-center justify-center"
                                    aria-label="Cerrar formulario"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSaveProduct} className="p-6 space-y-5">
                            {formError && (
                                <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                                    {formError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    <span>SKU *</span>
                                    <input
                                        required
                                        maxLength={80}
                                        value={form.sku}
                                        onChange={(e) => setForm((c) => ({ ...c, sku: e.target.value.toUpperCase() }))}
                                        placeholder="Ej. RNG-DIA-001"
                                        className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground focus:border-red-500 focus:outline-none"
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    <span>Categoría</span>
                                    <input
                                        list="inventory-category-suggestions"
                                        maxLength={120}
                                        value={form.category}
                                        onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
                                        placeholder="Ej. Joyería, Relojería, Gemas"
                                        className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground focus:border-red-500 focus:outline-none"
                                    />
                                    <datalist id="inventory-category-suggestions">
                                        {categorySuggestions.map((item) => (
                                            <option key={item} value={item} />
                                        ))}
                                    </datalist>
                                </label>
                            </div>

                            <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                <span>Nombre del artículo *</span>
                                <input
                                    required
                                    maxLength={191}
                                    value={form.name}
                                    onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                                    placeholder="Ej. Anillo Diamante Solitario"
                                    className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground focus:border-red-500 focus:outline-none"
                                />
                            </label>

                            <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                <span>Descripción</span>
                                <textarea
                                    rows={2}
                                    maxLength={2000}
                                    value={form.description}
                                    onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                                    placeholder="Especificaciones, kilates, peso, medidas..."
                                    className="rounded-xl border border-border bg-background p-3.5 text-sm font-medium text-foreground focus:border-red-500 focus:outline-none"
                                />
                            </label>

                            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                        Costos y lista de precios
                                    </p>
                                    {form.unitCost.trim() !== '' &&
                                        Number(form.unitCost) > 0 &&
                                        Number(form.unitPrice) > 0 && (
                                            <span className="text-[11px] font-bold text-emerald-500">
                                                Margen Precio 1:{' '}
                                                {(
                                                    ((Number(form.unitPrice) - Number(form.unitCost)) /
                                                        Number(form.unitPrice)) *
                                                    100
                                                ).toFixed(1)}
                                                %
                                            </span>
                                        )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        <span>Costo unitario</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.unitCost}
                                            onChange={(e) => setForm((c) => ({ ...c, unitCost: e.target.value }))}
                                            placeholder="Opcional"
                                            className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground focus:border-red-500 focus:outline-none"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        <span>Precio 1 (Ventas) *</span>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.unitPrice}
                                            onChange={(e) => setForm((c) => ({ ...c, unitPrice: e.target.value }))}
                                            placeholder="0.00"
                                            className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground focus:border-red-500 focus:outline-none"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        <span>Precio 2 (Revendedor)</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.resellerPrice}
                                            onChange={(e) => setForm((c) => ({ ...c, resellerPrice: e.target.value }))}
                                            placeholder="Opcional"
                                            className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground focus:border-red-500 focus:outline-none"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        <span>Precio 3 (Mayorista)</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.wholesalePrice}
                                            onChange={(e) => setForm((c) => ({ ...c, wholesalePrice: e.target.value }))}
                                            placeholder="Opcional"
                                            className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground focus:border-red-500 focus:outline-none"
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    <span>Moneda</span>
                                    <select
                                        value={form.currency}
                                        onChange={(e) => setForm((c) => ({ ...c, currency: e.target.value }))}
                                        className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground focus:border-red-500 focus:outline-none"
                                    >
                                        <option value="MXN">MXN</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </label>
                                <div className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    <span>Existencia (calculada del Kardex)</span>
                                    <div className="min-h-11 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 flex items-center justify-between gap-3">
                                        {editingProduct ? (
                                            <>
                                                <div>
                                                    <p className="text-sm font-black text-foreground">
                                                        {editingProduct.stockOnHand}
                                                    </p>
                                                    <p className="text-[10px] font-medium normal-case text-muted-foreground">
                                                        Disponible:{' '}
                                                        {Math.max(
                                                            0,
                                                            editingProduct.stockOnHand - editingProduct.reservedQuantity,
                                                        )}{' '}
                                                        · Reservadas: {editingProduct.reservedQuantity}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => openKardexModal(editingProduct)}
                                                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-[10px] font-black uppercase tracking-wider text-foreground hover:border-red-500 inline-flex items-center gap-1.5 shrink-0 transition-all"
                                                    title="Abrir Kardex para registrar entradas, salidas o ajustes"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                                                        receipt_long
                                                    </span>
                                                    <span>Ver Kardex</span>
                                                </button>
                                            </>
                                        ) : (
                                            <div>
                                                <p className="text-sm font-black text-foreground">0</p>
                                                <p className="text-[10px] font-medium normal-case text-muted-foreground">
                                                    Se calcula con entradas o movimientos en Kardex al guardar.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    <span>Estado</span>
                                    <select
                                        value={form.status}
                                        onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as ProductStatus }))}
                                        className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground focus:border-red-500 focus:outline-none"
                                    >
                                        <option value="ACTIVE">Activo</option>
                                        <option value="INACTIVE">Inactivo</option>
                                        <option value="ARCHIVED" disabled={Boolean(editingProduct && editingProduct.reservedQuantity > 0)}>
                                            Archivado
                                        </option>
                                    </select>
                                </label>

                                <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 mt-4 sm:mt-5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.availableToResellers}
                                        onChange={(e) => setForm((c) => ({ ...c, availableToResellers: e.target.checked }))}
                                        className="h-4 w-4 accent-red-500"
                                    />
                                    <span className="text-xs font-bold text-foreground">Visible en POS de revendedores</span>
                                </label>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fotografía del artículo</p>
                                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                    <div className="h-16 w-16 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                        {form.imageUrl ? (
                                            <img
                                                src={resolveMediaUrl(form.imageUrl)}
                                                alt="Vista previa"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="material-symbols-outlined text-muted-foreground">image</span>
                                        )}
                                    </div>
                                    <div className="flex-1 w-full space-y-2">
                                        <div className="flex flex-wrap gap-2">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageSelected}
                                                className="hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:border-red-500 transition-all"
                                            >
                                                Subir imagen
                                            </button>
                                            {form.imageUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setForm((c) => ({ ...c, imageUrl: '' }))}
                                                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-red-500 hover:border-red-500 transition-all"
                                                >
                                                    Quitar imagen
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            value={form.imageUrl.startsWith('data:') ? '' : form.imageUrl}
                                            onChange={(e) => setForm((c) => ({ ...c, imageUrl: e.target.value }))}
                                            placeholder={
                                                form.imageUrl.startsWith('data:')
                                                    ? 'Imagen local lista para guardar'
                                                    : 'O pega una URL de imagen (https://... o /uploads/...)'
                                            }
                                            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                                <button
                                    type="button"
                                    onClick={closeFormModal}
                                    disabled={saving}
                                    className="h-11 rounded-xl border border-border px-5 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="h-11 rounded-xl bg-foreground px-7 text-xs font-black uppercase tracking-[0.2em] text-background shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    {saving ? 'Guardando…' : editingProduct ? 'Guardar cambios' : 'Crear artículo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deletingProduct && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-modal-title"
                >
                    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
                            {deletingProduct.hasHistory ? 'Archivar artículo' : 'Eliminar artículo'}
                        </p>
                        <h2 id="delete-modal-title" className="text-xl font-black text-foreground">
                            {deletingProduct.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {deletingProduct.hasHistory
                                ? `El SKU ${deletingProduct.sku} ya tiene ventas, reservas o movimientos registrados. Al confirmar se archivará y dejará de estar disponible para venta.`
                                : `¿Deseas eliminar permanentemente el artículo ${deletingProduct.sku} del inventario? Esta acción no se puede deshacer.`}
                        </p>
                        {deleteError && (
                            <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                                {deleteError}
                            </div>
                        )}
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setDeletingProduct(null)}
                                disabled={deleting}
                                className="h-11 rounded-xl border border-border px-5 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleConfirmDelete()}
                                disabled={deleting}
                                className="h-11 rounded-xl bg-red-600 px-6 text-xs font-black uppercase tracking-widest text-white hover:bg-red-500 disabled:opacity-50"
                            >
                                {deleting ? 'Procesando…' : deletingProduct.hasHistory ? 'Archivar' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {kardexProduct && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="kardex-modal-title"
                >
                    <div className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border px-6 py-5">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
                                    Kardex del artículo · SKU: {kardexProduct.sku}
                                </p>
                                <h2 id="kardex-modal-title" className="text-xl font-black text-foreground">
                                    {kardexProduct.name}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={closeKardexModal}
                                className="h-9 w-9 rounded-xl border border-border text-muted-foreground hover:text-foreground inline-flex items-center justify-center"
                                aria-label="Cerrar kardex"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6 space-y-5">
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <div className="rounded-xl border border-border bg-background p-3.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Existencia</p>
                                    <p className="mt-1 text-xl font-black text-foreground">{kardexProduct.stockOnHand}</p>
                                </div>
                                <div className="rounded-xl border border-border bg-background p-3.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reservadas</p>
                                    <p className="mt-1 text-xl font-black text-muted-foreground">{kardexProduct.reservedQuantity}</p>
                                </div>
                                <div className="rounded-xl border border-border bg-background p-3.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Disponible</p>
                                    <p className="mt-1 text-xl font-black text-foreground">
                                        {Math.max(0, kardexProduct.stockOnHand - kardexProduct.reservedQuantity)}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-border bg-background p-3.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Entradas</p>
                                    <p className="mt-1 text-xl font-black text-emerald-500">
                                        +{kardexData?.summary.totalIn ?? 0}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-border bg-background p-3.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Salidas / Ajustes</p>
                                    <p className="mt-1 text-xl font-black text-foreground">
                                        <span className="text-red-500">-{kardexData?.summary.totalOut ?? 0}</span>
                                        <span className="mx-1.5 text-muted-foreground text-sm">/</span>
                                        <span className="text-amber-500">
                                            {(kardexData?.summary.netAdjustments ?? 0) >= 0 ? '+' : ''}
                                            {kardexData?.summary.netAdjustments ?? 0}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    {(
                                        [
                                            { id: 'ALL', label: 'Todos' },
                                            { id: 'ENTRIES', label: 'Entradas' },
                                            { id: 'EXIT', label: 'Salidas' },
                                            { id: 'ADJUSTMENT', label: 'Ajustes' },
                                        ] as const
                                    ).map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setKardexFilter(tab.id)}
                                            className={`h-9 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition-all ${
                                                kardexFilter === tab.id
                                                    ? 'border-red-500 bg-red-500/10 text-red-500'
                                                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setMovementError('');
                                        setShowMovementForm((open) => !open);
                                    }}
                                    className="h-10 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 text-xs font-black uppercase tracking-widest text-background shadow-md active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                                        {showMovementForm ? 'close' : 'swap_vert'}
                                    </span>
                                    <span>{showMovementForm ? 'Cerrar captura' : 'Registrar movimiento'}</span>
                                </button>
                            </div>

                            {showMovementForm && (
                                <form
                                    onSubmit={handleRecordMovement}
                                    className="rounded-xl border border-border bg-muted/20 p-4 space-y-4"
                                >
                                    {movementError && (
                                        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                                            {movementError}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                        <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            <span>Tipo *</span>
                                            <select
                                                value={movementForm.type}
                                                onChange={(e) => {
                                                    const nextType = e.target.value as 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
                                                    setMovementForm((c) => ({
                                                        ...c,
                                                        type: nextType,
                                                        unitCost:
                                                            nextType === 'ENTRY' &&
                                                            !c.unitCost &&
                                                            kardexProduct?.unitCost !== null &&
                                                            kardexProduct?.unitCost !== undefined
                                                                ? String(kardexProduct.unitCost)
                                                                : c.unitCost,
                                                    }));
                                                }}
                                                className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-red-500 focus:outline-none"
                                            >
                                                <option value="ENTRY">Entrada</option>
                                                <option value="EXIT">Salida</option>
                                                <option value="ADJUSTMENT">Ajuste</option>
                                            </select>
                                        </label>

                                        {movementForm.type === 'ADJUSTMENT' && (
                                            <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                <span>Sentido *</span>
                                                <select
                                                    value={movementForm.direction}
                                                    onChange={(e) =>
                                                        setMovementForm((c) => ({
                                                            ...c,
                                                            direction: e.target.value as 'ADD' | 'SUBTRACT',
                                                        }))
                                                    }
                                                    className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-red-500 focus:outline-none"
                                                >
                                                    <option value="ADD">+ Aumentar</option>
                                                    <option value="SUBTRACT">- Disminuir</option>
                                                </select>
                                            </label>
                                        )}

                                        <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            <span>Cantidad *</span>
                                            <input
                                                required
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={movementForm.quantity}
                                                onChange={(e) => setMovementForm((c) => ({ ...c, quantity: e.target.value }))}
                                                className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-red-500 focus:outline-none"
                                            />
                                        </label>

                                        {movementForm.type === 'ENTRY' && (
                                            <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                <span>Costo unitario</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={movementForm.unitCost}
                                                    onChange={(e) => setMovementForm((c) => ({ ...c, unitCost: e.target.value }))}
                                                    placeholder="Opcional"
                                                    className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-red-500 focus:outline-none"
                                                />
                                            </label>
                                        )}

                                        <label
                                            className={`flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground ${
                                                movementForm.type === 'EXIT' ? 'sm:col-span-2' : 'sm:col-span-4'
                                            }`}
                                        >
                                            <span>Motivo / Comentarios</span>
                                            <input
                                                maxLength={500}
                                                value={movementForm.comments}
                                                onChange={(e) => setMovementForm((c) => ({ ...c, comments: e.target.value }))}
                                                placeholder="Ej. Conteo físico, reposición, exhibición, merma..."
                                                className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-red-500 focus:outline-none"
                                            />
                                        </label>
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={movementSaving}
                                            className="h-10 rounded-xl bg-red-600 px-5 text-xs font-black uppercase tracking-widest text-white hover:bg-red-500 disabled:opacity-50"
                                        >
                                            {movementSaving ? 'Guardando…' : 'Guardar movimiento'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {kardexError && (
                                <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                                    {kardexError}
                                </div>
                            )}

                            <div className="overflow-x-auto rounded-xl border border-border bg-background">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-muted/50 border-b border-border text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">
                                            <th className="px-4 py-3.5">Fecha</th>
                                            <th className="px-4 py-3.5">Tipo</th>
                                            <th className="px-4 py-3.5 text-center">Movimiento</th>
                                            <th className="px-4 py-3.5 text-center">Saldo</th>
                                            <th className="px-4 py-3.5">Detalle</th>
                                            <th className="px-4 py-3.5">Responsable</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {kardexLoading && (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                                                    Cargando movimientos…
                                                </td>
                                            </tr>
                                        )}
                                        {!kardexLoading &&
                                            !kardexError &&
                                            visibleMovements.map((movement) => {
                                                const info = MOVEMENT_META[movement.type];
                                                const isPositive = movement.quantityDelta > 0;
                                                return (
                                                    <tr key={movement.id} className="hover:bg-muted/20">
                                                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                            {formatDateTime(movement.createdAt)}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span
                                                                className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest border ${info.className}`}
                                                            >
                                                                {info.label}
                                                            </span>
                                                        </td>
                                                        <td
                                                            className={`px-4 py-3 text-center font-black ${
                                                                isPositive ? 'text-emerald-500' : 'text-red-500'
                                                            }`}
                                                        >
                                                            {isPositive ? `+${movement.quantityDelta}` : movement.quantityDelta}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-foreground">
                                                            {movement.balanceAfter ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-foreground">
                                                            <p>{movement.comments || 'Sin comentarios'}</p>
                                                            {(movement.supplierName || movement.unitCost !== null || movement.saleId) && (
                                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                                    {movement.supplierName && `Proveedor: ${movement.supplierName}`}
                                                                    {movement.supplierName && movement.unitCost !== null && ' · '}
                                                                    {movement.unitCost !== null &&
                                                                        `Costo unit.: ${money(movement.unitCost, movement.currency)}`}
                                                                    {movement.saleId && `Venta: ${movement.saleId.slice(0, 8)}`}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                            {movement.createdByName || 'Sistema'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        {!kardexLoading && !kardexError && visibleMovements.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                                                    No hay movimientos registrados para este filtro.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SummaryStat: React.FC<{ label: string; value: string; badge?: string }> = ({ label, value, badge }) => (
    <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col gap-2">
        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
        <div className="flex items-center gap-3">
            <p className="text-foreground text-2xl font-black tracking-tighter">{value}</p>
            {badge && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border text-red-500 bg-red-500/10 border-red-500/20">
                    {badge}
                </span>
            )}
        </div>
    </div>
);

export default InventoryPage;
