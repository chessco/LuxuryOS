import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_ORDERS, OrderMock } from '../mockData';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const columns = [
    { id: 'leads', name: 'Interés / Lead', color: 'bg-zinc-500', status: 'Nuevo' },
    { id: 'quotes', name: 'Cotización Enviada', color: 'bg-indigo-400', status: 'Pendiente' },
    { id: 'approved', name: 'Aprobado / Anticipo', color: 'bg-emerald-400', status: 'Aprobado' },
    { id: 'production', name: 'En Producción', color: 'bg-white', focus: true, status: 'En Producción' },
    { id: 'qc', name: 'Control de Calidad', color: 'bg-purple-400', status: 'Control Calidad' },
];

const Orders: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [orders, setOrders] = useState<Record<string, OrderMock>>(MOCK_ORDERS);
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleCreateOrder = (newOrder: Partial<OrderMock>) => {
        const id = Math.floor(Math.random() * 10000).toString();
        const fullOrder: OrderMock = {
            id,
            client: newOrder.client || "Nuevo Cliente",
            item: newOrder.item || "Pieza Personalizada",
            value: newOrder.value || "0 MXN",
            cost: newOrder.cost || "0 MXN",
            margin: "0%",
            status: "Nuevo",
            statusType: "new",
            date: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
            priority: newOrder.priority || "Normal",
            material: newOrder.material || "N/A",
            gem: newOrder.gem || "N/A",
            size: newOrder.size || "N/A",
            engraving: newOrder.engraving || "",
            initials: newOrder.client?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || "NC",
            initialsColor: "bg-zinc-800 text-zinc-400",
            paymentProgress: 0,
            paidAmount: "0 MXN",
            pendingAmount: newOrder.value || "0 MXN",
            ...newOrder
        } as OrderMock;

        setOrders(prev => ({ ...prev, [id]: fullOrder }));
        setIsModalOpen(false);
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            return;
        }

        const activeOrder = orders[active.id as string];
        const overId = over.id as string;

        // Find which column we successfully dropped into
        // If we drop over a "container" (column)
        if (columns.some(col => col.id === overId)) {
            const targetColumn = columns.find(col => col.id === overId);
            if (targetColumn && activeOrder.status !== targetColumn.status) {
                // Update order status
                setOrders(prev => ({
                    ...prev,
                    [active.id as string]: {
                        ...activeOrder,
                        status: targetColumn.status,
                        // Optionally update statusType based on mapped status
                        statusType: targetColumn.id === 'leads' ? 'new' :
                            targetColumn.id === 'production' ? 'urgent' :
                                targetColumn.id === 'approved' ? 'success' : 'normal'
                    }
                }));
            }
        }
        // If we drop over another item, find its column
        else if (orders[overId]) {
            const overOrder = orders[overId];
            // Find target column based on the overOrder status (simplified logic)
            // In a real app, storing columnId in order would be explicit
            let targetColumnId = '';
            if (overOrder.status === 'Nuevo' || overOrder.status === 'Pendiente' && overOrder.statusType === 'new') targetColumnId = 'leads';
            else if (overOrder.status === 'Pendiente') targetColumnId = 'quotes';
            else if (overOrder.status === 'Aprobado' || overOrder.status === 'Listo') targetColumnId = 'approved';
            else if (overOrder.status === 'En Producción' || overOrder.status === 'Urgente') targetColumnId = 'production';
            else if (overOrder.status === 'Control Calidad') targetColumnId = 'qc';

            const targetColumn = columns.find(col => col.id === targetColumnId);

            if (targetColumn && activeOrder.status !== targetColumn.status) {
                setOrders(prev => ({
                    ...prev,
                    [active.id as string]: {
                        ...activeOrder,
                        status: targetColumn.status,
                        statusType: targetColumn.id === 'leads' ? 'new' :
                            targetColumn.id === 'production' ? 'urgent' :
                                targetColumn.id === 'approved' ? 'success' : 'normal'
                    }
                }));
            }
        }

        setActiveId(null);
    };

    const getOrdersByStatus = (columnId: string) => {
        return Object.values(orders).filter(order => {
            if (columnId === 'leads') return order.status === 'Nuevo' || (order.status === 'Pendiente' && order.statusType === 'new');
            if (columnId === 'quotes') return order.status === 'Cotización Enviada' || (order.status === 'Pendiente' && order.statusType !== 'new');
            if (columnId === 'approved') return order.status === 'Aprobado' || (order.status === 'Listo' && order.statusType !== 'success'); // Adjust logic as per mock data variability
            if (columnId === 'production') return order.status === 'En Producción' || order.status === 'Urgente';
            if (columnId === 'qc') return order.status === 'Control Calidad' || (order.status === 'Listo' && order.statusType === 'success');
            return false;
        });
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <header className="shrink-0 z-10 mb-8 px-2">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-white text-3xl font-black tracking-tight font-display">Tablero de Órdenes (MXN)</h2>
                            <p className="text-zinc-500 text-sm">Gestión visual del flujo de producción y ventas</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-white/5"
                        >
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            <span>Nueva Orden</span>
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="relative w-full max-w-md group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined text-zinc-500 group-focus-within:text-white transition-colors">search</span>
                            </div>
                            <input
                                className="block w-full pl-10 pr-3 py-3 border border-zinc-900 rounded-xl bg-zinc-900/50 text-white placeholder-zinc-500 focus:border-zinc-700 outline-none text-sm transition-all shadow-sm"
                                placeholder="Buscar por cliente, ID de orden o pieza..."
                                type="text"
                            />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {['Esta Semana', 'Prioridad Alta', 'Anillos', 'Más filtros'].map(f => (
                                <button key={f} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all border border-transparent hover:border-zinc-800 whitespace-nowrap shadow-sm">
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

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <main className="flex-1 overflow-x-auto pb-6 scroll-smooth px-2">
                    <div className="flex h-full gap-8 min-w-max">
                        {columns.map(col => (
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
                            <KanbanCard {...orders[activeId]} isOverlay />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {isModalOpen && <NewOrderModal onClose={() => setIsModalOpen(false)} onSave={handleCreateOrder} />}
        </div>
    );
};

const NewOrderModal: React.FC<{ onClose: () => void, onSave: (order: Partial<OrderMock>) => void }> = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<OrderMock>>({
        client: '',
        value: '',
        cost: '',
        priority: 'Normal',
        item: '',
        material: '',
        size: '',
        gem: '',
        engraving: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-900 rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="px-10 py-8 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/40">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-white/10">
                            <span className="material-symbols-outlined text-black text-[24px]">add_shopping_cart</span>
                        </div>
                        <div>
                            <h2 className="text-white text-lg font-black uppercase tracking-widest font-display">Nueva Orden de Alta Joyería</h2>
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Configuración técnica y financiera</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-10 flex items-center justify-center rounded-xl hover:bg-zinc-900 text-zinc-600 hover:text-white transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form className="p-10 space-y-10 max-h-[70vh] overflow-y-auto no-scrollbar" onSubmit={handleSubmit}>
                    {/* Section: Client & General */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <label className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em] block px-1">Cliente VIP</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">person</span>
                                </span>
                                <input
                                    name="client"
                                    value={formData.client}
                                    onChange={handleChange}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-white focus:outline-none transition-all placeholder-zinc-700 shadow-sm"
                                    placeholder="Buscar o crear cliente..."
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em] block px-1">Fecha Prometida de Entrega</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                                </span>
                                <input
                                    type="date"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-white focus:outline-none transition-all placeholder-zinc-700 shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Piece Details */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="h-px flex-1 bg-zinc-900"></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">Detalles de la Pieza</span>
                            <span className="h-px flex-1 bg-zinc-900"></span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                                <label className="text-zinc-600 text-[9px] font-black uppercase tracking-widest block px-1">Tipo</label>
                                <input name="item" value={formData.item} onChange={handleChange} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white focus:border-zinc-500 focus:outline-none transition-all" placeholder="Anillo Solitario" required />
                            </div>
                            <div className="space-y-3">
                                <label className="text-zinc-600 text-[9px] font-black uppercase tracking-widest block px-1">Material</label>
                                <input name="material" value={formData.material} onChange={handleChange} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white focus:border-zinc-500 focus:outline-none transition-all" placeholder="Platino 950" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-zinc-600 text-[9px] font-black uppercase tracking-widest block px-1">Talla</label>
                                <input name="size" value={formData.size} onChange={handleChange} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white focus:border-zinc-500 focus:outline-none transition-all" placeholder="52 EU" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-zinc-600 text-[9px] font-black uppercase tracking-widest block px-1">Gema Central</label>
                                <input name="gem" value={formData.gem} onChange={handleChange} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white focus:border-zinc-500 focus:outline-none transition-all" placeholder="Diamante 2.01ct, VVS1, D" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-zinc-600 text-[9px] font-black uppercase tracking-widest block px-1">Grabado Personalizado</label>
                                <input name="engraving" value={formData.engraving} onChange={handleChange} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white focus:border-zinc-500 focus:outline-none transition-all" placeholder="Ej: Forever & Always" />
                            </div>
                        </div>
                    </div>

                    {/* Section: Financials */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="h-px flex-1 bg-zinc-900"></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">Análisis Financiero</span>
                            <span className="h-px flex-1 bg-zinc-900"></span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-4">
                                <label className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em] block px-1">Precio de Venta</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors bg-zinc-800 rounded p-1 text-[10px] font-bold">$</span>
                                    <input name="value" value={formData.value} onChange={handleChange} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-10 pr-4 text-sm text-white focus:border-white focus:outline-none transition-all font-bold" placeholder="150,000" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em] block px-1">Costo Estimado</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors bg-zinc-800 rounded p-1 text-[10px] font-bold">$</span>
                                    <input name="cost" value={formData.cost} onChange={handleChange} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-10 pr-4 text-sm text-white focus:border-white focus:outline-none transition-all" placeholder="75,000" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em] block px-1">Prioridad</label>
                                <select name="priority" value={formData.priority} onChange={handleChange} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-4 text-sm text-white focus:border-white focus:outline-none transition-all appearance-none cursor-pointer font-bold">
                                    <option>Normal</option>
                                    <option className="text-indigo-400">Alta</option>
                                    <option className="text-red-400 font-bold">Crítica / ASAP</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-10 border-t border-zinc-900 flex justify-end gap-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-8 py-4 rounded-2xl text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] hover:text-white transition-all underline underline-offset-8 decoration-zinc-800"
                        >
                            Descartar
                        </button>
                        <button
                            type="submit"
                            className="px-14 py-4 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95"
                        >
                            Registrar Orden
                        </button>
                    </div>
                </form>
            </div>
        </div>
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
                    <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
                    <h3 className={`font-bold text-sm tracking-tight ${focus ? 'text-white underline underline-offset-8' : 'text-zinc-400'}`}>{name}</h3>
                    <span className="text-zinc-500 text-xs ml-1 font-bold bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800 tracking-widest">{count}</span>
                </div>
                <button className="text-zinc-600 hover:text-white transition-colors"><span className="material-symbols-outlined text-[20px]">add</span></button>
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
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <KanbanCard {...order} isBig={isBig} />
        </div>
    );
};

const KanbanCard: React.FC<OrderMock & { isBig?: boolean, isOverlay?: boolean }> = ({ id, client, item, value, status, statusType, initials, initialsColor, avatar, progress, isPaid, isBig, isOverlay }) => (
    <div
        className={`group flex flex-col gap-4 rounded-2xl bg-zinc-900/40 p-5 border border-zinc-900 hover:border-zinc-700 transition-all cursor-grab active:cursor-grabbing relative hover:-translate-y-1 shadow-sm backdrop-blur-sm ${isBig ? 'border-l-4 border-l-white ring-1 ring-white/5' : ''} ${isOverlay ? 'bg-zinc-800 border-zinc-600 shadow-2xl skew-y-2' : ''}`}
    >
        <Link to={`/orders/${id}`} className="absolute inset-0 z-0" draggable={false} onClick={(e) => {
            if (isOverlay) e.preventDefault();
        }}></Link>
        <div className="flex justify-between items-start pointer-events-none relative z-10">
            <div className="flex items-center gap-3">
                {avatar ? (
                    <img src={avatar} alt={client} className="size-8 rounded-full pointer-events-none grayscale opacity-80" />
                ) : (
                    <div className={`size-8 rounded-full flex items-center justify-center text-[10px] font-black border border-zinc-800 ${initialsColor}`}>{initials}</div>
                )}
                <div>
                    <h4 className="text-white text-xs font-bold leading-tight group-hover:text-indigo-400 transition-colors">{client}</h4>
                    <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mt-0.5">#{id}</p>
                </div>
            </div>
            {isPaid && (
                <span className="material-symbols-outlined text-emerald-500 text-[16px]" title="Pagado">verified</span>
            )}
        </div>
        <div className="space-y-1 pointer-events-none relative z-10">
            <p className="text-zinc-300 text-sm font-medium leading-tight">{item}</p>
            <p className="text-white font-black tracking-tight">{value}</p>
        </div>
        <div className="flex items-center justify-between mt-1 pointer-events-none relative z-10">
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${statusType === 'urgent' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                statusType === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    statusType === 'new' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                        'bg-zinc-800 text-zinc-500 border-zinc-700'
                }`}>{status}</span>
            {progress && (
                <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-white block" style={{ width: `${progress}%` }}></div>
                </div>
            )}
        </div>
    </div>
);

export default Orders;
