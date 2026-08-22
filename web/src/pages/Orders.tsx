import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { OrdersService } from '../services/orders.service';
import { ClientsService } from '../services/clients.service';
import AutocompleteInput from '../components/AutocompleteInput';
import { useTheme } from '../context/ThemeContext';

import { OrdersTable } from '../components/orders/OrdersTable';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { LabelPrintModal } from '../components/orders/LabelPrintModal';

// --- Interfaces for View ---
export interface Order {
    id: string;
    clientId: string;
    client?: { name: string };
    pieceType: string;
    value: string;
    cost: string;
    margin: string;
    stage: string;
    priority: string;
    paymentStatus: string;
    // ... mapped fields
}

type OrderMock = Order;

interface Column {
    id: string;
    name: string;
    color: string;
    focus?: boolean;
}

const STANDARD_COLUMNS: Column[] = [
    { id: 'INTERES_LEAD', name: 'Interés / Lead', color: 'bg-zinc-500' },
    { id: 'COTIZACION_ENVIADA', name: 'Cotización Enviada', color: 'bg-indigo-400' },
    { id: 'APROBADO_ANTICIPO', name: 'Aprobado / Anticipo', color: 'bg-emerald-400' },
    { id: 'EN_PRODUCCION', name: 'En Producción', color: 'bg-white', focus: true },
    { id: 'CONTROL_CALIDAD', name: 'Control de Calidad', color: 'bg-purple-400' },
];

const REPAIR_COLUMNS: Column[] = [
    { id: 'RECEIVED', name: 'Recibido', color: 'bg-zinc-500' },
    { id: 'IN_REPAIR', name: 'En Taller', color: 'bg-white', focus: true },
    { id: 'REPAIR_COMPLETED', name: 'Listo', color: 'bg-emerald-400' },
];

const MANUFACTURE_COLUMNS: Column[] = [
    { id: 'SPEC_PENDING', name: 'Specs/Diseño', color: 'bg-zinc-500' },
    { id: 'MATERIALS_PENDING', name: 'Materiales', color: 'bg-amber-400' },
    { id: 'IN_PRODUCTION', name: 'Producción', color: 'bg-white', focus: true },
    { id: 'QUALITY_CHECK', name: 'Control Calidad', color: 'bg-purple-400' },
    { id: 'READY_FOR_PICKUP', name: 'Listo', color: 'bg-emerald-400' },
];

const LAYAWAY_COLUMNS: Column[] = [
    { id: 'LAYAWAY_OPEN', name: 'Apartado Abierto', color: 'bg-indigo-400' },
    { id: 'LAYAWAY_EXPIRED', name: 'Apartado Vencido', color: 'bg-red-500' },
];

export const getStatusLabel = (stage: string) => {
    const allCols = [...STANDARD_COLUMNS, ...REPAIR_COLUMNS, ...MANUFACTURE_COLUMNS, ...LAYAWAY_COLUMNS];
    const col = allCols.find(c => c.id === stage);
    return col ? col.name : stage;
};

