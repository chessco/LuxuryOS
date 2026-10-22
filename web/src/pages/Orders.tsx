import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { OrdersService } from '../services/orders.service';
import { ClientsService } from '../services/clients.service';
import { QueueService } from '../services/queue.service';
import AutocompleteInput from '../components/AutocompleteInput';
import { useTheme } from '../context/ThemeContext';

import { OrdersTable } from '../components/orders/OrdersTable';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { LabelPrintModal } from '../components/orders/LabelPrintModal';
import { PieceSelect } from '../components/orders/PieceSelect';
import { SelectWithOther } from '../components/orders/SelectWithOther';
import { UsersService } from '../services/users.service';
import { ClientHistoryModal } from '../components/orders/ClientHistoryModal';
import { getTrafficLight, TrafficLightColor } from '../utils/trafficLight';

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
    { id: 'REPAIR_COMPLETED', name: 'Terminado', color: 'bg-emerald-400' },
];

const MANUFACTURE_COLUMNS: Column[] = [
    { id: 'RECEIVED', name: 'Recibido', color: 'bg-zinc-500' },
    { id: 'IN_PRODUCTION', name: 'En Taller', color: 'bg-white', focus: true },
    { id: 'READY_FOR_PICKUP', name: 'Terminado', color: 'bg-emerald-400' },
];

const LAYAWAY_COLUMNS: Column[] = [
    { id: 'LAYAWAY_OPEN', name: 'Apartado Abierto', color: 'bg-indigo-400' },
    { id: 'LAYAWAY_EXPIRED', name: 'Apartado Vencido', color: 'bg-red-500' },
];

export const SPANISH_STATUS_MAP: Record<string, string> = {
    'DELIVERED': 'ENTREGADO',
    'RECEIVED': 'RECIBIDO',
    'IN_REPAIR': 'EN TALLER',
    'REPAIR_COMPLETED': 'TERMINADO',
    'READY_FOR_PICKUP': 'TERMINADO',
    'SPEC_PENDING': 'RECIBIDO',
    'MATERIALS_PENDING': 'EN TALLER',
    'IN_PRODUCTION': 'EN TALLER',
    'QUALITY_CHECK': 'EN TALLER',
    'LAYAWAY_OPEN': 'APARTADO ABIERTO',
    'LAYAWAY_EXPIRED': 'APARTADO VENCIDO',
    'INTERES_LEAD': 'RECIBIDO',
    'COTIZACION_ENVIADA': 'COTIZACIÓN ENVIADA',
    'APROBADO_ANTICIPO': 'APROBADO / ANTICIPO',
    'EN_PRODUCCION': 'EN TALLER',
    'CONTROL_CALIDAD': 'EN TALLER',
    'DRAFT': 'RECIBIDO',
    'CANCELLED': 'CANCELADO',
    'READY': 'TERMINADO',
    'LISTO': 'TERMINADO',
    'TERMINADO': 'TERMINADO',
    'RETURNED': 'DEVUELTO',
    'DEVUELTO': 'DEVUELTO'
};

export const getStatusLabel = (stage: string) => {
    if (!stage) return '';
    const upper = stage.toUpperCase();
    if (SPANISH_STATUS_MAP[upper]) {
        return SPANISH_STATUS_MAP[upper];
    }
    const allCols = [...STANDARD_COLUMNS, ...REPAIR_COLUMNS, ...MANUFACTURE_COLUMNS, ...LAYAWAY_COLUMNS];
    const col = allCols.find(c => c.id === stage || c.id === upper);
    if (col) return col.name.toUpperCase();
    return upper;
};

export const formatOrderCode = (order: any, seqIndex?: number) => {
    if (!order) return '';
    const t = (order.type || 'STANDARD').toUpperCase();
    let prefix = 'PED';
    if (t === 'REPAIR') prefix = 'REP';
    else if (t === 'MANUFACTURE') prefix = 'FAB';
    else if (t === 'DESIGN') prefix = 'DIS';
    else if (t === 'LASER') prefix = 'LAS';
    else if (t === 'LAYAWAY') prefix = 'APT';

    let rawCode = order.orderCode || order.specifications?.orderCode || '';
    if (rawCode) {
        const match = String(rawCode).match(/^([A-Z]+)-0*(\d+)$/i);
        if (match) {
            return `${match[1].toUpperCase()}-${match[2]}`;
        }
        return rawCode;
    }

    const seqNum = seqIndex !== undefined ? seqIndex : (order.sequenceNumber || 1);
    return `${prefix}-${seqNum}`;
};

const DELIVERED_COLUMN: Column = { id: 'DELIVERED', name: 'Entregado', color: 'bg-emerald-600' };

