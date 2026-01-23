import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { OrdersService } from '../services/orders.service';
import { ClientsService } from '../services/clients.service';
import AutocompleteInput from '../components/AutocompleteInput';
import { OrdersTable } from '../components/orders/OrdersTable';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';

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
    { id: 'DIAGNOSIS_PENDING', name: 'Diagnóstico', color: 'bg-amber-400' },
    { id: 'QUOTE_SENT', name: 'Presupuesto', color: 'bg-indigo-400' },
    { id: 'APPROVED', name: 'Aprobado', color: 'bg-emerald-400' },
    { id: 'IN_REPAIR', name: 'En Reparación', color: 'bg-white', focus: true },
    { id: 'REPAIR_COMPLETED', name: 'Listo', color: 'bg-purple-400' },
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

const Orders: React.FC = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const orderType = queryParams.get('type');

    const boardColumns = orderType === 'REPAIR' ? REPAIR_COLUMNS :
        orderType === 'MANUFACTURE' ? MANUFACTURE_COLUMNS :
            orderType === 'LAYAWAY' ? LAYAWAY_COLUMNS :
                STANDARD_COLUMNS;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
    const [orders, setOrders] = useState<any[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
                        initials: o.client?.name?.substring(0, 2).toUpperCase() || 'NC',
                        initialsColor: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
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
            // We need clientId, not just name. 
            // In a real app Autocomplete should return ID. 
            // For now, assuming we handle it or send name and backend handles it (backend needs update for name-based create)
            // Or we just fetch clients and find ID.

            // Finding the client ID based on the name from Autocomplete
            const selectedClient = clients.find(c => c.name.toLowerCase().trim() === newOrder.client.toLowerCase().trim());

            if (!selectedClient) {
                alert("Por favor selecciona un cliente válido de la lista.");
                console.error("Client not found:", newOrder.client, "Available:", clients.map(c => c.name));
                return;
            }


            const cleanNumber = (val: any) => {
                const str = String(val || '0').replace(/[^0-9.-]/g, '');
                return parseFloat(str) || 0;
            };

            const payload = {
                pieceType: newOrder.item,
                value: cleanNumber(newOrder.value),
                cost: cleanNumber(newOrder.cost),
                totalAmount: cleanNumber(newOrder.value),
                margin: 0,
                priority: newOrder.priority === 'Alta' ? 'ALTA' : 'MEDIA',
                clientId: selectedClient.id,
                stage: 'INTERES_LEAD',
                type: orderType as any,
                // New Fields
                metal: newOrder.metal,
                color: newOrder.color,
                karats: newOrder.karats,
                weight: newOrder.weight,
                size: newOrder.size,
                thickness: newOrder.thickness,
                itemCode: newOrder.itemCode,
                laborCost: cleanNumber(newOrder.laborCost),
                materialCost: cleanNumber(newOrder.materialCost),
                notes: newOrder.notes
            };

            await OrdersService.create(payload);
            fetchBoard();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Create order error", error);
            alert("Error al crear el pedido. Verifica que los datos sean correctos.");
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
            setOrders(prev => prev.map(o => o.id === activeOrder.id ? { ...o, stage: targetStage, status: targetStage } : o));

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

    const getOrdersByStatus = (columnId: string) => {
        return orders.filter(o => o.status === columnId); // Updated to use the mapped status key from backend
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <header className="shrink-0 z-10 mb-8 px-2">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-zinc-900 dark:text-white text-3xl font-black tracking-tight font-display">Tablero de Pedidos (MXN)</h2>
                            <p className="text-zinc-400 dark:text-zinc-500 text-sm">Gestión visual del flujo de producción y ventas</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-900 transition-colors">
                                <button
                                    onClick={() => setViewMode('kanban')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'kanban' ? 'bg-white text-zinc-900 shadow-md dark:bg-zinc-800 dark:text-white dark:shadow-lg' : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">view_kanban</span>
                                    <span>Kanban</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-white text-zinc-900 shadow-md dark:bg-zinc-800 dark:text-white dark:shadow-lg' : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">view_list</span>
                                    <span>Notion</span>
                                </button>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 bg-zinc-900 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-black/5 dark:shadow-white/5"
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                <span>Nuevo Pedido</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="relative w-full max-w-md group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined text-zinc-500 group-focus-within:text-white transition-colors">search</span>
                            </div>
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-zinc-200 dark:border-zinc-900 rounded-xl bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-zinc-400 dark:focus:border-zinc-700 outline-none text-sm transition-all shadow-sm"
                                placeholder="Buscar por cliente, ID de pedido o pieza..."
                                type="text"
                            />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {['Esta Semana', 'Prioridad Alta', 'Anillos', 'Más filtros'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setActiveFilter(activeFilter === f ? null : f)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border shadow-sm whitespace-nowrap ${activeFilter === f
                                        ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-black dark:border-white'
                                        : 'bg-zinc-100 text-zinc-500 border-transparent hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-500 dark:border-transparent dark:hover:bg-zinc-800 dark:hover:text-white'
                                        }`}
                                >
                                    <span>{f}</span>
                                    <span className="material-symbols-outlined text-[18px]">
                                        {f === 'Más filtros' ? 'filter_list' : 'keyboard_arrow_down'}
                                    </span>
                                </button>
                            ))}
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
                    <OrdersTable orders={orders} />
                </main>
            )}

            <AnimatePresence>
                {isModalOpen && (
                    <NewOrderDrawer
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleCreateOrder}
                        clientOptions={clients.map(c => c.name)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const NewOrderDrawer: React.FC<{ onClose: () => void, onSave: (order: any) => void, clientOptions: string[] }> = ({ onClose, onSave, clientOptions }) => {
    const [formData, setFormData] = useState<any>({
        client: '',
        value: '',
        cost: '',
        priority: 'Media',
        notes: '',
    });

    const [items, setItems] = useState<any[]>([
        { item: '', metal: '', color: '', karats: '', weight: '', size: '', itemCode: '' }
    ]);

    const handleItemChange = (index: number, field: string, value: string) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { item: '', metal: '', color: '', karats: '', weight: '', size: '', itemCode: '' }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Sync first item to top-level fields for backward compatibility
        const mainItem = items[0] || {};
        const submissionData = {
            ...formData,
            ...mainItem,
            pieceType: mainItem.item,
            specifications: { items }
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
                className="fixed inset-y-0 right-0 z-[70] w-full max-w-lg bg-zinc-950 border-l border-zinc-900 shadow-2xl flex flex-col"
            >
                {/* Header */}
                <div className="p-8 border-b border-zinc-900 bg-zinc-900/20">
                    <div className="flex items-center justify-between mb-2">
                        <div className="size-10 rounded-xl bg-white flex items-center justify-center">
                            <span className="material-symbols-outlined text-black">add_shopping_cart</span>
                        </div>
                        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div>
                        <h2 className="text-white text-xl font-black uppercase tracking-widest font-display">Nuevo Pedido</h2>
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1.5">Registro Técnico de Joyería</p>
                    </div>
                </div>

                {/* Form Body */}
                <form className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar" onSubmit={handleSubmit}>
                    {/* Section: Cliente */}
                    <div className="space-y-6">
                        <h3 className="text-white text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-indigo-500"></span>
                            Información del Cliente
                        </h3>
                        <AutocompleteInput
                            name="client"
                            value={formData.client || ''}
                            onChange={(val) => setFormData(prev => ({ ...prev, client: val }))}
                            options={clientOptions}
                            placeholder="Buscar o crear cliente..."
                            icon="person"
                            required
                        />
                    </div>

                    {/* Section: Piezas */}
                    <div className="space-y-8">
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-900/50">
                            <h3 className="text-white text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                                <span className="size-1.5 rounded-full bg-amber-500"></span>
                                Ficha Técnica (Piezas)
                            </h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-2 text-indigo-400 hover:text-white transition-colors text-[9px] font-black uppercase tracking-widest"
                            >
                                <span className="material-symbols-outlined text-sm">add_circle</span>
                                Agregar Pieza
                            </button>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="space-y-6 p-6 rounded-2xl bg-zinc-900/30 border border-zinc-900 relative group/item">
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="absolute -top-2 -right-2 size-6 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-400/30 transition-all flex items-center justify-center"
                                    >
                                        <span className="material-symbols-outlined text-xs">close</span>
                                    </button>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1">Pieza #{index + 1}</label>
                                        <input
                                            value={item.item}
                                            onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                                            className="w-full bg-zinc-900/50 border border-zinc-900 rounded-xl py-3 px-4 text-sm text-white focus:border-zinc-700 transition-all outline-none"
                                            placeholder="Anillo, Collar, etc."
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1">Metal</label>
                                        <input value={item.metal} onChange={(e) => handleItemChange(index, 'metal', e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-900 rounded-xl py-3 px-4 text-sm text-white focus:border-zinc-700 outline-none" placeholder="Oro, Plata" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1">Color</label>
                                        <input value={item.color} onChange={(e) => handleItemChange(index, 'color', e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-900 rounded-xl py-3 px-4 text-sm text-white focus:border-zinc-700 outline-none" placeholder="Am, Bl, Rs" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1">Quilates</label>
                                        <input value={item.karats} onChange={(e) => handleItemChange(index, 'karats', e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-900 rounded-xl py-3 px-4 text-sm text-white focus:border-zinc-700 outline-none" placeholder="14k, 18k" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1">Peso (Gr)</label>
                                        <input value={item.weight} onChange={(e) => handleItemChange(index, 'weight', e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-900 rounded-xl py-3 px-4 text-sm text-white focus:border-zinc-700 outline-none" placeholder="0.00" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1">Medida</label>
                                        <input value={item.size} onChange={(e) => handleItemChange(index, 'size', e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-900 rounded-xl py-3 px-4 text-sm text-white focus:border-zinc-700 outline-none" placeholder="7, 18cm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1">SKU / Cód</label>
                                        <input value={item.itemCode} onChange={(e) => handleItemChange(index, 'itemCode', e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-900 rounded-xl py-3 px-4 text-sm text-white focus:border-zinc-700 outline-none" placeholder="ABC-123" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Section: Valores */}
                    <div className="space-y-6">
                        <h3 className="text-white text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2 pt-2 border-t border-zinc-900/50">
                            <span className="size-1.5 rounded-full bg-emerald-500"></span>
                            Finanzas y Prioridad
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1">Precio Venta</label>
                                <input name="value" value={formData.value} onChange={handleChange} className="w-full bg-zinc-900/50 border border-zinc-900 rounded-xl py-3 px-4 text-sm text-white focus:border-white transition-all outline-none" placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1">Costo Total</label>
                                <input name="cost" value={formData.cost} onChange={handleChange} className="w-full bg-zinc-900/50 border border-zinc-900 rounded-xl py-3 px-4 text-sm text-white focus:border-white transition-all outline-none" placeholder="0.00" />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1">Prioridad del Atelier</label>
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange as any}
                                    className="w-full bg-zinc-900/50 border border-zinc-900 rounded-xl py-3 px-4 text-sm text-white focus:border-zinc-700 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="Baja">Baja</option>
                                    <option value="Media">Media</option>
                                    <option value="Alta">Alta</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section: Notas */}
                    <div className="space-y-4 pt-2 border-t border-zinc-900/50">
                        <label className="text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1">Observaciones</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange as any} className="w-full bg-zinc-900/50 border border-zinc-900 rounded-xl py-4 px-4 text-sm text-white transition-all min-h-[100px] resize-none outline-none focus:border-zinc-700" placeholder="Ej: Grabado láser interior..." />
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="p-8 border-t border-zinc-900 bg-zinc-900/20 grid grid-cols-2 gap-4">
                    <button type="button" onClick={onClose} className="py-4 rounded-xl text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="py-4 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 active:scale-95"
                    >
                        Crear Pedido
                    </button>
                </div>
            </motion.div>
        </>
    );
};

const KanbanColumn: React.FC<{ id: string, name: string, color: string, count: number, focus?: boolean, orders: OrderMock[] }> = ({ id, name, color, count, focus, orders }) => {
    const { setNodeRef } = useSortable({
        id: id,
        data: {
            type: 'Column',
        }
    });

    return (
        <div ref={setNodeRef} className={`flex flex-col w-[320px] h-full ${focus ? 'bg-white/5 rounded-2xl border border-dashed border-white/10 p-2' : ''}`}>
            <div className={`flex items-center justify-between mb-6 px-2 ${focus ? 'mt-2' : ''}`}>
                <div className="flex items-center gap-3">
                    <span className={`size-2 rounded-full ${color}`}></span>
                    <h3 className={`font-bold text-sm tracking-tight ${focus ? 'text-zinc-900 dark:text-white underline underline-offset-8 decoration-zinc-200 dark:decoration-zinc-800' : 'text-zinc-500 dark:text-zinc-400'}`}>{name}</h3>
                    <span className="text-zinc-400 dark:text-zinc-500 text-[10px] ml-1 font-bold bg-zinc-50 dark:bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-800 tracking-widest">{count}</span>
                </div>
                <button className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-600 dark:hover:text-white transition-colors"><span className="material-symbols-outlined text-[20px]">add</span></button>
            </div>

            <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 no-scrollbar">
                    {orders.map(order => (
                        <SortableKanbanCard key={order.id} order={order} isBig={id === 'production'} />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
};

const SortableKanbanCard: React.FC<{ order: OrderMock, isBig?: boolean }> = ({ order, isBig }) => {
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

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => navigate(`/orders/${order.id}`)}
        >
            <KanbanCard {...order} isBig={isBig} />
        </div>
    );
};

const KanbanCard: React.FC<OrderMock & { isBig?: boolean, isOverlay?: boolean }> = ({ id, client, item, value, status, statusType, initials, initialsColor, avatar, progress, isPaid, isBig, isOverlay, receivedDate, receivedTime }) => (
    <div
        className={`group flex flex-col gap-4 rounded-2xl bg-white dark:bg-zinc-900/40 p-5 border border-zinc-200 dark:border-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer active:cursor-grabbing relative hover:-translate-y-1 shadow-sm backdrop-blur-sm ${isBig ? 'border-l-4 border-l-zinc-900 dark:border-l-white ring-1 ring-black/5 dark:ring-white/5' : ''} ${isOverlay ? 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 shadow-2xl skew-y-2' : ''}`}
    >
        <div className="flex justify-between items-start pointer-events-none relative z-10">
            <div className="flex items-center gap-3">
                {avatar ? (
                    <img src={avatar} alt={client} className="size-8 rounded-full pointer-events-none grayscale opacity-80" />
                ) : (
                    <div className={`size-8 rounded-full flex items-center justify-center text-[10px] font-black border border-zinc-100 dark:border-zinc-800 ${initialsColor}`}>{initials}</div>
                )}
                <div>
                    <h4 className="text-zinc-900 dark:text-white text-xs font-bold leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{client}</h4>
                    <p className="text-zinc-400 dark:text-zinc-600 text-[10px] font-black uppercase tracking-widest mt-0.5">#{id.substring(0, 8)}</p>
                </div>
            </div>
            {isPaid && (
                <span className="material-symbols-outlined text-emerald-500 text-[16px]" title="Pagado">verified</span>
            )}
        </div>
        <div className="space-y-1 pointer-events-none relative z-10">
            <p className="text-zinc-500 dark:text-zinc-300 text-sm font-medium leading-tight">{item}</p>
            <p className="text-zinc-900 dark:text-white font-black tracking-tight">{value}</p>
        </div>

        <div className="flex items-center gap-2 py-1 pointer-events-none relative z-10">
            <span className="material-symbols-outlined text-zinc-400 dark:text-zinc-600 text-[14px]">history</span>
            <span className="text-zinc-400 dark:text-zinc-500 text-[9px] font-black uppercase tracking-widest">{receivedDate} <span className="text-zinc-200 dark:text-zinc-700 ml-1">{receivedTime}</span></span>
        </div>

        <div className="flex items-center justify-between mt-1 pointer-events-none relative z-10">
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${statusType === 'urgent' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                statusType === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    statusType === 'new' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' :
                        'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700'
                }`}>{status}</span>
            {progress && (
                <div className="w-16 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-900 dark:bg-white block" style={{ width: `${progress}%` }}></div>
                </div>
            )}
        </div>
    </div>
);

export default Orders;