const Orders: React.FC = () => {
    const { variant } = useTheme();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const orderType = queryParams.get('type');

    const boardColumns = orderType === 'REPAIR' ? REPAIR_COLUMNS :
        orderType === 'MANUFACTURE' ? MANUFACTURE_COLUMNS :
            orderType === 'LAYAWAY' ? LAYAWAY_COLUMNS :
                STANDARD_COLUMNS;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'kanban' | 'table'>('table');
    const [orders, setOrders] = useState<any[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [labelPrintOrder, setLabelPrintOrder] = useState<any | null>(null);
    const [isLabelPrintOpen, setIsLabelPrintOpen] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const fetchBoard = async () => {
        try {
            setIsLoading(true);
            const data = await OrdersService.getBoard(orderType || undefined);
            // Flatten board data from {STAGE: [orders]} to [orders] with mapped props for UI
            const flattenOrders: any[] = [];
            Object.keys(data).forEach(stage => {
                data[stage].forEach((o: any) => {
                    flattenOrders.push({
                        ...o,
                        // Mapping DB fields to UI expectation
                        client: o.client?.name || 'Cliente',
                        item: o.pieceType,
                        value: `$${Number(o.value).toLocaleString()} MXN`,
                        status: stage, // keep raw stage for logic, map for display
                        statusLabel: getStatusLabel(stage),
                        initials: o.client?.name?.substring(0, 2).toUpperCase() || 'NC',
                        initialsColor: 'bg-muted text-muted-foreground border border-border',
                        // ... map other fields if needed
                        statusType: stage === 'INTERES_LEAD' ? 'new' :
                            stage === 'EN_PRODUCCION' ? 'urgent' :
                                stage === 'APROBADO_ANTICIPO' ? 'success' : 'normal',
                        receivedDate: o.createdAt ? new Date(o.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
                        receivedTime: o.createdAt ? new Date(o.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''
                    });
                });
            });
            setOrders(flattenOrders);
        } catch (error) {
            console.error("Error fetching board:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const data = await ClientsService.getAll();
            setClients(data);
        } catch (error) {
            console.error(error);
        }
    }

    useEffect(() => {
        fetchBoard();
        fetchClients();
    }, [orderType]);

    const handleCreateOrder = async (newOrder: any) => {
        try {
            // Find or create client using UPPERCASE
            const clientNameUpper = newOrder.client.toUpperCase().trim();
            let selectedClient = clients.find(c => c.name.toLowerCase().trim() === clientNameUpper.toLowerCase().trim());

            if (!selectedClient) {
                try {
                    // Create new client first with name in UPPERCASE
                    selectedClient = await ClientsService.create({
                        name: clientNameUpper,
                        phone: newOrder.newClientPhone?.trim() || undefined,
                        email: newOrder.newClientEmail?.trim() || undefined
                    });
                    
                    // Refresh local clients list
                    await fetchClients();
                } catch (clientError) {
                    console.error("Auto client creation failed", clientError);
                    alert("Error al registrar automáticamente el nuevo cliente.");
                    return;
                }
            }

            const cleanNumber = (val: any) => {
                const str = String(val || '0').replace(/[^0-9.-]/g, '');
                return parseFloat(str) || 0;
            };

            // Map all pieces in specifications to UPPERCASE
            const uppercaseItems = (newOrder.specifications?.items || []).map((item: any) => ({
                item: (item.item || '').toUpperCase().trim(),
                metal: (item.metal || '').toUpperCase().trim(),
                color: (item.color || '').toUpperCase().trim(),
                karats: (item.karats || '').toUpperCase().trim(),
                weight: (item.weight || '').toUpperCase().trim(),
                size: (item.size || '').toUpperCase().trim(),
                thickness: (item.thickness || '').toUpperCase().trim(),
                itemCode: (item.itemCode || '').toUpperCase().trim(),
                notes: (item.notes || '').toUpperCase().trim()
            }));

            const firstItem = uppercaseItems[0] || {};

            const payload = {
                pieceType: firstItem.item || '',
                value: cleanNumber(newOrder.value),
                cost: cleanNumber(newOrder.cost),
                totalAmount: cleanNumber(newOrder.value),
                margin: 0,
                priority: newOrder.priority === 'Alta' ? 'ALTA' : 'MEDIA',
                clientId: selectedClient.id,
                stage: 'INTERES_LEAD',
                type: (orderType || 'STANDARD').toUpperCase() as any,
                // New Fields in UPPERCASE
                metal: firstItem.metal || '',
                color: firstItem.color || '',
                karats: firstItem.karats || '',
                weight: firstItem.weight || '',
                size: firstItem.size || '',
                thickness: firstItem.thickness || '',
                itemCode: firstItem.itemCode || '',
                laborCost: cleanNumber(newOrder.laborCost),
                materialCost: cleanNumber(newOrder.materialCost),
                notes: firstItem.notes || '',
                specifications: { items: uppercaseItems }
            };

            const created = await OrdersService.create(payload);
            fetchBoard();
            setIsModalOpen(false);

            if (newOrder.shouldPrintLabel) {
                setLabelPrintOrder(created);
                setIsLabelPrintOpen(true);
            }
        } catch (error) {
            console.error("Create order error", error);
            alert("Error al crear el pedido. Verifica que los datos sean correctos.");
        }
    };

    const handleDeleteOrder = async (id: string) => {
        try {
            await OrdersService.deleteOrder(id);
            alert("Pedido eliminado exitosamente.");
            fetchBoard();
        } catch (error) {
            console.error(error);
            alert("Error al eliminar el pedido.");
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            return;
        }

        const activeOrder = orders.find(o => o.id === active.id);
        const overId = over.id as string;

        let targetStage = '';

        // Check if dropped on a column
        if (boardColumns.some(col => col.id === overId)) {
            targetStage = overId;
        }
        // Or dropped on another card
        else {
            const overOrder = orders.find(o => o.id === overId);
            if (overOrder) {
                targetStage = overOrder.stage; // Assuming overOrder kept the raw stage property
            }
        }

        if (targetStage && activeOrder && activeOrder.stage !== targetStage) {
            // Optimistic Update
            setOrders(prev => prev.map(o => o.id === activeOrder.id ? { ...o, stage: targetStage, status: targetStage, statusLabel: getStatusLabel(targetStage) } : o));

            try {
                await OrdersService.moveOrder(activeOrder.id, targetStage);
            } catch (error) {
                console.error("Move failed", error);
                fetchBoard(); // Revert
            }
        }

        setActiveId(null);
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<string | null>(null);

    // Apply search and filters
    const filteredOrders = React.useMemo(() => {
        let result = orders;

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(o =>
                (o.client && String(o.client).toLowerCase().includes(q)) ||
                (o.id && o.id.toLowerCase().includes(q)) ||
                (o.item && String(o.item).toLowerCase().includes(q)) ||
                (o.pieceType && String(o.pieceType).toLowerCase().includes(q))
            );
        }

        // Active filter
        if (activeFilter) {
            if (activeFilter === 'Esta Semana') {
                const now = new Date();
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                result = result.filter(o => {
                    if (!o.createdAt) return false;
                    return new Date(o.createdAt) >= startOfWeek;
                });
            } else if (activeFilter === 'Prioridad Alta') {
                result = result.filter(o =>
                    o.priority === 'ALTA' || o.priority === 'Alta' || o.priority === 'alta'
                );
            } else {
                // Filter by piece type (e.g. 'Anillos' matches 'Anillo', 'anillo', etc.)
                const filterLower = activeFilter.toLowerCase();
                result = result.filter(o => {
                    const piece = (o.item || o.pieceType || '').toLowerCase();
                    return piece.includes(filterLower) || filterLower.includes(piece);
                });
            }
        }

        return result;
    }, [orders, searchQuery, activeFilter]);

    // Dynamic piece type filters from actual data
    const pieceTypeFilters = React.useMemo(() => {
        const types = new Map<string, number>();
        orders.forEach(o => {
            const t = (o.item || o.pieceType || '').trim();
            if (t) {
                const key = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
                types.set(key, (types.get(key) || 0) + 1);
            }
        });
        return Array.from(types.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name]) => name);
    }, [orders]);

    const filterButtons = ['Esta Semana', 'Prioridad Alta', ...pieceTypeFilters];

    const getOrdersByStatus = (columnId: string) => {
        return filteredOrders.filter(o => o.status === columnId);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <header className="shrink-0 z-10 mb-8 px-2">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-foreground text-3xl font-black tracking-tight font-display transition-colors">Tablero de Pedidos (MXN)</h2>
                            <p className="text-muted-foreground text-sm transition-colors">Gestión visual del flujo de producción y ventas</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex bg-muted p-1 rounded-2xl border border-border transition-colors">
                                <button
                                    onClick={() => setViewMode('kanban')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'kanban' ? 'bg-card text-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">view_kanban</span>
                                    <span>Kanban</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-card text-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">view_list</span>
                                    <span>Notion</span>
                                </button>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                <span>Nuevo Pedido</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="relative w-full max-w-md group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined text-muted-foreground group-focus-within:text-foreground transition-colors">search</span>
                            </div>
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-border rounded-xl bg-muted/50 text-foreground placeholder-muted-foreground focus:border-indigo-500 outline-none text-sm transition-all shadow-sm"
                                placeholder="Buscar por cliente, ID de pedido o pieza..."
                                type="text"
                            />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {filterButtons.map(f => (
                                <button
                                    key={f}
                                    onClick={() => setActiveFilter(activeFilter === f ? null : f)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border shadow-sm whitespace-nowrap ${activeFilter === f
                                        ? 'bg-foreground text-background border-border shadow-md'
                                        : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80 hover:text-foreground'
                                        }`}
                                >
                                    <span>{f}</span>
                                    {activeFilter === f ? (
                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
                                    )}
                                </button>
                            ))}
                            {(activeFilter || searchQuery) && (
                                <button
                                    onClick={() => { setActiveFilter(null); setSearchQuery(''); }}
                                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all whitespace-nowrap"
                                >
                                    <span className="material-symbols-outlined text-[16px]">filter_list_off</span>
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {viewMode === 'kanban' ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <main className="flex-1 overflow-x-auto pb-6 scroll-smooth px-2">
                        <div className="flex h-full gap-8 min-w-max">
                            {boardColumns.map(col => (
                                <KanbanColumn
                                    key={col.id}
                                    id={col.id}
                                    name={col.name}
                                    color={col.color}
                                    count={getOrdersByStatus(col.id).length}
                                    focus={col.focus}
                                    orders={getOrdersByStatus(col.id)}
                                    onDelete={handleDeleteOrder}
                                />
                            ))}
                        </div>
                    </main>
                    <DragOverlay>
                        {activeId ? (
                            <div className="transform rotate-3 scale-105 cursor-grabbing">
                                {/* Quick find for overlay */}
                                <KanbanCard {...orders.find(o => o.id === activeId)} isOverlay />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            ) : (
                <main className="flex-1 overflow-y-auto pb-10 custom-scrollbar">
                    <OrdersTable orders={filteredOrders} onOrderDeleted={fetchBoard} />
                </main>
            )}

            <AnimatePresence>
                {isModalOpen && (
                    <NewOrderDrawer
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleCreateOrder}
                        clients={clients}
                        clientOptions={clients.map(c => c.name)}
                        onClientCreated={fetchClients}
                    />
                )}
            </AnimatePresence>

            <LabelPrintModal
                isOpen={isLabelPrintOpen}
                onClose={() => {
                    setIsLabelPrintOpen(false);
                    setLabelPrintOrder(null);
                }}
                order={labelPrintOrder}
            />
        </div>
    );
};

const NewOrderDrawer: React.FC<{
    onClose: () => void;
    onSave: (order: any) => void;
    clients: any[];
    clientOptions: string[];
    onClientCreated?: () => Promise<void> | void;
}> = ({ onClose, onSave, clients, clientOptions, onClientCreated }) => {
    const [showQuickAddClient, setShowQuickAddClient] = useState(false);
    const [newClientData, setNewClientData] = useState({ name: '', phone: '', email: '' });
    const [searchMode, setSearchMode] = useState<'name' | 'phone'>('name');
    const [selectedClientInfo, setSelectedClientInfo] = useState<any>(null);
    const [phoneSearchValue, setPhoneSearchValue] = useState('');
    const [shouldPrintLabel, setShouldPrintLabel] = useState(false);

    const [formData, setFormData] = useState<any>({
        client: '',
        value: '',
        cost: '',
        priority: 'Media',
    });

    const [items, setItems] = useState<any[]>([
        { item: '', metal: 'Oro', color: 'Amarillo', karats: '10 K', weight: '', size: '', thickness: '', itemCode: '', notes: '' }
    ]);

    const handleItemChange = (index: number, field: string, value: string) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { item: '', metal: 'Oro', color: 'Amarillo', karats: '10 K', weight: '', size: '', thickness: '', itemCode: '', notes: '' }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleQuickAddClient = async () => {
        if (!newClientData.name.trim()) {
            alert("El nombre del cliente es obligatorio.");
            return;
        }
        try {
            const created = await ClientsService.create({
                name: newClientData.name.trim(),
                phone: newClientData.phone.trim() || undefined,
                email: newClientData.email.trim() || undefined
            });
            
            if (onClientCreated) {
                await onClientCreated();
            }
            
            // Auto-select the client and show info
            setFormData(prev => ({ ...prev, client: created.name }));
            setSelectedClientInfo(created);
            // Reset state
            setNewClientData({ name: '', phone: '', email: '' });
            setShowQuickAddClient(false);
        } catch (error) {
            console.error("Failed to quick create client:", error);
            alert("Error al registrar el cliente. Inténtalo de nuevo.");
        }
    };

    // Derive options based on search mode
    const phoneOptions = clients.map(c => c.phone).filter(Boolean) as string[];
    const activeOptions = searchMode === 'phone' ? phoneOptions : clientOptions;
    const activeIcon = searchMode === 'phone' ? 'call' : 'person';
    const activePlaceholder = searchMode === 'phone' ? 'Buscar por teléfono...' : 'Buscar o crear cliente...';

    const handleClientSelect = (val: string) => {
        // If searching by phone, resolve client name from phone
        if (searchMode === 'phone') {
            setPhoneSearchValue(val);
            const found = clients.find(c => c.phone && c.phone.replace(/\s/g, '') === val.replace(/\s/g, ''));
            if (found) {
                setFormData(prev => ({ ...prev, client: found.name }));
                setSelectedClientInfo(found);
            } else {
                // Don't pollute formData.client with phone digits
                setSelectedClientInfo(null);
            }
            return;
        }
        setFormData(prev => ({ ...prev, client: val }));
        // If name matches exactly, show info
        const found = clients.find(c => c.name.toLowerCase().trim() === val.toLowerCase().trim());
        setSelectedClientInfo(found || null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.client?.trim()) {
            alert("El nombre del cliente es obligatorio para registrar el pedido.");
            return;
        }

        // Strict validation: Ensure all required fields for each item are filled
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.item?.trim()) {
                alert(`Por favor, introduce el nombre de la pieza #${i + 1}.`);
                return;
            }
            if (!item.metal) {
                alert(`Por favor, selecciona el metal para la pieza #${i + 1}.`);
                return;
            }
            if (!item.color) {
                alert(`Por favor, selecciona el color para la pieza #${i + 1}.`);
                return;
            }
            if (!item.karats) {
                alert(`Por favor, selecciona los quilates para la pieza #${i + 1}.`);
                return;
            }
            if (!item.weight?.trim()) {
                alert(`Por favor, introduce el peso para la pieza #${i + 1}.`);
                return;
            }
            if (!item.size?.trim()) {
                alert(`Por favor, introduce la medida para la pieza #${i + 1}.`);
                return;
            }
            if (!item.thickness?.trim()) {
                alert(`Por favor, introduce el grosor para la pieza #${i + 1}.`);
                return;
            }
        }

        // Sync first item to top-level fields for backward compatibility
        const mainItem = items[0] || {};
        const submissionData = {
            ...formData,
            ...mainItem,
            pieceType: mainItem.item,
            notes: mainItem.notes || '', // Map first item notes to top-level order notes
            specifications: { items },
            shouldPrintLabel: shouldPrintLabel // Flag to open print label preview
        };

        onSave(submissionData);
    };

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 z-[70] w-full max-w-lg bg-background border-l border-border shadow-2xl flex flex-col"
            >
                {/* Header */}
                <div className="p-8 border-b border-border bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                        <div className="size-10 rounded-xl bg-foreground text-background flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined">add_shopping_cart</span>
                        </div>
                        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div>
                        <h2 className="text-foreground text-xl font-black uppercase tracking-widest font-display">Nuevo Pedido</h2>
                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1.5">Registro Técnico de Joyería</p>
                    </div>
                </div>

                {/* Form Body */}
                <form id="new-order-form" className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar" onSubmit={handleSubmit}>
                    {/* Section: Cliente */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-foreground text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                                <span className="size-1.5 rounded-full bg-indigo-500"></span>
                                Información del Cliente
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowQuickAddClient(prev => !prev);
                                    if (!showQuickAddClient) {
                                        setNewClientData(prev => ({ ...prev, name: formData.client || '' }));
                                    }
                                }}
                                className="flex items-center gap-1.5 text-indigo-500 hover:text-foreground transition-colors text-[9px] font-black uppercase tracking-widest"
                                title="Agregar nuevo cliente directamente"
                            >
                                <span className="material-symbols-outlined text-[14px]">
                                    {showQuickAddClient ? 'close' : 'person_add'}
                                </span>
                                <span>{showQuickAddClient ? 'Cancelar' : 'Nuevo Cliente'}</span>
                            </button>
                        </div>

                        {/* Search Mode Toggle */}
                        {!showQuickAddClient && (
                            <div className="flex bg-muted/50 p-1 rounded-xl border border-border w-full">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchMode('name');
                                        setFormData(prev => ({ ...prev, client: '' }));
                                        setSelectedClientInfo(null);
                                        setPhoneSearchValue('');
                                    }}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                        searchMode === 'name'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[14px]">person</span>
                                    Nombre
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchMode('phone');
                                        setFormData(prev => ({ ...prev, client: '' }));
                                        setSelectedClientInfo(null);
                                        setPhoneSearchValue('');
                                    }}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                        searchMode === 'phone'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[14px]">call</span>
                                    Teléfono
                                </button>
                            </div>
                        )}

                        {showQuickAddClient ? (
                            <div className="p-5 rounded-2xl bg-muted/60 backdrop-blur-md border border-indigo-500/30 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between pb-2 border-b border-border">
                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px]">person_add</span>
                                        Alta Rápida de Cliente
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-wider">Nombre Completo</label>
                                        <input
                                            type="text"
                                            value={newClientData.name}
                                            onChange={(e) => setNewClientData(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Nombre del cliente"
                                            className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:border-indigo-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-muted-foreground text-[9px] font-black uppercase tracking-wider">Teléfono (Opcional)</label>
                                            <input
                                                type="text"
                                                value={newClientData.phone}
                                                onChange={(e) => setNewClientData(prev => ({ ...prev, phone: e.target.value }))}
                                                placeholder="Ej: 33 1234 5678"
                                                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:border-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-muted-foreground text-[9px] font-black uppercase tracking-wider">Correo (Opcional)</label>
                                            <input
                                                type="email"
                                                value={newClientData.email}
                                                onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
                                                placeholder="correo@ejemplo.com"
                                                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:border-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="pt-2 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleQuickAddClient}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">save</span>
                                            Guardar y Seleccionar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <AutocompleteInput
                                    name="client"
                                    value={searchMode === 'phone'
                                        ? (selectedClientInfo ? selectedClientInfo.name : phoneSearchValue)
                                        : (formData.client || '')}
                                    onChange={handleClientSelect}
                                    options={[]}
                                    placeholder={activePlaceholder}
                                    icon={activeIcon}
                                    required
                                />

                                {/* Name Search Results - matching clients with select button */}
                                {searchMode === 'name' && formData.client && !selectedClientInfo && (() => {
                                    const matchingClients = clients.filter(c =>
                                        c.name && c.name.toLowerCase().includes(formData.client.toLowerCase())
                                    ).slice(0, 5);

                                    if (matchingClients.length === 0) return null;

                                    // If there is an exact name match already selected, don't show the suggestions
                                    const exactMatch = matchingClients.find(c => c.name.toLowerCase().trim() === formData.client.toLowerCase().trim());
                                    if (exactMatch && selectedClientInfo?.id === exactMatch.id) return null;

                                    return (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest px-1">
                                                {matchingClients.length} cliente{matchingClients.length > 1 ? 's' : ''} encontrado{matchingClients.length > 1 ? 's' : ''}
                                            </p>
                                            {matchingClients.map(client => (
                                                <div
                                                    key={client.id}
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border hover:border-indigo-500/40 transition-all group/result"
                                                >
                                                    <div className="size-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-black text-xs shrink-0">
                                                        {client.name?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-foreground font-bold truncate">{client.name}</p>
                                                        {client.phone && (
                                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[12px]">call</span>
                                                                {client.phone}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => ({ ...prev, client: client.name }));
                                                            setSelectedClientInfo(client);
                                                        }}
                                                        className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                        Seleccionar
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}

                                {/* Phone Search Results - matching clients with select button */}
                                {searchMode === 'phone' && phoneSearchValue && !selectedClientInfo && (() => {
                                    const matchingClients = clients.filter(c =>
                                        c.phone && c.phone.replace(/\s/g, '').includes(phoneSearchValue.replace(/\s/g, ''))
                                    ).slice(0, 5);

                                    if (matchingClients.length === 0) return null;

                                    return (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest px-1">
                                                {matchingClients.length} cliente{matchingClients.length > 1 ? 's' : ''} encontrado{matchingClients.length > 1 ? 's' : ''}
                                            </p>
                                            {matchingClients.map(client => (
                                                <div
                                                    key={client.id}
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border hover:border-indigo-500/40 transition-all group/result"
                                                >
                                                    <div className="size-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-black text-xs shrink-0">
                                                        {client.name?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-foreground font-bold truncate">{client.name}</p>
                                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[12px]">call</span>
                                                            {client.phone}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => ({ ...prev, client: client.name }));
                                                            setSelectedClientInfo(client);
                                                            setPhoneSearchValue(client.phone);
                                                        }}
                                                        className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                        Seleccionar
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}

                                {/* Selected Client Info Card */}
                                {selectedClientInfo && (
                                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex items-center gap-3">
                                            <div className="size-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
                                                {selectedClientInfo.name?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-foreground font-bold truncate">{selectedClientInfo.name}</p>
                                                <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Cliente encontrado</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedClientInfo(null);
                                                    setFormData(prev => ({ ...prev, client: '' }));
                                                    setPhoneSearchValue('');
                                                }}
                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-emerald-500/10">
                                            {selectedClientInfo.phone && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[14px] text-muted-foreground">call</span>
                                                    <span className="text-xs text-foreground">{selectedClientInfo.phone}</span>
                                                </div>
                                            )}
                                            {selectedClientInfo.email && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[14px] text-muted-foreground">mail</span>
                                                    <span className="text-xs text-foreground truncate">{selectedClientInfo.email}</span>
                                                </div>
                                            )}
                                            {!selectedClientInfo.phone && !selectedClientInfo.email && (
                                                <p className="col-span-2 text-[10px] text-muted-foreground">Sin información de contacto registrada</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {searchMode === 'name' && formData.client && !clientOptions.some(opt => opt.toLowerCase().trim() === formData.client.toLowerCase().trim()) && !selectedClientInfo && (
                                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <p className="text-xs text-indigo-400 font-bold flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[16px]">person_add</span>
                                            Crear nuevo cliente al guardar pedido: "{formData.client}"
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-wider">Teléfono (Opcional)</label>
                                                <input
                                                    type="text"
                                                    name="newClientPhone"
                                                    value={formData.newClientPhone || ''}
                                                    onChange={handleChange}
                                                    placeholder="Ej: 33 1234 5678"
                                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:border-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-wider">Correo (Opcional)</label>
                                                <input
                                                    type="email"
                                                    name="newClientEmail"
                                                    value={formData.newClientEmail || ''}
                                                    onChange={handleChange}
                                                    placeholder="correo@ejemplo.com"
                                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:border-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Section: Piezas */}
                    <div className="space-y-8 border-t border-border pt-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-foreground text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                                <span className="size-1.5 rounded-full bg-amber-500"></span>
                                Ficha Técnica (Piezas)
                            </h3>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="space-y-6 p-6 rounded-2xl bg-muted/30 border border-border relative group/item">
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="absolute -top-2 -right-2 size-6 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-400/30 transition-all flex items-center justify-center"
                                    >
                                        <span className="material-symbols-outlined text-xs">close</span>
                                    </button>
                                )}
                                <div className="flex flex-col gap-4">
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Pieza #{index + 1}</label>
                                        <input
                                            value={item.item}
                                            onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                                            className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 transition-all outline-none"
                                            placeholder="Anillo, Collar, etc."
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Metal</label>
                                        <select
                                            value={item.metal}
                                            onChange={(e) => handleItemChange(index, 'metal', e.target.value)}
                                            className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 outline-none appearance-none cursor-pointer"
                                            required
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="Oro">Oro</option>
                                            <option value="Plata">Plata</option>
                                            <option value="Platino">Platino</option>
                                            <option value="Otros">Otros</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Color</label>
                                        <select
                                            value={item.color}
                                            onChange={(e) => handleItemChange(index, 'color', e.target.value)}
                                            className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 outline-none appearance-none cursor-pointer"
                                            required
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="Amarillo">Amarillo</option>
                                            <option value="Blanco">Blanco</option>
                                            <option value="Rosa">Rosa</option>
                                            <option value="Otros">Otros</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Quilates</label>
                                        <select
                                            value={item.karats}
                                            onChange={(e) => handleItemChange(index, 'karats', e.target.value)}
                                            className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 outline-none appearance-none cursor-pointer"
                                            required
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="10 K">10 K</option>
                                            <option value="14 K">14 K</option>
                                            <option value="18 K">18 K</option>
                                            <option value="21.6 K">21.6 K</option>
                                            <option value="Otros">Otros</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Peso (Gr)</label>
                                        <input value={item.weight} onChange={(e) => handleItemChange(index, 'weight', e.target.value)} onBlur={() => { if (item.weight && !item.weight.toUpperCase().endsWith('GR')) handleItemChange(index, 'weight', `${item.weight.trim()} GR`); }} className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 outline-none" placeholder="0.00" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Medida</label>
                                        <input value={item.size} onChange={(e) => handleItemChange(index, 'size', e.target.value)} onBlur={() => { if (item.size && !item.size.toUpperCase().endsWith('CM')) handleItemChange(index, 'size', `${item.size.trim()} CM`); }} className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 outline-none" placeholder="7, 18cm" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Grosor</label>
                                        <input value={item.thickness || ''} onChange={(e) => handleItemChange(index, 'thickness', e.target.value)} onBlur={() => { if (item.thickness && !item.thickness.toUpperCase().endsWith('MM')) handleItemChange(index, 'thickness', `${item.thickness.trim()} MM`); }} className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 outline-none" placeholder="2mm" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">SKU / Cód</label>
                                        <input value={item.itemCode} onChange={(e) => handleItemChange(index, 'itemCode', e.target.value)} className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 outline-none" placeholder="ABC-123" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Observaciones / Notas de la Pieza</label>
                                        <textarea
                                            value={item.notes || ''}
                                            onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                                            className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 outline-none min-h-[80px] resize-none"
                                            placeholder="Grabado láser, soldadura láser, etc."
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add Piece Button (Moved below list of pieces) */}
                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-500/50 hover:border-indigo-500 text-indigo-400 hover:text-white transition-all h-12 px-6 text-[10px] font-black uppercase tracking-widest bg-indigo-500/5 hover:bg-indigo-500/10 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-sm">add_circle</span>
                                <span>Agregar Otra Pieza</span>
                            </button>
                        </div>
                    </div>

                    {/* Section: Valores (Moved to End) */}
                    <div className="space-y-6">
                        <h3 className="text-foreground text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2 pt-2 border-t border-border">
                            <span className="size-1.5 rounded-full bg-emerald-500"></span>
                            Finanzas y Prioridad
                        </h3>
                        <div className="flex flex-col gap-4">
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Mano de Obra</label>
                                <input name="value" value={formData.value} onChange={handleChange} className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 transition-all outline-none" placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Material</label>
                                <input name="cost" value={formData.cost} onChange={handleChange} className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 transition-all outline-none" placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Prioridad del Joyero</label>
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange as any}
                                    className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="Baja">Baja</option>
                                    <option value="Media">Media</option>
                                    <option value="Alta">Alta</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="p-8 border-t border-border bg-muted/20 grid grid-cols-3 gap-4">
                    <button type="button" onClick={onClose} className="py-4 rounded-xl text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-foreground transition-all">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setShouldPrintLabel(true);
                            setTimeout(() => {
                                const form = document.getElementById('new-order-form') as HTMLFormElement;
                                form?.requestSubmit();
                            }, 50);
                        }}
                        className="py-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 hover:bg-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-[16px]">print</span>
                        <span>Imprimir Etiqueta</span>
                    </button>
                    <button
                        type="submit"
                        form="new-order-form"
                        onClick={() => setShouldPrintLabel(false)}
                        className="py-4 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:opacity-90 transition-all shadow-xl active:scale-95"
                    >
                        Crear Pedido
                    </button>
                </div>
            </motion.div>
        </>
    );
};

const KanbanColumn: React.FC<{ id: string, name: string, color: string, count: number, focus?: boolean, orders: OrderMock[], onDelete?: (id: string) => void }> = ({ id, name, color, count, focus, orders, onDelete }) => {
    const { setNodeRef } = useSortable({
        id: id,
        data: {
            type: 'Column',
        }
    });

    return (
        <div ref={setNodeRef} className={`flex flex-col w-[320px] h-full ${focus ? 'bg-muted/30 rounded-2xl border border-dashed border-border p-2' : ''}`}>
            <div className={`flex items-center justify-between mb-6 px-2 ${focus ? 'mt-2' : ''}`}>
                <div className="flex items-center gap-3">
                    <span className={`size-2 rounded-full ${color}`}></span>
                    <h3 className={`font-bold text-sm tracking-tight ${focus ? 'text-foreground underline underline-offset-8 decoration-border' : 'text-muted-foreground'}`}>{name}</h3>
                    <span className="text-muted-foreground text-[10px] ml-1 font-bold bg-muted px-2 py-0.5 rounded-full border border-border tracking-widest">{count}</span>
                </div>
                <button className="text-muted-foreground hover:text-foreground transition-colors"><span className="material-symbols-outlined text-[20px]">add</span></button>
            </div>

            <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 no-scrollbar">
                    {orders.map(order => (
                        <SortableKanbanCard key={order.id} order={order} isBig={id === 'production'} onDelete={onDelete} />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
};

const SortableKanbanCard: React.FC<{ order: OrderMock, isBig?: boolean, onDelete?: (id: string) => void }> = ({ order, isBig, onDelete }) => {
    const navigate = useNavigate();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: order.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isSystemAdmin = user.role === 'SYSTEM_ADMIN';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative group/sortable"
        >
            <div
                {...attributes}
                {...listeners}
                onClick={() => navigate(`/orders/${order.id}`)}
            >
                <KanbanCard {...order} isBig={isBig} />
            </div>

            {isSystemAdmin && onDelete && (
                <button
                    onMouseDown={(e) => {
                        e.stopPropagation();
                    }}
                    onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (window.confirm("¿Seguro que deseas eliminar permanentemente este pedido? Esta acción no se puede deshacer y borrará todos los pagos asociados.")) {
                            onDelete(order.id);
                        }
                    }}
                    className="absolute top-3 right-3 size-7 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white flex items-center justify-center border border-red-500/20 opacity-0 group-hover/sortable:opacity-100 transition-all active:scale-95 z-20 shadow-md"
                    title="Eliminar Pedido"
                >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
            )}
        </div>
    );
};

const KanbanCard: React.FC<OrderMock & { isBig?: boolean, isOverlay?: boolean, statusLabel?: string }> = ({ id, client, item, value, status, statusLabel, statusType, initials, initialsColor, avatar, progress, isPaid, isBig, isOverlay, receivedDate, receivedTime }) => (
    <div
        className={`group flex flex-col gap-4 rounded-2xl bg-card p-5 border border-border hover:border-indigo-500/50 transition-all cursor-pointer active:cursor-grabbing relative hover:-translate-y-1 shadow-sm backdrop-blur-sm ${isBig ? 'border-l-4 border-l-foreground ring-1 ring-border' : ''} ${isOverlay ? 'bg-card border-border shadow-2xl skew-y-2 opacity-90' : ''}`}
    >
        <div className="flex justify-between items-start pointer-events-none relative z-10">
            <div className="flex items-center gap-3">
                {avatar ? (
                    <img src={avatar} alt={client} className="size-8 rounded-full pointer-events-none grayscale opacity-80" />
                ) : (
                    <div className={`size-8 rounded-full flex items-center justify-center text-[10px] font-black ${initialsColor}`}>{initials}</div>
                )}
                <div>
                    <h4 className="text-foreground text-xs font-bold leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{client}</h4>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-0.5">#{id.substring(0, 8)}</p>
                </div>
            </div>
            {isPaid && (
                <span className="material-symbols-outlined text-emerald-500 text-[16px]" title="Pagado">verified</span>
            )}
        </div>
        <div className="space-y-1 pointer-events-none relative z-10">
            <p className="text-muted-foreground text-sm font-medium leading-tight">{item}</p>
            <p className="text-foreground font-black tracking-tight">{value}</p>
        </div>

        <div className="flex items-center gap-2 py-1 pointer-events-none relative z-10">
            <span className="material-symbols-outlined text-muted-foreground text-[14px]">history</span>
            <span className="text-muted-foreground text-[9px] font-black uppercase tracking-widest">{receivedDate} <span className="text-muted-foreground/50 ml-1">{receivedTime}</span></span>
        </div>

        <div className="flex items-center justify-between mt-1 pointer-events-none relative z-10">
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${statusType === 'urgent' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                statusType === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    statusType === 'new' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' :
                        'bg-muted text-muted-foreground border-border'
                }`}>{statusLabel || status}</span>
            {progress && (
                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-foreground block" style={{ width: `${progress}%` }}></div>
                </div>
            )}
        </div>
    </div>
);

export default Orders;