const Orders: React.FC = () => {
    const navigate = useNavigate();
    const { variant } = useTheme();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const orderType = queryParams.get('type');
    const autoOpenNew = queryParams.get('newOrder') === 'true';
    const prefillClientName = queryParams.get('clientName') || '';
    const prefillClientPhone = queryParams.get('clientPhone') || '';
    const prefillTicketId = queryParams.get('ticketId') || '';
    const prefillTicketCode = queryParams.get('ticketCode') || '';

    const user = React.useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    }, []);
    const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
    const isJoyero = React.useMemo(() => {
        return (
            user?.role === 'JOYERO' ||
            String(user?.role || '').toUpperCase() === 'JOYERO' ||
            String(user?.email || '').toLowerCase().includes('joyero') ||
            String(user?.name || '').toLowerCase().includes('joyero')
        );
    }, [user]);

    const [activeFilter, setActiveFilter] = useState<string | null>(isJoyero ? 'En Taller' : 'Recibido');
    const [trafficLightFilter, setTrafficLightFilter] = useState<'ALL' | 'RED' | 'YELLOW' | 'GREEN'>('ALL');

    useEffect(() => {
        if (isJoyero && activeFilter === 'Recibido') {
            setActiveFilter('En Taller');
        }
    }, [isJoyero, activeFilter]);

    const effectiveOrderType = orderType || 'REPAIR';
    const boardColumns = React.useMemo(() => {
        let base = effectiveOrderType === 'REPAIR' ? REPAIR_COLUMNS :
            effectiveOrderType === 'MANUFACTURE' ? MANUFACTURE_COLUMNS :
            (effectiveOrderType === 'DESIGN' || effectiveOrderType === 'LASER') ? REPAIR_COLUMNS :
                effectiveOrderType === 'LAYAWAY' ? LAYAWAY_COLUMNS :
                    STANDARD_COLUMNS;
        if (activeFilter === 'Entregados') {
            return [...base, DELIVERED_COLUMN];
        }
        return base;
    }, [effectiveOrderType, activeFilter]);

    useEffect(() => {
        if (!orderType) {
            navigate('/orders?type=REPAIR', { replace: true });
        }
    }, [orderType, navigate]);

    const [isModalOpen, setIsModalOpen] = useState(autoOpenNew && !isJoyero);
    const [viewMode, setViewMode] = useState<'kanban' | 'table'>('table');
    const [orders, setOrders] = useState<any[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [labelPrintOrder, setLabelPrintOrder] = useState<any | null>(null);
    const [isLabelPrintOpen, setIsLabelPrintOpen] = useState(false);

    useEffect(() => {
        if (autoOpenNew && !isJoyero) {
            setIsModalOpen(true);
        } else if (autoOpenNew && isJoyero) {
            setIsModalOpen(false);
            const nextParams = new URLSearchParams(location.search);
            nextParams.delete('newOrder');
            const searchStr = nextParams.toString() ? `?${nextParams.toString()}` : '';
            navigate(`${location.pathname}${searchStr}`, { replace: true });
        }
    }, [autoOpenNew, isJoyero]);

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
            const data = await OrdersService.getBoard(effectiveOrderType);

            const rawOrders: any[] = [];
            Object.keys(data).forEach(stage => {
                data[stage].forEach((o: any) => rawOrders.push(o));
            });
            rawOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            const typeCounters: Record<string, number> = {};
            const orderCodeMap = new Map<string, string>();
            const seqMap = new Map<string, number>();

            rawOrders.forEach(o => {
                const t = (o.type || 'STANDARD').toUpperCase();
                typeCounters[t] = (typeCounters[t] || 0) + 1;
                const prefix = t === 'REPAIR' ? 'REP' : (t === 'MANUFACTURE' ? 'FAB' : (t === 'DESIGN' ? 'DIS' : (t === 'LASER' ? 'LAS' : (t === 'LAYAWAY' ? 'APT' : 'PED'))));
                const seqNum = typeCounters[t];

                let existingCode = o.specifications?.orderCode || o.orderCode;
                let cleanCode = `${prefix}-${seqNum}`;
                if (existingCode) {
                    const match = String(existingCode).match(/^([A-Z]+)-0*(\d+)$/i);
                    if (match) {
                        cleanCode = `${match[1].toUpperCase()}-${match[2]}`;
                    } else {
                        cleanCode = existingCode;
                    }
                }

                orderCodeMap.set(o.id, cleanCode);
                seqMap.set(o.id, seqNum);
            });

            // Flatten board data from {STAGE: [orders]} to [orders] with mapped props for UI
            const flattenOrders: any[] = [];
            Object.keys(data).forEach(stage => {
                data[stage].forEach((o: any) => {
                    flattenOrders.push({
                        ...o,
                        sequenceNumber: seqMap.get(o.id) || 1,
                        orderCode: orderCodeMap.get(o.id) || formatOrderCode(o),
                        // Mapping DB fields to UI expectation
                        client: o.client?.name || 'Cliente',
                        createdByName: o.createdBy?.name || o.specifications?.receivedBy || o.specifications?.createdByName || '—',
                        item: o.pieceType,
                        description: o.pieceType || o.notes || '—',
                        value: `$${Number(o.value || 0).toLocaleString()} MXN`,
                        laborCost: `$${Number(o.laborCost || o.value || 0).toLocaleString()} MXN`,
                        department: (o.specifications?.department || 'CARED').toUpperCase(),
                        jeweler: o.specifications?.assignedTo || o.specifications?.assignedJeweler || o.specifications?.readyByName || o.specifications?.readyBy?.name || o.readyByName || o.completedByName || (o.createdBy?.role === 'JOYERO' ? o.createdBy?.name : '—'),
                        completedDate: o.specifications?.completedAt
                            ? new Date(o.specifications.completedAt).toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', day: '2-digit', month: '2-digit', year: 'numeric' })
                            : (o.deliveredAt
                                ? new Date(o.deliveredAt).toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', day: '2-digit', month: '2-digit', year: 'numeric' })
                                : (stage === 'REPAIR_COMPLETED' || stage === 'READY_FOR_PICKUP' || stage === 'DELIVERED' || stage === 'ENTREGADO'
                                    ? new Date(o.updatedAt).toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', day: '2-digit', month: '2-digit', year: 'numeric' })
                                    : '—')),
                        promisedDate: o.promisedAt
                            ? new Date(o.promisedAt).toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', day: '2-digit', month: '2-digit', year: 'numeric' })
                            : (o.specifications?.promisedDate || '—'),
                        status: stage, // keep raw stage for logic, map for display
                        statusLabel: getStatusLabel(stage),
                        initials: o.client?.name?.substring(0, 2).toUpperCase() || 'NC',
                        initialsColor: 'bg-muted text-muted-foreground border border-border',
                        statusType: stage === 'INTERES_LEAD' ? 'new' :
                            stage === 'EN_PRODUCCION' ? 'urgent' :
                                stage === 'APROBADO_ANTICIPO' ? 'success' : 'normal',
                        receivedDate: o.createdAt ? new Date(o.createdAt).toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
                        receivedTime: o.createdAt ? new Date(o.createdAt).toLocaleTimeString('es-MX', { timeZone: 'America/Hermosillo', hour: '2-digit', minute: '2-digit' }) : '',
                        deliveredDate: o.deliveredAt ? new Date(o.deliveredAt).toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', day: '2-digit', month: '2-digit', year: 'numeric' }) : ((stage === 'DELIVERED' || stage === 'ENTREGADO' || stage === 'ENTREGADO_POSTVENTA') && o.updatedAt ? new Date(o.updatedAt).toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''),
                        deliveredTime: o.deliveredAt ? new Date(o.deliveredAt).toLocaleTimeString('es-MX', { timeZone: 'America/Hermosillo', hour: '2-digit', minute: '2-digit' }) : ((stage === 'DELIVERED' || stage === 'ENTREGADO' || stage === 'ENTREGADO_POSTVENTA') && o.updatedAt ? new Date(o.updatedAt).toLocaleTimeString('es-MX', { timeZone: 'America/Hermosillo', hour: '2-digit', minute: '2-digit' }) : '')
                    });
                });
            });

            // Default sort flattenOrders numerically by sequence number descending so newest is at the top
            flattenOrders.sort((a, b) => (b.sequenceNumber || 0) - (a.sequenceNumber || 0));

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
        if (isJoyero) {
            alert("El rol Joyero no tiene permisos para crear órdenes o reparaciones.");
            return;
        }
        try {
            let selectedClient: any = null;

            // 1. If explicit clientId was passed from selection
            if (newOrder.selectedClientId) {
                selectedClient = clients.find(c => c.id === newOrder.selectedClientId);
            }

            // 2. If not, match by name (case-insensitive & trimmed)
            const clientNameUpper = (newOrder.client || '').toUpperCase().trim();
            if (!selectedClient && clientNameUpper) {
                selectedClient = clients.find(c => c.name?.toLowerCase().trim() === clientNameUpper.toLowerCase());
            }

            // 3. If not, match by phone
            const rawPhone = (newOrder.clientPhone || newOrder.newClientPhone || prefillClientPhone || '').replace(/\D/g, '');
            if (!selectedClient && rawPhone.length >= 7) {
                selectedClient = clients.find(c => {
                    if (!c.phone) return false;
                    const cClean = c.phone.replace(/\D/g, '');
                    return cClean.length >= 7 && (cClean.includes(rawPhone) || rawPhone.includes(cClean));
                });
            }

            // 4. If still not found, create new client
            if (!selectedClient) {
                if (!clientNameUpper) {
                    alert("Debes seleccionar o ingresar el nombre del cliente.");
                    return;
                }
                try {
                    selectedClient = await ClientsService.create({
                        name: clientNameUpper,
                        phone: newOrder.newClientPhone?.trim() || prefillClientPhone?.trim() || undefined,
                        email: newOrder.newClientEmail?.trim() || undefined
                    });
                    await fetchClients();
                } catch (clientError) {
                    console.error("Auto client creation failed", clientError);
                    alert("Error al registrar automáticamente el nuevo cliente.");
                    return;
                }
            }

            if (!selectedClient?.id) {
                alert("No se pudo identificar el cliente. Por favor selecciónalo de la lista.");
                return;
            }

            const cleanNumber = (val: any) => {
                const str = String(val || '0').replace(/[^0-9.-]/g, '');
                return parseFloat(str) || 0;
            };

            // Map all pieces in specifications to UPPERCASE
            const uppercaseItems = (newOrder.specifications?.items || []).map((item: any) => {
                const workDesc = (item.description || item.notes || '').toUpperCase().trim();
                return {
                    item: (item.item || '').toUpperCase().trim(),
                    metal: (item.metal || '').toUpperCase().trim(),
                    color: (item.color || '').toUpperCase().trim(),
                    karats: (item.karats || '').toUpperCase().trim(),
                    weight: (item.weight || '').toUpperCase().trim(),
                    size: (item.size || '').toUpperCase().trim(),
                    thickness: (item.thickness || '').toUpperCase().trim(),
                    itemCode: (item.itemCode || '').toUpperCase().trim(),
                    description: workDesc,
                    notes: workDesc,
                    imageUrl: item.imageUrl || undefined
                };
            });

            const firstItem = uppercaseItems[0] || {};

            const payload = {
                pieceType: firstItem.item || '',
                value: cleanNumber(newOrder.value),
                cost: cleanNumber(newOrder.cost),
                totalAmount: cleanNumber(newOrder.value),
                margin: 0,
                priority: newOrder.priority === 'Alta' ? 'ALTA' : (newOrder.priority === 'Baja' ? 'BAJA' : 'MEDIA'),
                clientId: selectedClient.id,
                stage: (orderType === 'REPAIR' || orderType === 'MANUFACTURE' || orderType === 'DESIGN' || orderType === 'LASER') ? 'RECEIVED' : 'INTERES_LEAD',
                type: (orderType || 'STANDARD').toUpperCase() as any,
                promisedAt: newOrder.promisedDate ? new Date(newOrder.promisedDate) : undefined,
                // New Fields in UPPERCASE
                metal: firstItem.metal || '',
                color: firstItem.color || '',
                karats: firstItem.karats || '',
                weight: firstItem.weight || '',
                size: firstItem.size || '',
                thickness: firstItem.thickness || '',
                itemCode: firstItem.itemCode || '',
                laborCost: cleanNumber(newOrder.value || newOrder.laborCost),
                materialCost: cleanNumber(newOrder.materialCost || newOrder.cost),
                notes: newOrder.notes || '',
                imageUrl: newOrder.imageUrl || undefined,
                specifications: {
                    items: uppercaseItems,
                    department: (newOrder.department || 'Taller Cared').trim(),
                    promisedDate: newOrder.promisedDate || '',
                    assignedTo: (newOrder.assignedTo || '').trim(),
                    assignedJeweler: newOrder.requiresDesign ? undefined : (newOrder.assignedTo || '').trim(),
                    assignedDesigner: newOrder.requiresDesign ? (newOrder.assignedTo || '').trim() : undefined,
                    requiresDesign: Boolean(newOrder.requiresDesign || orderType === 'DESIGN'),
                    designStatus: (newOrder.requiresDesign || orderType === 'DESIGN') ? 'PENDING_DESIGN' : undefined,
                }
            };

            const created = await OrdersService.create(payload);

            if (prefillTicketId) {
                try {
                    await QueueService.linkOrder(prefillTicketId, created.id);
                } catch (linkErr) {
                    console.error("Error linking ticket to order:", linkErr);
                }
            }

            fetchBoard();
            setIsModalOpen(false);

            // Clean up queue query params
            const nextParams = new URLSearchParams(location.search);
            nextParams.delete('newOrder');
            nextParams.delete('clientName');
            nextParams.delete('clientPhone');
            nextParams.delete('ticketId');
            nextParams.delete('ticketCode');
            const searchStr = nextParams.toString() ? `?${nextParams.toString()}` : '';
            navigate(`${location.pathname}${searchStr}`, { replace: true });

            if (newOrder.shouldPrintLabel && !isJoyero) {
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

    // Apply search and filters
    const filteredOrders = React.useMemo(() => {
        let result = orders;

        // Default rule: Exclude DELIVERED orders unless user explicitly selected 'Entregados'
        if (activeFilter !== 'Entregados') {
            result = result.filter(o => o.status !== 'DELIVERED' && o.stage !== 'DELIVERED');
        }

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const cleanNumeric = q.replace(/[^0-9]/g, '');

            result = result.filter(o => {
                const code = (o.orderCode || formatOrderCode(o) || '').toLowerCase();
                const client = String(o.client || '').toLowerCase();
                const item = String(o.item || o.pieceType || '').toLowerCase();
                const creator = String(o.createdByName || '').toLowerCase();
                const notes = String(o.notes || '').toLowerCase();

                if (code.includes(q) || client.includes(q) || item.includes(q) || creator.includes(q) || notes.includes(q)) {
                    return true;
                }

                if (cleanNumeric.length > 0) {
                    const codeNumeric = code.replace(/[^0-9]/g, '');
                    const codeNumTrimmed = codeNumeric.replace(/^0+/, '') || '0';
                    if (codeNumeric.endsWith(cleanNumeric) || codeNumTrimmed === cleanNumeric) {
                        return true;
                    }
                }

                return false;
            });
        }

        // Active filter
        if (activeFilter) {
            if (activeFilter === 'Recibido') {
                result = result.filter(o => {
                    const label = (o.statusLabel || '').toUpperCase();
                    const rawStatus = (o.status || o.stage || '').toUpperCase();
                    const isDevuelto = label === 'DEVUELTO' || rawStatus === 'RETURNED' || rawStatus === 'DEVUELTO' || (o.specifications?.isReturned === true || !!o.specifications?.returnedBy);
                    return (label === 'RECIBIDO' || rawStatus === 'RECEIVED' || rawStatus === 'RECIBIDO') && !isDevuelto;
                });
            } else if (activeFilter === 'Devuelto') {
                result = result.filter(o => {
                    const label = (o.statusLabel || '').toUpperCase();
                    const rawStatus = (o.status || o.stage || '').toUpperCase();
                    if (label === 'DEVUELTO' || rawStatus === 'RETURNED' || rawStatus === 'DEVUELTO') {
                        return true;
                    }
                    const isReceived = label === 'RECIBIDO' || rawStatus === 'RECEIVED' || rawStatus === 'RECIBIDO';
                    return isReceived && (o.specifications?.isReturned === true || !!o.specifications?.returnedBy);
                });
            } else if (activeFilter === 'En Taller') {
                result = result.filter(o => {
                    const label = (o.statusLabel || '').toUpperCase();
                    return label === 'EN TALLER';
                });
            } else if (activeFilter === 'Terminado' || activeFilter === 'Para Entrega') {
                result = result.filter(o => {
                    const label = (o.statusLabel || '').toUpperCase();
                    return label === 'PARA ENTREGA' || label === 'LISTO' || label === 'TERMINADO';
                });
            } else if (activeFilter === 'Entregados') {
                result = result.filter(o => {
                    const label = (o.statusLabel || '').toUpperCase();
                    const rawStatus = (o.status || o.stage || '').toUpperCase();
                    const isReturnedToClient = Boolean(o.specifications?.isReturnedToClient || o.specifications?.isReturnedNotDone);
                    return label === 'ENTREGADO' || rawStatus === 'DELIVERED' || rawStatus === 'ENTREGADO_POSTVENTA' || isReturnedToClient;
                });
            } else if (activeFilter === 'Esta Semana') {
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

        // Filtro de semáforo de fechas (RF-03)
        if (trafficLightFilter && trafficLightFilter !== 'ALL') {
            result = result.filter(o => {
                const traffic = getTrafficLight(o);
                return traffic.color === trafficLightFilter;
            });
        }

        return result;
    }, [orders, searchQuery, activeFilter, trafficLightFilter]);

    const filterButtons = isJoyero
        ? ['En Taller', 'Terminado', 'Entregados', 'Esta Semana', 'Devuelto']
        : ['Recibido', 'En Taller', 'Terminado', 'Entregados', 'Esta Semana', 'Devuelto'];

    const getOrdersByStatus = (columnId: string) => {
        return filteredOrders.filter(o => o.status === columnId);
    };

    const boardTitle = effectiveOrderType === 'REPAIR'
        ? 'Tablero de Reparaciones'
        : effectiveOrderType === 'MANUFACTURE'
        ? 'Tablero de Fabricación'
        : effectiveOrderType === 'DESIGN'
        ? 'Tablero de Diseño'
        : effectiveOrderType === 'LASER'
        ? 'Tablero de Láser'
        : effectiveOrderType === 'LAYAWAY'
        ? 'Tablero de Apartados'
        : 'Tablero de Pedidos';

    const boardSubtitle = effectiveOrderType === 'REPAIR'
        ? 'Gestión visual del flujo de reparación y servicio'
        : effectiveOrderType === 'MANUFACTURE'
        ? 'Gestión visual del flujo de fabricación personalizada'
        : effectiveOrderType === 'DESIGN'
        ? 'Gestión visual del flujo de modelado y diseño personalizado'
        : effectiveOrderType === 'LASER'
        ? 'Gestión visual del flujo de grabado y corte láser'
        : effectiveOrderType === 'LAYAWAY'
        ? 'Gestión visual del flujo de apartados y liquidación'
        : 'Gestión visual del flujo de producción y ventas';

    const newButtonLabel = effectiveOrderType === 'REPAIR'
        ? 'Nueva Reparación'
        : effectiveOrderType === 'MANUFACTURE'
        ? 'Nueva Fabricación'
        : effectiveOrderType === 'DESIGN'
        ? 'Nuevo Diseño'
        : effectiveOrderType === 'LASER'
        ? 'Nuevo Láser'
        : 'Nuevo Pedido';

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <header className="shrink-0 z-10 mb-8 px-2">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-foreground text-3xl font-black tracking-tight font-display transition-colors">{boardTitle}</h2>
                            <p className="text-muted-foreground text-sm transition-colors">{boardSubtitle}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            {isSystemAdmin && (
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
                            )}
                            {!isJoyero && (
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[20px]">add</span>
                                    <span>{newButtonLabel}</span>
                                </button>
                            )}
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
                            {filterButtons.map(f => {
                                const isActive = activeFilter === f;
                                return (
                                    <button
                                        key={f}
                                        onClick={() => setActiveFilter(isActive ? null : f)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border shadow-sm whitespace-nowrap ${
                                            isActive
                                                ? f === 'Recibido'
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md font-black'
                                                    : f === 'Devuelto'
                                                    ? 'bg-rose-600 text-white border-rose-600 shadow-md font-black'
                                                    : f === 'En Taller'
                                                    ? 'bg-purple-600 text-white border-purple-600 shadow-md font-black'
                                                    : (f === 'Terminado' || f === 'Para Entrega')
                                                    ? 'bg-amber-500 text-black border-amber-500 shadow-md font-black'
                                                    : f === 'Entregados'
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md font-black'
                                                    : 'bg-foreground text-background border-border shadow-md'
                                                : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80 hover:text-foreground'
                                        }`}
                                    >
                                        <span>{f}</span>
                                        {isActive ? (
                                            <span className="material-symbols-outlined text-[18px]">close</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
                                        )}
                                    </button>
                                );
                            })}
                            {/* Semáforo Filters (RF-03) */}
                            <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
                                <button
                                    type="button"
                                    onClick={() => setTrafficLightFilter(trafficLightFilter === 'RED' ? 'ALL' : 'RED')}
                                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shadow-xs cursor-pointer ${
                                        trafficLightFilter === 'RED'
                                            ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/30'
                                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                                    }`}
                                    title="Filtrar pedidos con fecha de entrega vencida"
                                >
                                    <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
                                    <span>Vencidos</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTrafficLightFilter(trafficLightFilter === 'YELLOW' ? 'ALL' : 'YELLOW')}
                                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shadow-xs cursor-pointer ${
                                        trafficLightFilter === 'YELLOW'
                                            ? 'bg-amber-500 text-black border-amber-500 shadow-md ring-2 ring-amber-500/30'
                                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                    }`}
                                    title="Filtrar pedidos por vencer hoy o en los próximos días"
                                >
                                    <span className="size-2 rounded-full bg-amber-500" />
                                    <span>Por Vencer</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTrafficLightFilter(trafficLightFilter === 'GREEN' ? 'ALL' : 'GREEN')}
                                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shadow-xs cursor-pointer ${
                                        trafficLightFilter === 'GREEN'
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
                                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                    }`}
                                    title="Filtrar pedidos a tiempo"
                                >
                                    <span className="size-2 rounded-full bg-emerald-500" />
                                    <span>A Tiempo</span>
                                </button>
                            </div>

                            {(activeFilter || searchQuery || trafficLightFilter !== 'ALL') && (
                                <button
                                    onClick={() => { setActiveFilter(null); setSearchQuery(''); setTrafficLightFilter('ALL'); }}
                                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all whitespace-nowrap cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[16px]">filter_list_off</span>
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {isSystemAdmin && viewMode === 'kanban' ? (
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
                    <OrdersTable orders={filteredOrders} activeFilter={activeFilter} onOrderDeleted={fetchBoard} onRefresh={fetchBoard} />
                </main>
            )}

            <AnimatePresence>
                {isModalOpen && !isJoyero && (
                    <NewOrderDrawer
                        onClose={() => {
                            setIsModalOpen(false);
                            const nextParams = new URLSearchParams(location.search);
                            nextParams.delete('newOrder');
                            nextParams.delete('clientName');
                            nextParams.delete('clientPhone');
                            nextParams.delete('ticketId');
                            nextParams.delete('ticketCode');
                            const searchStr = nextParams.toString() ? `?${nextParams.toString()}` : '';
                            navigate(`${location.pathname}${searchStr}`, { replace: true });
                        }}
                        onSave={handleCreateOrder}
                        clients={clients}
                        clientOptions={clients.map(c => c.name)}
                        onClientCreated={fetchClients}
                        initialClientName={prefillClientName}
                        initialClientPhone={prefillClientPhone}
                        ticketCode={prefillTicketCode}
                        orderType={orderType}
                        isJoyero={isJoyero}
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

const compressImageFile = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onerror = () => {
            resolve(''); // Graceful fallback on file reading error
        };
        reader.onload = (event) => {
            const resultStr = event.target?.result as string;
            const img = new Image();
            img.onerror = () => {
                // If canvas decode fails (e.g. unsupported image stream), resolve raw string
                resolve(resultStr || '');
            };
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }
                    canvas.width = Math.round(width);
                    canvas.height = Math.round(height);
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                } catch {
                    resolve(resultStr || '');
                }
            };
            img.src = resultStr;
        };
        reader.readAsDataURL(file);
    });
};

const NewOrderDrawer: React.FC<{
    onClose: () => void;
    onSave: (order: any) => void;
    clients: any[];
    clientOptions: string[];
    onClientCreated?: () => Promise<void> | void;
    initialClientName?: string;
    initialClientPhone?: string;
    ticketCode?: string;
    orderType?: string | null;
    isJoyero?: boolean;
}> = ({ onClose, onSave, clients, clientOptions, onClientCreated, initialClientName, initialClientPhone, ticketCode, orderType, isJoyero }) => {
    const [showQuickAddClient, setShowQuickAddClient] = useState(false);
    const [newClientData, setNewClientData] = useState({ name: '', phone: '', email: '' });
    const [searchMode, setSearchMode] = useState<'name' | 'phone'>('name');
    const [selectedClientInfo, setSelectedClientInfo] = useState<any>(null);
    const [phoneSearchValue, setPhoneSearchValue] = useState('');
    const [shouldPrintLabel, setShouldPrintLabel] = useState(false);
    const [assignableUsers, setAssignableUsers] = useState<any[]>([]);
    const [isClientHistoryOpen, setIsClientHistoryOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        UsersService.getAll().then((allUsers: any[]) => {
            const filtered = (allUsers || []).filter(u => {
                const r = String(u.role || '').toUpperCase();
                const n = String(u.name || '').toLowerCase();
                const e = String(u.email || '').toLowerCase();

                // Excluir específicamente rol o usuario system
                if (r === 'SYSTEM' || r === 'SYSTEM_ADMIN' || n.includes('system') || e.includes('system')) {
                    return false;
                }

                return (
                    r === 'JOYERO' ||
                    r === 'ADMIN' ||
                    r === 'TENANT_ADMIN' ||
                    r === 'DESIGNER' ||
                    r === 'DISENADOR' ||
                    r === 'DISEÑADOR' ||
                    n.includes('joyero') ||
                    n.includes('admin') ||
                    n.includes('diseña') ||
                    n.includes('disena') ||
                    n.includes('design') ||
                    e.includes('joyero') ||
                    e.includes('admin') ||
                    e.includes('diseña') ||
                    e.includes('disena') ||
                    e.includes('design')
                );
            });
            setAssignableUsers(filtered);
        }).catch(err => {
            console.error('Error fetching assignable users:', err);
        });
    }, []);

    const formatUserRole = (role?: string, name?: string, email?: string) => {
        const r = String(role || '').toUpperCase();
        const str = `${r} ${name || ''} ${email || ''}`.toLowerCase();
        if (r === 'JOYERO' || str.includes('joyero')) return 'Joyero';
        if (r === 'DESIGNER' || r === 'DISENADOR' || r === 'DISEÑADOR' || str.includes('diseña') || str.includes('disena') || str.includes('design')) return 'Diseñador';
        return 'Admin';
    };

    const [formData, setFormData] = useState<any>({
        client: '',
        value: '',
        cost: '',
        priority: 'Media',
        department: 'Taller Cared',
        assignedTo: '',
        promisedDate: '',
        notes: '',
        imageUrl: '',
        requiresDesign: orderType === 'DESIGN' || false,
    });

    useEffect(() => {
        if (initialClientName || initialClientPhone) {
            setFormData((prev: any) => ({ ...prev, client: initialClientName || '' }));
            if (initialClientPhone) {
                setPhoneSearchValue(initialClientPhone);
            }
            setSelectedClientInfo(null);
            setShowQuickAddClient(false);
            setNewClientData({
                name: initialClientName || '',
                phone: initialClientPhone || '',
                email: ''
            });
        }
    }, [initialClientName, initialClientPhone]);

    const [items, setItems] = useState<any[]>([
        { item: '', metal: 'Oro', color: 'Amarillo', karats: '10 K', weight: '', size: '', thickness: '', itemCode: '', notes: '', imageUrl: '' }
    ]);

    const handleItemChange = (index: number, field: string, value: string) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { item: '', metal: 'Oro', color: 'Amarillo', karats: '10 K', weight: '', size: '', thickness: '', itemCode: '', notes: '', imageUrl: '' }]);
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

    const executeSubmit = async (printLabel: boolean) => {
        if (isSubmitting) return;

        if (!formData.client?.trim()) {
            alert("El nombre del cliente es obligatorio para registrar el pedido.");
            return;
        }

        // Strict validation: Ensure all required fields for each item are filled
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.item?.trim()) {
                alert(`Por favor, selecciona o introduce la pieza #${i + 1}.`);
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
            // En Fabricación (MANUFACTURE) el peso es obligatorio.
            if (orderType === 'MANUFACTURE' && !item.weight?.trim()) {
                alert(`Por favor, introduce el peso para la pieza #${i + 1}.`);
                return;
            }
            // RF-01: Medida y grosor obligatorios en formularios de registro de órdenes
            if (!item.size || !item.size.trim()) {
                alert('La medida es obligatoria.');
                return;
            }
            if (!item.thickness || !item.thickness.trim()) {
                alert('El grosor es obligatorio.');
                return;
            }
        }

        if (!formData.promisedDate) {
            alert('Por favor, especifica la Fecha Compromiso de Entrega para poder guardar la orden.');
            return;
        }

        if (formData.value === undefined || formData.value === null || String(formData.value).trim() === '') {
            alert('El campo Mano de Obra es obligatorio.');
            return;
        }

        if (formData.cost === undefined || formData.cost === null || String(formData.cost).trim() === '') {
            alert('El campo Material es obligatorio.');
            return;
        }

        // Sync first item to top-level fields for backward compatibility
        const mainItem = items[0] || {};
        const requiresDesign = Boolean(formData.requiresDesign || orderType === 'DESIGN');
        const submissionData = {
            ...formData,
            requiresDesign,
            selectedClientId: selectedClientInfo?.id,
            clientPhone: selectedClientInfo?.phone || initialClientPhone || newClientData.phone,
            newClientPhone: newClientData.phone || initialClientPhone,
            newClientEmail: newClientData.email,
            ...mainItem,
            imageUrl: mainItem.imageUrl || formData.imageUrl || '',
            pieceType: mainItem.item,
            notes: formData.notes || '', // Independent order notes
            specifications: {
                items,
                requiresDesign,
                designStatus: requiresDesign ? 'PENDING_DESIGN' : undefined,
                assignedDesigner: requiresDesign ? (formData.assignedTo || undefined) : undefined,
                assignedJeweler: !requiresDesign ? (formData.assignedTo || undefined) : undefined,
            },
            shouldPrintLabel: printLabel
        };

        try {
            setIsSubmitting(true);
            await onSave(submissionData);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        executeSubmit(!isJoyero);
    };

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm cursor-pointer"
            />

            {/* Drawer */}
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 z-[70] w-full max-w-lg bg-background border-l border-border shadow-2xl flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden"
            >
                {/* Header */}
                <div className="p-5 sm:p-8 border-b border-border bg-muted/20 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <div className="size-10 rounded-xl bg-foreground text-background flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined">add_shopping_cart</span>
                        </div>
                        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-foreground text-xl font-black uppercase tracking-widest font-display">
                                {orderType === 'REPAIR' ? 'Nueva Reparación' : orderType === 'MANUFACTURE' ? 'Nueva Fabricación' : orderType === 'DESIGN' ? 'Nuevo Diseño' : orderType === 'LASER' ? 'Nuevo Láser' : 'Nuevo Pedido'}
                            </h2>
                            {ticketCode && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                    Turno {ticketCode}
                                </span>
                            )}
                        </div>
                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1.5">
                            {orderType === 'REPAIR' ? 'Alta Técnica de Reparación' : orderType === 'MANUFACTURE' ? 'Alta Técnica de Fabricación' : orderType === 'DESIGN' ? 'Alta Técnica de Diseño' : orderType === 'LASER' ? 'Alta Técnica de Grabado Láser' : 'Registro Técnico de Joyería'}
                        </p>
                    </div>
                </div>

                {/* Form Body */}
                <form id="new-order-form" noValidate className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 custom-scrollbar overscroll-contain" onSubmit={handleSubmit}>
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
                                            className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-base sm:text-xs text-foreground focus:border-indigo-500 outline-none transition-all"
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
                                                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-base sm:text-xs text-foreground focus:border-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-muted-foreground text-[9px] font-black uppercase tracking-wider">Correo (Opcional)</label>
                                            <input
                                                type="email"
                                                value={newClientData.email}
                                                onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
                                                placeholder="correo@ejemplo.com"
                                                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-base sm:text-xs text-foreground focus:border-indigo-500 outline-none transition-all"
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
                                    const cleanPhone = (initialClientPhone || phoneSearchValue || '').replace(/\D/g, '');
                                    const matchingClients = clients.filter(c => {
                                        const nameMatch = c.name && c.name.toLowerCase().includes(formData.client.toLowerCase());
                                        let phoneMatch = false;
                                        if (cleanPhone && c.phone) {
                                            const cClean = c.phone.replace(/\D/g, '');
                                            if (cClean.length >= 7 && cleanPhone.length >= 7 && (cClean.includes(cleanPhone) || cleanPhone.includes(cClean))) {
                                                phoneMatch = true;
                                            }
                                        }
                                        return nameMatch || phoneMatch;
                                    }).slice(0, 5);

                                    if (matchingClients.length === 0) {
                                        return (
                                            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2 animate-in fade-in duration-200">
                                                <p className="text-xs text-muted-foreground font-medium">
                                                    No se encontró ningún cliente registrado con el nombre <strong className="text-foreground">{formData.client}</strong>.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setNewClientData({
                                                            name: formData.client || initialClientName || '',
                                                            phone: initialClientPhone || phoneSearchValue || '',
                                                            email: ''
                                                        });
                                                        setShowQuickAddClient(true);
                                                    }}
                                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition active:scale-95 shadow-sm"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">person_add</span>
                                                    Dar de Alta como Nuevo Cliente
                                                </button>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest px-1">
                                                {matchingClients.length} cliente{matchingClients.length > 1 ? 's' : ''} sugerido{matchingClients.length > 1 ? 's' : ''} encontrado{matchingClients.length > 1 ? 's' : ''}
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
                                                        className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider px-3.5 py-2 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
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

                                    if (matchingClients.length === 0) {
                                        return (
                                            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2 animate-in fade-in duration-200">
                                                <p className="text-xs text-muted-foreground font-medium">
                                                    No se encontró ningún cliente registrado con el teléfono <strong className="text-foreground">{phoneSearchValue}</strong>.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setNewClientData({
                                                            name: '',
                                                            phone: phoneSearchValue,
                                                            email: ''
                                                        });
                                                        setShowQuickAddClient(true);
                                                    }}
                                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition active:scale-95 shadow-sm cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">person_add</span>
                                                    Dar de Alta como Nuevo Cliente
                                                </button>
                                            </div>
                                        );
                                    }

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
                                                        className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
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

                                        {/* Botón Historial de Reparaciones (RF-04) */}
                                        <button
                                            type="button"
                                            onClick={() => setIsClientHistoryOpen(true)}
                                            className="w-full mt-2 py-2 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-indigo-500/20 shadow-xs"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">history</span>
                                            <span>Consultar Historial de Reparaciones</span>
                                        </button>
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
                                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-base sm:text-xs text-foreground focus:border-indigo-500 outline-none transition-all"
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
                                                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-base sm:text-xs text-foreground focus:border-indigo-500 outline-none transition-all"
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
                                        <PieceSelect
                                            value={item.item}
                                            onChange={(val) => handleItemChange(index, 'item', val)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Metal</label>
                                        <SelectWithOther
                                            value={item.metal}
                                            onChange={(val) => handleItemChange(index, 'metal', val)}
                                            options={['Oro', 'Plata', 'Platino']}
                                            placeholder="Seleccionar metal..."
                                            otherPlaceholder="Especificar otro metal (ej. Titanio, Acero)..."
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Color</label>
                                        <SelectWithOther
                                            value={item.color}
                                            onChange={(val) => handleItemChange(index, 'color', val)}
                                            options={['Amarillo', 'Blanco', 'Rosa']}
                                            placeholder="Seleccionar color..."
                                            otherPlaceholder="Especificar otro color (ej. Bicolor, Negro)..."
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Quilates</label>
                                        <SelectWithOther
                                            value={item.karats}
                                            onChange={(val) => handleItemChange(index, 'karats', val)}
                                            options={['10 K', '14 K', '18 K', '21.6 K']}
                                            placeholder="Seleccionar quilates..."
                                            otherPlaceholder="Especificar otros quilates o ley (ej. 24 K, Ley 925)..."
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">
                                            Peso (Gr) {orderType === 'MANUFACTURE' && <span className="text-red-500 font-bold">*</span>}
                                        </label>
                                        <input
                                            value={item.weight}
                                            onChange={(e) => handleItemChange(index, 'weight', e.target.value)}
                                            onBlur={() => { if (item.weight && !item.weight.toUpperCase().endsWith('GR')) handleItemChange(index, 'weight', `${item.weight.trim()} GR`); }}
                                            className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-base sm:text-sm text-foreground focus:border-indigo-500 outline-none"
                                            placeholder="0.00"
                                            required={orderType === 'MANUFACTURE'}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">
                                            Medida <span className="text-red-500 font-bold">*</span>
                                        </label>
                                        <input
                                            value={item.size}
                                            onChange={(e) => handleItemChange(index, 'size', e.target.value)}
                                            onBlur={() => { if (item.size && !item.size.toUpperCase().endsWith('CM')) handleItemChange(index, 'size', `${item.size.trim()} CM`); }}
                                            className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-base sm:text-sm text-foreground focus:border-indigo-500 outline-none"
                                            placeholder="Ej. 7, 18cm"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">
                                            Grosor <span className="text-red-500 font-bold">*</span>
                                        </label>
                                        <input
                                            value={item.thickness || ''}
                                            onChange={(e) => handleItemChange(index, 'thickness', e.target.value)}
                                            onBlur={() => { if (item.thickness && !item.thickness.toUpperCase().endsWith('MM')) handleItemChange(index, 'thickness', `${item.thickness.trim()} MM`); }}
                                            className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-base sm:text-sm text-foreground focus:border-indigo-500 outline-none"
                                            placeholder="Ej. 2mm"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">SKU / Cód</label>
                                        <input
                                            value={item.itemCode}
                                            onChange={(e) => handleItemChange(index, 'itemCode', e.target.value)}
                                            className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-base sm:text-sm text-foreground focus:border-indigo-500 outline-none"
                                            placeholder="ABC-123"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Descripción del Trabajo / Servicio</label>
                                        <textarea
                                            value={item.description || item.notes || ''}
                                            onChange={(e) => {
                                                handleItemChange(index, 'notes', e.target.value);
                                                handleItemChange(index, 'description', e.target.value);
                                            }}
                                            className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-base sm:text-sm text-foreground focus:border-indigo-500 outline-none min-h-[80px] resize-none"
                                            placeholder="Soldar broche, ajuste de medida, grabado láser, pulido, etc."
                                        />
                                    </div>

                                    {/* Subir foto de la pieza: Cámara y Galería */}
                                    <div className="space-y-2 pt-1">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 flex items-center justify-between">
                                            <span>Fotografía de la Pieza</span>
                                            <span className="text-[9px] text-zinc-400 font-normal">Cámara o archivo</span>
                                        </label>

                                        <input
                                            type="file"
                                            id={`piece-camera-${index}`}
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    try {
                                                        const compressed = await compressImageFile(file);
                                                        handleItemChange(index, 'imageUrl', compressed);
                                                    } catch (err) {
                                                        console.error('Error compressing camera photo:', err);
                                                    }
                                                }
                                                e.target.value = '';
                                            }}
                                        />
                                        <input
                                            type="file"
                                            id={`piece-gallery-${index}`}
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    try {
                                                        const compressed = await compressImageFile(file);
                                                        handleItemChange(index, 'imageUrl', compressed);
                                                    } catch (err) {
                                                        console.error('Error compressing gallery photo:', err);
                                                    }
                                                }
                                                e.target.value = '';
                                            }}
                                        />

                                        {item.imageUrl ? (
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                                                <img
                                                    src={item.imageUrl}
                                                    alt="Preview de pieza"
                                                    className="size-16 object-cover rounded-lg border border-border shadow-sm shrink-0 bg-background"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-foreground truncate">Foto adjuntada</p>
                                                    <p className="text-[10px] text-muted-foreground">Lista para guardar en la orden</p>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => document.getElementById(`piece-camera-${index}`)?.click()}
                                                        title="Tomar otra foto"
                                                        className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
                                                    >
                                                        <span className="material-symbols-outlined text-base">photo_camera</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleItemChange(index, 'imageUrl', '')}
                                                        title="Eliminar foto"
                                                        className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all"
                                                    >
                                                        <span className="material-symbols-outlined text-base">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => document.getElementById(`piece-camera-${index}`)?.click()}
                                                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-border hover:border-indigo-500/50 bg-muted/30 hover:bg-muted/60 text-xs font-bold text-muted-foreground hover:text-foreground transition-all active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-base text-indigo-500">photo_camera</span>
                                                    <span>Cámara</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => document.getElementById(`piece-gallery-${index}`)?.click()}
                                                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-border hover:border-indigo-500/50 bg-muted/30 hover:bg-muted/60 text-xs font-bold text-muted-foreground hover:text-foreground transition-all active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-base text-purple-500">image</span>
                                                    <span>Galería</span>
                                                </button>
                                            </div>
                                        )}
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
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Departamento / Localización</label>
                                <SelectWithOther
                                    name="department"
                                    value={formData.department || 'Taller Cared'}
                                    onChange={(val) => setFormData(prev => ({ ...prev, department: val }))}
                                    options={['Taller Cared', 'Taller Fabiola', 'Relojero']}
                                    placeholder="Seleccionar departamento..."
                                    otherPlaceholder="Especificar otro departamento / localización..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 flex items-center justify-between">
                                    <span>Fecha Compromiso de Entrega</span>
                                    <span className="text-red-500 font-bold">* Obligatorio</span>
                                </label>
                                <input
                                    type="date"
                                    name="promisedDate"
                                    required
                                    value={formData.promisedDate || ''}
                                    onChange={handleChange}
                                    className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-base sm:text-sm text-foreground focus:border-indigo-500 outline-none min-h-[46px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Notas Generales del Pedido</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes || ''}
                                    onChange={handleChange}
                                    className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-base sm:text-sm text-foreground focus:border-indigo-500 outline-none min-h-[60px] resize-none"
                                    placeholder="Notas generales internas de la orden (opcional)..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 flex items-center justify-between">
                                    <span>Mano de Obra</span>
                                    <span className="text-red-500 font-bold">* Obligatorio</span>
                                </label>
                                <input
                                    name="value"
                                    required
                                    value={formData.value}
                                    onChange={handleChange}
                                    className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-base sm:text-sm text-foreground focus:border-indigo-500 transition-all outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 flex items-center justify-between">
                                    <span>Material</span>
                                    <span className="text-red-500 font-bold">* Obligatorio</span>
                                </label>
                                <input
                                    name="cost"
                                    required
                                    value={formData.cost}
                                    onChange={handleChange}
                                    className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-base sm:text-sm text-foreground focus:border-indigo-500 transition-all outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Asignar a</label>
                                <div className="relative">
                                    <select
                                        name="assignedTo"
                                        value={formData.assignedTo || ''}
                                        onChange={handleChange as any}
                                        className="w-full bg-muted/50 border border-border rounded-xl py-3 px-4 text-base sm:text-sm text-foreground focus:border-indigo-500 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Sin asignar / Pendiente</option>
                                        {assignableUsers.map(u => (
                                            <option key={u.id} value={u.name || u.email}>
                                                {u.name || u.email} ({formatUserRole(u.role, u.name, u.email)})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-muted-foreground">
                                        <span className="material-symbols-outlined text-base">unfold_more</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1">Prioridad del Joyero</label>
                                <SelectWithOther
                                    name="priority"
                                    value={formData.priority || 'Media'}
                                    onChange={(val) => setFormData(prev => ({ ...prev, priority: val }))}
                                    options={['Baja', 'Media', 'Alta']}
                                    placeholder="Seleccionar prioridad..."
                                    otherPlaceholder="Especificar otra prioridad..."
                                />
                            </div>

                            {/* Requiere etapa de Diseño (RF-05) */}
                            <div className="p-3.5 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 flex items-center justify-between gap-3 shadow-xs">
                                <div className="flex items-center gap-2.5">
                                    <div className="size-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-[18px]">palette</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider text-foreground">Requiere etapa de Diseño</p>
                                        <p className="text-[10px] text-muted-foreground">La orden pasará primero al Diseñador antes de asignarse al Joyero</p>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.requiresDesign || false}
                                    onChange={(e) => setFormData(prev => ({ ...prev, requiresDesign: e.target.checked }))}
                                    className="size-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="p-4 sm:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-border bg-muted/20 grid grid-cols-2 gap-4 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="py-3.5 sm:py-4 rounded-xl text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    {/* Un solo botón: ventas/admin registran e imprimen la etiqueta; el joyero solo registra */}
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                            executeSubmit(!isJoyero);
                        }}
                        className="py-3.5 sm:py-4 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:opacity-90 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                <span>Guardando...</span>
                            </>
                        ) : (
                            <>
                                {!isJoyero && <span className="material-symbols-outlined text-[16px]">print</span>}
                                <span>
                                    {isJoyero
                                        ? (orderType === 'REPAIR' ? 'Registrar Reparación' : orderType === 'MANUFACTURE' ? 'Registrar Fabricación' : orderType === 'DESIGN' ? 'Registrar Diseño' : orderType === 'LASER' ? 'Registrar Láser' : 'Crear Pedido')
                                        : 'Registrar e Imprimir'}
                                </span>
                            </>
                        )}
                    </button>
                </div>
            </motion.div>

            {/* Modal de Historial del Cliente desde Nueva Orden (RF-04) */}
            <ClientHistoryModal
                isOpen={isClientHistoryOpen}
                onClose={() => setIsClientHistoryOpen(false)}
                clientId={selectedClientInfo?.id}
                clientName={selectedClientInfo?.name || formData.client}
            />
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
                }`}>{getStatusLabel(statusLabel || status || '')}</span>
            {progress && (
                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-foreground block" style={{ width: `${progress}%` }}></div>
                </div>
            )}
        </div>
    </div>
);

export default Orders;
