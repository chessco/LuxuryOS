"use client";

import { useState } from "react";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";

// Column configuration (Spanish labels)
const COLUMNS = [
    { id: "INTERES_LEAD", title: "Interés / Lead" },
    { id: "COTIZACION_ENVIADA", title: "Cotización Enviada" },
    { id: "APROBADO_ANTICIPO", title: "Aprobado / Anticipo" },
    { id: "EN_PRODUCCION", title: "En Producción" },
    { id: "CONTROL_CALIDAD", title: "Control de Calidad" },
    { id: "LISTO_ENTREGA", title: "Listo para Entrega" },
    { id: "ENTREGADO_POSTVENTA", title: "Entregado / Postventa" },
];

export default function KanbanPage() {
    const [orders, setOrders] = useState([
        { id: "1", stage: "INTERES_LEAD", client: "Eduardo M.", piece: "Anillo Diamante", value: "$150,000", priority: "ALTA" },
        { id: "2", stage: "EN_PRODUCCION", client: "Sofía V.", piece: "Reloj Platinum", value: "$350,000", priority: "ALTA" },
        { id: "3", stage: "COTIZACION_ENVIADA", client: "Araceli R.", piece: "Brazalete Oro", value: "$85,000", priority: "MEDIA" },
    ]);

    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeOrder = orders.find((o) => o.id === active.id);
        const overId = over.id as string;

        // If dropped over a column or another item
        let newStage = overId;
        if (!COLUMNS.find(c => c.id === overId)) {
            // Find stage of the item it was dropped over
            const overOrder = orders.find(o => o.id === overId);
            if (overOrder) newStage = overOrder.stage;
        }

        if (activeOrder && activeOrder.stage !== newStage && COLUMNS.find(c => c.id === newStage)) {
            setOrders(orders.map(o => o.id === active.id ? { ...o, stage: newStage } : o));
        }

        setActiveId(null);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="mb-8">
                <h1 className="text-3xl font-light tracking-tight">Kanban Operativo</h1>
                <p className="text-zinc-500 text-sm mt-1">Gestión de flujo de producción artesanal</p>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex space-x-6 overflow-x-auto pb-6 h-full min-h-[600px]">
                    {COLUMNS.map((column) => (
                        <div key={column.id} className="flex-shrink-0 w-80 flex flex-col">
                            <div className="flex items-center justify-between mb-4 bg-zinc-950/50 p-3 border border-zinc-900 rounded-lg">
                                <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">{column.title}</h3>
                                <span className="text-[10px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-500">
                                    {orders.filter(o => o.stage === column.id).length}
                                </span>
                            </div>

                            <div className="flex-1 bg-zinc-950/20 rounded-xl p-2 border border-zinc-900/50 border-dashed">
                                <div className="space-y-3">
                                    {orders
                                        .filter((o) => o.stage === column.id)
                                        .map((order) => (
                                            <div
                                                key={order.id}
                                                className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg cursor-grab active:cursor-grabbing hover:border-zinc-600 transition-colors"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className={`text-[9px] px-2 py-0.5 rounded uppercase tracking-tighter ${order.priority === 'ALTA' ? 'bg-red-950/40 text-red-500' : 'bg-zinc-800 text-zinc-400'
                                                        }`}>
                                                        {order.priority}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-500 font-mono tracking-tighter">ORD-00{order.id}</span>
                                                </div>
                                                <h4 className="text-sm font-medium mt-3 text-zinc-200">{order.piece}</h4>
                                                <p className="text-xs text-zinc-500 mt-1">{order.client}</p>
                                                <div className="mt-4 flex justify-between items-center border-t border-zinc-800 pt-3">
                                                    <span className="text-xs font-semibold text-white">{order.value}</span>
                                                    <div className="flex -space-x-1">
                                                        <div className="w-5 h-5 rounded-full border border-black bg-zinc-800" title="Artesano asignado"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </DndContext>
        </div>
    );
}
