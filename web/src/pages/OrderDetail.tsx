import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { OrdersService } from '../services/orders.service';
import { OrderType } from '../types';
import { RepairPanel } from '../components/orders/RepairPanel';
import { ManufacturePanel } from '../components/orders/ManufacturePanel';
import { PaymentModal } from '../components/orders/PaymentModal';
import { EditOrderModal } from '../components/orders/EditOrderModal';
import { RepairPrintView } from '../components/orders/RepairPrintView';
import { LabelPrintModal } from '../components/orders/LabelPrintModal';
import { getStatusLabel, formatOrderCode } from './Orders';
import { RBACService } from '../services/rbac.service';

const OrderDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const user = RBACService.getCurrentUser();
    const [order, setOrder] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
    const [isLabelPrintOpen, setIsLabelPrintOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(2);
    const [notesBuffer, setNotesBuffer] = useState('');
    const [activities, setActivities] = useState<any[]>([]);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const envelopeFileInputRef = React.useRef<HTMLInputElement>(null);

    const parseValue = (val: any) => {
        if (typeof val === 'number') return val;
        return parseFloat(String(val || '0').replace(/[^0-9.-]/g, '')) || 0;
    };

    const enrichOrder = (foundOrder: any) => {
        const clientName = foundOrder.client?.name || 'Cliente';
        const total = parseFloat(String(foundOrder.totalAmount || foundOrder.value || '0')) || 0;
        const paid = parseFloat(String(foundOrder.paidAmount || '0')) || 0;
        const balance = total - paid;

        const orderCode = foundOrder.orderCode || formatOrderCode(foundOrder);

        const items = foundOrder.specifications?.items;
        const totalItemsLabor = Array.isArray(items) ? items.reduce((acc: number, it: any) => acc + (parseFloat(it.laborCost) || 0), 0) : 0;
        const totalItemsCommission = Array.isArray(items) ? items.reduce((acc: number, it: any) => acc + (parseFloat(it.commission) || 0), 0) : 0;

        const laborCost = foundOrder.laborCost !== undefined && foundOrder.laborCost !== null && foundOrder.laborCost !== ''
            ? parseFloat(String(foundOrder.laborCost))
            : (totalItemsLabor || parseFloat(String(foundOrder.specifications?.laborCost || foundOrder.value || '0')) || 0);
        const commission = foundOrder.commission !== undefined && foundOrder.commission !== null && foundOrder.commission !== ''
            ? parseFloat(String(foundOrder.commission))
            : (totalItemsCommission || parseFloat(String(foundOrder.specifications?.commission || '0')) || 0);

        return {
            ...foundOrder,
            orderCode: orderCode,
            clientName: clientName,
            totalAmount: total,
            paidAmount: paid,
            balance: balance,
            laborCost: laborCost,
            commission: commission,
            initials: clientName.substring(0, 2).toUpperCase() || 'CX',
            initialsColor: 'bg-muted text-muted-foreground',
            date: foundOrder.createdAt ? new Date(foundOrder.createdAt).toLocaleDateString('es-MX', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }) : 'N/A',
            statusLabel: getStatusLabel(foundOrder.status || foundOrder.orderStatus || ''),
            statusType: foundOrder.priority === 'ALTA' ? 'urgent' : 'normal',
            pendingAmount: `${balance.toLocaleString()} MXN`,
            paidAmountFormatted: `${paid.toLocaleString()} MXN`,
            paymentProgress: total > 0 ? (paid / total) * 100 : 0
        };
    };

    // ... useEffect ...

    const handleRegisterPayment = async (amount: number, method: string) => {
        if (!order) return;
        try {
            await OrdersService.registerPayment(order.id, amount, method);
            // Refresh order
            const updatedOrder = await OrdersService.getOrder(order.id);
            setOrder(enrichOrder(updatedOrder));

            setActivities(prev => [{
                user: "Tú",
                action: "registraste un pago de",
                target: `${amount.toLocaleString()} MXN`,
                time: "Ahora mismo",
                dotColor: "bg-emerald-500"
            }, ...prev]);
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const handleDeletePayment = async (paymentId: string, amount: number) => {
        if (!order) return;
        if (!confirm('¿Estás seguro de que deseas eliminar este pago?')) return;

        try {
            await OrdersService.deletePayment(paymentId);
            // Refresh order
            const updatedOrder = await OrdersService.getOrder(order.id);
            setOrder(enrichOrder(updatedOrder));

            setActivities(prev => [{
                user: "Tú",
                action: "eliminaste un pago de",
                target: `${amount.toLocaleString()} MXN`,
                time: "Ahora mismo",
                dotColor: "bg-red-500"
            }, ...prev]);
        } catch (error) {
            console.error(error);
            alert('Error al eliminar el pago');
        }
    };

    const handleGenerateAIImage = async () => {
        if (!id) return;
        setIsGeneratingImage(true);
        try {
            const updatedOrder = await OrdersService.generateImage(id);
            setOrder(prev => ({ ...prev, imageUrl: updatedOrder.imageUrl }));

            setActivities(prev => [{
                user: "IA",
                action: "generó una imagen para el pedido",
                target: "",
                time: "Ahora mismo",
                dotColor: "bg-purple-500"
            }, ...prev]);
        } catch (error) {
            console.error(error);
            alert('Error al generar imagen con IA');
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            try {
                await OrdersService.updateOrder(id, { imageUrl: base64String });
                setOrder(prev => ({ ...prev, imageUrl: base64String }));

                setActivities(prev => [{
                    user: "Tú",
                    action: "subiste una foto del pedido",
                    target: "",
                    time: "Ahora mismo",
                    dotColor: "bg-indigo-500"
                }, ...prev]);
            } catch (error) {
                console.error(error);
                alert('Error al subir la imagen');
            }
        };
        reader.readAsDataURL(file);
    };

    const handleEnvelopeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        // Image compression before upload
        const compressImage = (file: File): Promise<string> => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 1200;
                        const MAX_HEIGHT = 1200;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality
                    };
                    img.src = event.target?.result as string;
                };
                reader.readAsDataURL(file);
            });
        };

        try {
            const compressedBase64 = await compressImage(file);
            const currentImages = order.specifications?.envelopeImages || [];
            const updatedSpecs = {
                ...order.specifications,
                envelopeImages: [...currentImages, compressedBase64]
            };

            console.log("Uploading envelope image, size:", Math.round(compressedBase64.length / 1024), "KB");
            await OrdersService.updateOrder(id, { specifications: updatedSpecs });

            // Re-fetch to ensure sync with server
            const freshOrder = await OrdersService.getOrder(id);
            if (freshOrder) {
                setOrder(enrichOrder(freshOrder));
            }

            setActivities(prev => [{
                user: "Tú",
                action: "agregaste una foto del sobre",
                target: "",
                time: "Ahora mismo",
                dotColor: "bg-amber-500"
            }, ...prev]);
        } catch (error: any) {
            console.error("Envelope upload error:", error);
            const message = error.response?.status === 413
                ? 'La imagen es demasiado grande. Intenta con una más pequeña.'
                : 'Error al subir la foto del sobre. Verifica la consola.';
            alert(message);
        }
    };

    const handleRemoveEnvelopeImage = async (index: number) => {
        if (!id || !order) return;
        try {
            const currentImages = order.specifications?.envelopeImages || [];
            const newImages = currentImages.filter((_: any, i: number) => i !== index);
            const updatedSpecs = {
                ...order.specifications,
                envelopeImages: newImages
            };
            await OrdersService.updateOrder(id, { specifications: updatedSpecs });
            setOrder(prev => ({ ...prev, specifications: updatedSpecs }));
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        const fetchOrder = async () => {
            if (id) {
                setIsLoading(true);
                try {
                    const foundOrder = await OrdersService.getOrder(id);
                    if (foundOrder) {
                        setOrder(enrichOrder(foundOrder));
                        setNotesBuffer(foundOrder.notes || '');

                        // Synthesize Activities
                        const acts: any[] = [];

                        // 1. Creation
                        const creatorName = foundOrder.createdBy?.name || foundOrder.specifications?.receivedBy || foundOrder.specifications?.createdByName || "Sistema";
                        acts.push({
                            user: creatorName,
                            action: "recibió / creó el pedido",
                            target: "",
                            time: new Date(foundOrder.createdAt).toLocaleString(),
                            dotColor: "bg-muted-foreground/30"
                        });

                        // 2. Payments
                        if (foundOrder.payments) {
                            foundOrder.payments.forEach((p: any) => {
                                acts.push({
                                    user: "Tú",
                                    action: "registraste un pago de",
                                    target: `${Number(p.amount).toLocaleString()} MXN`,
                                    time: new Date(p.recordedAt).toLocaleString(),
                                    dotColor: "bg-emerald-500"
                                });
                            });
                        }

                        // 3. Status changes (synthetic if only one history entry)
                        acts.push({
                            user: "Tú",
                            action: "actualizaste el estado a",
                            target: getStatusLabel(foundOrder.status || foundOrder.orderStatus),
                            time: foundOrder.updatedAt ? new Date(foundOrder.updatedAt).toLocaleString() : 'Hoy',
                            dotColor: "bg-indigo-500"
                        });

                        setActivities(acts.reverse()); // Newest first
                    } else {
                        setOrder(null);
                    }
                } catch (error) {
                    console.error("Failed to fetch order", error);
                    setOrder(null);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchOrder();
    }, [id]);

    const handleAdvanceStatus = async () => {
        if (!id) return;
        try {
            await OrdersService.advanceStatus(id);
            const fresh = await OrdersService.getOrder(id);
            if (fresh) {
                setOrder(enrichOrder(fresh));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveDetails = async (data: any) => {
        if (!id) return;
        try {
            // Optimistic update for immediate visual feedback on iPad
            if (data.status || data.stage) {
                setOrder((prev: any) => prev ? {
                    ...prev,
                    status: data.status || prev.status,
                    orderStatus: data.status || prev.orderStatus,
                    stage: data.stage || prev.stage,
                    statusLabel: getStatusLabel(data.status || data.stage || prev.status)
                } : prev);
            }

            await OrdersService.updateOrder(id, data);
            const fresh = await OrdersService.getOrder(id);
            if (fresh) {
                setOrder(enrichOrder(fresh));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteOrder = async () => {
        if (!id) return;
        if (!window.confirm("¿Estás completamente seguro de eliminar esta orden? Esta acción no se puede deshacer y borrará todos los pagos asociados.")) {
            return;
        }
        try {
            await OrdersService.deleteOrder(id);
            alert("Pedido eliminado exitosamente.");
            window.location.href = "/orders";
        } catch (error) {
            console.error(error);
            alert("Error al eliminar el pedido.");
        }
    };

    const isAuthorized = 
        user.role === 'SYSTEM_ADMIN' || 
        user.role === 'TENANT_ADMIN' || 
        user.role === 'ADMIN' || 
        user.role === 'SUPER_ADMIN' ||
        user.role === 'SYSTEM' ||
        String(user.email || '').toLowerCase().includes('system');

    const handleStepChange = async (index: number) => {
        if (index === currentStep) return;

        // Regla: No ir hacia atrás si no es admin
        if (!isAuthorized && index < currentStep) {
            alert("No está permitido retroceder el estado del flujo de trabajo.");
            return;
        }

        const stepStatus = STEPS[index].status;
        try {
            setCurrentStep(index);
            await OrdersService.updateOrder(id!, { stage: stepStatus });
            const fresh = await OrdersService.getOrder(id!);
            if (fresh) {
                setOrder(enrichOrder(fresh));
            }
            setActivities(prev => [{
                user: "Tú",
                action: "moviste el estado a",
                target: STEPS[index].name,
                time: "Hace un momento",
                dotColor: "bg-emerald-500"
            }, ...prev]);
        } catch (error) {
            console.error(error);
            alert("Error al actualizar la fase de producción.");
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center p-20 min-h-[400px]">
                <div className="flex items-center gap-3 text-zinc-400 dark:text-zinc-500 text-xs font-black uppercase tracking-widest animate-pulse">
                    <span className="material-symbols-outlined animate-spin text-[22px] text-indigo-500">sync</span>
                    <span>Cargando detalle del pedido...</span>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-20 min-h-[400px] text-center">
                <span className="material-symbols-outlined text-[48px] text-zinc-300 dark:text-zinc-600 mb-3">search_off</span>
                <p className="text-zinc-400 text-xs font-black uppercase tracking-widest">Pedido no encontrado</p>
                <Link to="/orders" className="mt-4 px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500 text-indigo-600 hover:text-white border border-indigo-500/20 font-bold text-xs uppercase tracking-wider transition-all">
                    Volver al listado de pedidos
                </Link>
            </div>
        );
    }

    const updateField = async (field: string, value: any) => {
        if (!order) return;
        try {
            // Map UI field names to API field names if needed
            const apiField = field === 'item' ? 'pieceType' : field;

            // For numbers
            let processedValue = value;
            if (field === 'value' || field === 'cost' || field === 'laborCost' || field === 'materialCost' || field === 'totalAmount' || field === 'commission') {
                const str = String(value || '0').replace(/[^0-9.-]/g, '');
                processedValue = parseFloat(str) || 0;
            }

            if (field === 'commission') {
                await OrdersService.updateOrder(order.id, {
                    specifications: {
                        ...order.specifications,
                        commission: processedValue
                    }
                });
            } else {
                await OrdersService.updateOrder(order.id, { [apiField]: processedValue });
            }

            // Re-fetch to get recalculated values (totalAmount, balance, etc.)
            const updated = await OrdersService.getOrder(order.id);
            if (updated) {
                setOrder(enrichOrder(updated));
            }
        } catch (error) {
            console.error("Failed to update field", error);
        }
    };

    const isJoyero = RBACService.getEffectiveRole(user) === 'JOYERO';
    const canViewPayments = !isJoyero && RBACService.hasPermission('view_payments', user);
    const canRegisterPayments = !isJoyero && RBACService.hasPermission('register_payments', user);
    const canViewLaborCost = RBACService.hasPermission('view_labor_cost', user);
    const canViewCostsMargins = RBACService.hasPermission('view_costs_margins', user);
    const canViewClientContact = !isJoyero && RBACService.hasPermission('view_client_contact', user);
    const canViewEnvelope = RBACService.hasPermission('view_envelope_photos', user);

    const statusUpper = String(order.status || order.orderStatus || '').toUpperCase();
    const stageUpper = String(order.stage || '').toUpperCase();
    const isReceived = (!statusUpper || statusUpper === 'RECEIVED' || statusUpper === 'RECIBIDO' || statusUpper === 'DRAFT' || statusUpper === 'SPEC_PENDING') &&
                       (!stageUpper || stageUpper === 'RECEIVED' || stageUpper === 'RECIBIDO' || stageUpper === 'INTERES_LEAD');
    const canModifyOrderDetails = isAuthorized || (!isJoyero && RBACService.hasPermission('modify_order_details', user) && isReceived);

    const fmtDate = (d: any, withTime = false) => new Date(d).toLocaleDateString('es-MX', {
        timeZone: 'America/Hermosillo', day: '2-digit', month: '2-digit', year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
    });
    const receivedByLabel = order.createdBy?.name || order.specifications?.receivedBy || order.specifications?.createdByName || '—';
    const promisedLabel = order.promisedAt
        ? fmtDate(order.promisedAt)
        : (order.specifications?.promisedDate || (order.dueDate ? fmtDate(order.dueDate) : 'Sin fecha'));
    const isWorkshopOrder = order.type === OrderType.REPAIR || order.type === OrderType.MANUFACTURE || order.type === 'MANUFACTURE';
    const isFinishedStatus = ['DELIVERED', 'REPAIR_COMPLETED', 'READY_FOR_PICKUP'].includes(order.status);
    const readyByLabel = order.specifications?.readyByName || order.specifications?.readyBy?.name || order.readyByName || order.completedByName
        || (isFinishedStatus && isWorkshopOrder ? 'Joyero' : null);
    const isDelivered = !!(order.deliveredAt || order.status === 'DELIVERED' || order.status === 'ENTREGADO' || order.stage === 'ENTREGADO_POSTVENTA');
    const deliveredLabel = order.deliveredAt
        ? fmtDate(order.deliveredAt, true)
        : (order.updatedAt ? fmtDate(order.updatedAt, true) : 'Registrado');
    const priorityKey = (order.priority || 'MEDIA').toUpperCase();
    const statusTone = order.statusType === 'urgent'
        ? 'text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10'
        : order.statusType === 'success'
            ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
            : 'text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
    const canMarkReady = isWorkshopOrder && !isFinishedStatus;
    const headerBtn = 'inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95';
    const headerBtnNeutral = `${headerBtn} bg-card border-border text-muted-foreground hover:text-foreground hover:border-indigo-500/50 shadow-sm`;

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Breadcrumbs & Header */}
            <header className="mb-8">
                <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-5">
                    <Link to="/dashboard" className="hover:text-foreground transition-colors">Inicio</Link>
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">chevron_right</span>
                    <Link to="/orders" className="hover:text-foreground transition-colors">Pedidos</Link>
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">chevron_right</span>
                    <span aria-current="page" className="text-foreground/70">Pedido #{order.orderCode || formatOrderCode(order)}</span>
                </nav>

                <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start gap-6">
                    <div className="space-y-5 min-w-0">
                        {/* Title row: code + status + priority */}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                            <h1 className="text-foreground text-4xl sm:text-5xl font-black tracking-tighter font-display">Pedido #{order.orderCode || formatOrderCode(order)}</h1>
                            <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 border text-[11px] font-black uppercase tracking-widest rounded-full ${statusTone}`}>
                                <span className="size-1.5 rounded-full bg-current" aria-hidden="true"></span>
                                {order.statusLabel || order.status}
                            </span>
                            <label className="sr-only" htmlFor="order-priority">Prioridad del pedido</label>
                            <select
                                id="order-priority"
                                value={priorityKey}
                                disabled={!canModifyOrderDetails}
                                onChange={async (e) => {
                                    await handleSaveDetails({ priority: e.target.value });
                                }}
                                className={`min-h-9 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                                    !canModifyOrderDetails ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                                } ${
                                    priorityKey === 'ALTA'
                                        ? 'bg-amber-400 text-black border-amber-500 shadow-md'
                                        : priorityKey === 'MEDIA'
                                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                                        : 'bg-muted text-muted-foreground border-border font-medium'
                                }`}
                                title={canModifyOrderDetails ? "Haz clic para modificar la prioridad del pedido" : "Solo modificable en estado Recibido o por Administrador"}
                            >
                                <option value="BAJA" className="bg-background text-foreground">! BAJA</option>
                                <option value="MEDIA" className="bg-background text-foreground">! MEDIA</option>
                                <option value="ALTA" className="bg-background font-bold text-amber-500">! ALTA ⚡</option>
                            </select>
                        </div>

                        {/* Key facts: label over value, delivery date emphasised */}
                        <dl className="flex flex-wrap items-stretch gap-x-8 gap-y-4">
                            <MetaItem icon="person" label="Recibió" value={receivedByLabel} />
                            <MetaItem icon="history" label="Recibido" value={order.date} />
                            <MetaItem icon="store" label="Depto" value={order.specifications?.department || order.department || 'CARED'} />
                            <MetaItem icon="event" label="Entrega" value={promisedLabel} tone="emerald" />
                            {readyByLabel && <MetaItem icon="verified" label="Listo por" value={readyByLabel} tone="indigo" />}
                            {isDelivered && <MetaItem icon="local_shipping" label="Entregado" value={deliveredLabel} tone="emerald" />}
                        </dl>
                    </div>

                    {/* Actions: one primary, neutral secondary, danger separated */}
                    <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                        {canMarkReady && (
                            <button
                                onClick={() => handleSaveDetails({ status: (order.type === OrderType.MANUFACTURE || order.type === 'MANUFACTURE') ? 'READY_FOR_PICKUP' : 'REPAIR_COMPLETED' })}
                                className={`${headerBtn} bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-md`}
                            >
                                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">verified</span>
                                <span>Listo para Entrega</span>
                            </button>
                        )}
                        {!isJoyero && canModifyOrderDetails && (
                            <button onClick={() => setIsEditModalOpen(true)} className={headerBtnNeutral}>
                                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">edit</span>
                                <span>Editar</span>
                            </button>
                        )}
                        {!isJoyero && (
                            <button onClick={() => setIsLabelPrintOpen(true)} className={headerBtnNeutral}>
                                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">sell</span>
                                <span>Etiqueta</span>
                            </button>
                        )}
                        <button onClick={() => setIsPrintViewOpen(true)} className={headerBtnNeutral}>
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">mail</span>
                            <span>Ver Sobre</span>
                        </button>
                        {isAuthorized && (
                            <>
                                <span className="hidden sm:block h-8 w-px bg-border" aria-hidden="true"></span>
                                <button
                                    onClick={handleDeleteOrder}
                                    aria-label="Borrar pedido"
                                    title="Borrar pedido"
                                    className={`${headerBtn} bg-transparent border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10`}
                                >
                                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">delete</span>
                                    <span className="hidden 2xl:inline">Borrar</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* 1. Información del Cliente (Maestro de la Orden) */}
            <section className="bg-card border border-border rounded-[36px] p-6 sm:p-8 backdrop-blur-sm shadow-sm transition-colors mb-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        {order.avatar ? (
                            <img src={order.avatar} className="size-20 rounded-3xl object-cover border border-border shadow-md" alt="Client" />
                        ) : (
                            <div className={`size-20 rounded-3xl flex items-center justify-center text-xl font-black border border-border shadow-md transition-colors ${order.initialsColor}`}>
                                {order.initials}
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    Cliente / Titular
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    {order.client?.status || 'Activo'}
                                </span>
                            </div>
                            <h2 className="text-foreground text-2xl sm:text-3xl font-black tracking-tight font-display transition-colors">
                                {order.clientName}
                            </h2>
                            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
                                {order.client?.phone && (
                                    <span className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px] text-foreground">call</span>
                                        {order.client.phone}
                                    </span>
                                )}
                                {order.client?.email && (
                                    <span className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px] text-foreground">mail</span>
                                        {order.client.email}
                                    </span>
                                )}
                                <span className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-foreground">location_on</span>
                                    {order.client?.location || 'México'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Mano de Obra y Comisión de la orden (aplica para toda la orden) + Acciones del Cliente */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full lg:w-auto justify-between lg:justify-end">
                        {canViewLaborCost && (
                            <div className="flex items-center gap-6 bg-muted/40 border border-border rounded-2xl px-6 py-3.5 shadow-sm">
                                <div className="text-left sm:text-right">
                                    <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest block mb-0.5">Mano de Obra</span>
                                    <span className="text-foreground text-xl sm:text-2xl font-black tracking-tight font-display">
                                        {(order.laborCost && Number(order.laborCost) > 0)
                                            ? `${Number(order.laborCost).toLocaleString()} MXN`
                                            : (order.value && Number(order.value) > 0 ? `${Number(order.value).toLocaleString()} MXN` : '—')}
                                    </span>
                                </div>
                                {(order.commission !== undefined && order.commission !== null) && (
                                    <div className="text-left sm:text-right border-l border-border pl-6">
                                        <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest block mb-0.5">Comisión</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 text-xl sm:text-2xl font-black tracking-tight font-display">
                                            {Number(order.commission || 0).toLocaleString()} MXN
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {canViewClientContact && (
                            <div className="flex flex-wrap items-center gap-3">
                                {order.client?.phone && (
                                    <a
                                        href={`https://wa.me/${String(order.client.phone).replace(/[^0-9]/g, '')}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">chat</span>
                                        <span>WhatsApp</span>
                                    </a>
                                )}
                                {order.client?.phone && (
                                    <a
                                        href={`tel:${order.client.phone}`}
                                        className="flex items-center gap-2 bg-muted border border-border rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-indigo-500/50 transition-all shadow-sm"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">call</span>
                                        <span>Llamar</span>
                                    </a>
                                )}
                                <Link
                                    to={`/clients?search=${encodeURIComponent(order.clientName)}`}
                                    className="flex items-center gap-2 bg-foreground text-background rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-sm"
                                >
                                    <span>Ver Perfil</span>
                                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* 2. Detalle de Piezas (El Detalle de la Orden) */}
            <section className="bg-card border border-border rounded-[36px] p-8 sm:p-10 backdrop-blur-sm shadow-sm transition-colors mb-10">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <span className="material-symbols-outlined text-[28px]">diamond</span>
                        </div>
                        <div>
                            <h3 className="text-foreground text-base sm:text-lg font-black uppercase tracking-wider transition-colors">Detalle de Piezas del Pedido</h3>
                            <p className="text-muted-foreground text-xs font-medium tracking-wide">Renglones y especificaciones técnicas de la orden</p>
                        </div>
                    </div>
                    <span className="text-muted-foreground text-xs font-black uppercase tracking-widest bg-muted px-4 py-2 rounded-2xl border border-border transition-colors">
                        {(order.specifications?.items?.length || 1)} {(order.specifications?.items?.length || 1) > 1 ? 'Piezas' : 'Pieza'}
                    </span>
                </div>

                <div className="space-y-6">
                    {(order.specifications?.items || [{
                        item: order.pieceType || order.item || (order.type === OrderType.REPAIR ? 'Reparación de Joya' : 'Pieza de Joyería'),
                        metal: order.metal || order.specifications?.metal,
                        color: order.color || order.specifications?.color,
                        karats: order.karats || order.specifications?.karats,
                        weight: order.weight || order.specifications?.weight,
                        size: order.size || order.specifications?.size,
                        thickness: order.thickness || order.specifications?.thickness,
                        itemCode: order.itemCode || order.specifications?.itemCode,
                        laborCost: order.laborCost || order.specifications?.laborCost,
                        commission: order.commission || order.specifications?.commission,
                        materialCost: order.materialCost || order.specifications?.materialCost,
                        description: order.description || order.specifications?.diagnosis || order.specifications?.description || order.notes
                    }]).map((piece: any, idx: number) => {
                        const formatSpecVal = (v: any, suffix: string) => {
                            if (!v && v !== 0) return undefined;
                            const str = String(v).trim();
                            if (str.toLowerCase().includes(suffix.toLowerCase().trim())) return str;
                            return `${str} ${suffix}`;
                        };

                        return (
                            <div key={idx} className="bg-muted/30 hover:bg-muted/50 border border-border rounded-[28px] p-6 sm:p-8 transition-all shadow-sm">
                                <div className="flex flex-col xl:flex-row items-start xl:items-center gap-8">
                                    {/* Thumbnail & Image actions */}
                                    <div className="size-36 sm:size-44 rounded-3xl bg-muted border border-border flex-shrink-0 overflow-hidden relative group/img transition-colors shadow-inner">
                                        {order.imageUrl ? (
                                            <img src={order.imageUrl} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700" alt="Pieza" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                                <span className="material-symbols-outlined text-muted-foreground/30 text-5xl">image</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Sin foto</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 group-focus-within/img:opacity-100 [@media(hover:none)]:opacity-100 [@media(hover:none)]:bg-black/40 transition-all flex flex-col items-center justify-end sm:justify-center gap-2.5 backdrop-blur-sm p-3">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all shadow-md"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">upload</span> Subir Foto
                                            </button>
                                            <button
                                                onClick={handleGenerateAIImage}
                                                disabled={isGeneratingImage}
                                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-md"
                                            >
                                                <span className={`material-symbols-outlined text-[16px] ${isGeneratingImage ? 'animate-spin' : ''}`}>{isGeneratingImage ? 'sync' : 'auto_awesome'}</span> Generar IA
                                            </button>
                                        </div>
                                    </div>

                                    {/* Main Technical Specs (Horizontal) */}
                                    <div className="flex-1 min-w-0 space-y-4 w-full">
                                        <div className="flex flex-wrap items-center gap-3.5">
                                            <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                                Pieza #{idx + 1}
                                            </span>
                                            <h4 className="text-foreground text-xl sm:text-2xl font-black uppercase tracking-tight truncate font-display">
                                                {piece.item || (order.type === OrderType.REPAIR ? 'Reparación de Joya' : 'Pieza de Joyería')}
                                            </h4>
                                            {piece.itemCode && (
                                                <span className="text-muted-foreground text-xs font-mono font-bold bg-muted px-2.5 py-1 rounded-lg border border-border">
                                                    {piece.itemCode}
                                                </span>
                                            )}
                                        </div>

                                        {/* Horizontal Specs Badges */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                            <SpecBadge label="Metal" value={piece.metal} />
                                            <SpecBadge label="Color" value={piece.color} />
                                            <SpecBadge label="Kilataje" value={piece.karats} />
                                            <SpecBadge label="Peso" value={formatSpecVal(piece.weight, 'gr')} />
                                            <SpecBadge label="Medida" value={formatSpecVal(piece.size, 'cm')} />
                                            <SpecBadge label="Grosor" value={formatSpecVal(piece.thickness, 'mm')} />
                                        </div>

                                        {/* Description / Work / Diagnosis */}
                                        {(() => {
                                            const pieceDescription = 
                                                piece.description || 
                                                piece.notes || 
                                                piece.trabajo || 
                                                piece.work || 
                                                order.specifications?.diagnosis || 
                                                order.description || 
                                                ((!order.specifications?.items || order.specifications.items.length <= 1 || idx === 0) ? order.notes : '');

                                            return (
                                                <div className="text-xs sm:text-sm font-medium leading-relaxed bg-muted/60 p-4 sm:p-5 rounded-2xl border border-border/80 text-foreground space-y-1.5 shadow-inner">
                                                    <div>
                                                        <span className="text-muted-foreground text-[10px] font-black uppercase tracking-wider mr-2">Trabajo:</span>
                                                        <span className={pieceDescription ? "font-bold text-foreground" : "italic text-muted-foreground"}>
                                                            {pieceDescription || "Sin descripción de trabajo especificada"}
                                                        </span>
                                                    </div>
                                                    {order.specifications?.diagnosis && order.specifications?.diagnosis !== pieceDescription && (
                                                        <div>
                                                            <span className="text-muted-foreground text-[10px] font-black uppercase tracking-wider mr-2">Diagnóstico:</span>
                                                            {order.specifications.diagnosis}
                                                        </div>
                                                    )}
                                                    {order.specifications?.partsNeeded && (
                                                        <div>
                                                            <span className="text-muted-foreground text-[10px] font-black uppercase tracking-wider mr-2">Refacciones:</span>
                                                            {order.specifications.partsNeeded}
                                                        </div>
                                                    )}
                                                    {!isJoyero && piece.materialCost && (
                                                        <div>
                                                            <span className="text-muted-foreground text-[10px] font-black uppercase tracking-wider mr-2">Costo Material:</span>
                                                            <span className="font-bold text-foreground">{Number(piece.materialCost).toLocaleString()} MXN</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Dynamic Operational Panel - Only for System & Admin */}
            {isAuthorized && (
                <div className="space-y-10 mb-10">
                    {order.type === OrderType.REPAIR && (
                        <RepairPanel order={order} onUpdateStatus={handleSaveDetails} />
                    )}
                    {order.type === OrderType.MANUFACTURE && (
                        <ManufacturePanel order={order} onUpdateStatus={handleSaveDetails} />
                    )}
                </div>
            )}

            {/* Bottom Row: Estado del Pago (izquierda), Notas del Pedido (centro), Actividad Reciente (derecha) */}
            <div className={`grid grid-cols-1 ${canViewPayments && isAuthorized ? 'lg:grid-cols-3' : (canViewPayments || isAuthorized ? 'lg:grid-cols-2' : 'lg:grid-cols-1')} gap-10`}>
                {/* 1. Estado del Pago (Oculto para Joyeros y roles sin permiso de pagos) */}
                {canViewPayments && (
                    <section className="bg-card border border-border rounded-[32px] p-8 backdrop-blur-sm shadow-sm flex flex-col justify-between min-h-[500px] transition-colors">
                        <div>
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-foreground text-xs font-black uppercase tracking-widest transition-colors">Estado del Pago</h3>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[10px] font-black uppercase tracking-widest rounded-full transition-colors ${order.paymentProgress >= 100 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{order.paymentProgress >= 100 ? 'check_circle' : 'timelapse'}</span>
                                    {order.paymentProgress >= 100 ? "Completo" : "Parcial"}
                                </span>
                            </div>
                            <div className="space-y-6">
                                <div role="progressbar" aria-label="Avance de pago" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(order.paymentProgress, 100))} className="h-2.5 w-full bg-muted rounded-full overflow-hidden p-[1px] transition-colors">
                                    <div className={`h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all bg-indigo-500`} style={{ width: `${order.paymentProgress}%` }}></div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-baseline text-xs font-medium">
                                        <span className="text-muted-foreground uppercase tracking-widest transition-colors">Pagado ({Math.round(order.paymentProgress)}%)</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 text-base font-black tabular-nums transition-colors">{order.paidAmountFormatted}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-xs font-medium">
                                        <span className="text-muted-foreground uppercase tracking-widest transition-colors">Pendiente</span>
                                        <span className="text-foreground text-base font-black tabular-nums transition-colors">{order.pendingAmount}</span>
                                    </div>
                                </div>

                                {/* Payment List */}
                                {order.payments && order.payments.length > 0 && (
                                    <div className="space-y-3 mt-8 pt-6 border-t border-border transition-colors">
                                        <h4 className="text-muted-foreground text-[11px] font-black uppercase tracking-widest transition-colors">Historial de Pagos</h4>
                                        <div className="max-h-[150px] overflow-y-auto pr-2 no-scrollbar space-y-2">
                                            {order.payments.map((p: any) => (
                                                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border group/payment transition-colors">
                                                    <div>
                                                        <p className="text-foreground text-sm font-black tabular-nums transition-colors">{Number(p.amount).toLocaleString()} MXN</p>
                                                        <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest transition-colors">{p.method} • {new Date(p.recordedAt).toLocaleDateString()}</p>
                                                    </div>
                                                    {canRegisterPayments && (
                                                        <button
                                                            onClick={() => handleDeletePayment(p.id, Number(p.amount))}
                                                            aria-label={`Eliminar pago de ${Number(p.amount).toLocaleString()} MXN`}
                                                            className="opacity-0 group-hover/payment:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity size-10 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {canRegisterPayments && (
                            <button
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="w-full mt-6 py-4 rounded-2xl bg-foreground text-background border border-border text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95">
                                Registrar Pago
                            </button>
                        )}
                    </section>
                )}

                {/* 2. Notas del Pedido */}
                <section className="bg-card border border-border rounded-[32px] p-8 backdrop-blur-sm shadow-sm flex flex-col justify-between min-h-[500px] transition-colors">
                    <div className="flex-1 flex flex-col">
                        <h3 className="text-foreground text-[10px] font-black uppercase tracking-widest mb-8 transition-colors">Notas del Pedido</h3>
                        <textarea
                            value={notesBuffer}
                            onChange={(e) => setNotesBuffer(e.target.value)}
                            className="flex-1 w-full bg-muted rounded-2xl border border-border p-6 text-foreground text-sm leading-relaxed font-medium italic mb-6 resize-none outline-none focus:border-indigo-500/30 transition-all shadow-inner"
                            placeholder="Escribe aquí notas adicionales del pedido..."
                        />
                    </div>
                    <button
                        onClick={() => updateField('notes', notesBuffer)}
                        className="w-full py-4 rounded-2xl bg-foreground text-background border border-border text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95">
                        Guardar Notas
                    </button>
                </section>

                {/* 3. Actividad Reciente - Solo para System & Admin */}
                {isAuthorized && (
                    <section className="bg-card border border-border rounded-[32px] p-8 backdrop-blur-sm shadow-sm min-h-[500px] flex flex-col transition-colors">
                        <h3 className="text-foreground text-[10px] font-black uppercase tracking-widest mb-8 transition-colors">Actividad Reciente</h3>
                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 pr-4 max-h-[380px]">
                            {activities.map((activity, index) => (
                                <ActivityItem
                                    key={index}
                                    user={activity.user}
                                    action={activity.action}
                                    target={activity.target}
                                    time={activity.time}
                                    dotColor={activity.dotColor}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Envelope / Reference Photos Section */}
            {(order.type === OrderType.REPAIR || order.type === OrderType.MANUFACTURE || order.type === 'MANUFACTURE') && (
                <section className="bg-card border border-border rounded-[32px] p-8 backdrop-blur-sm shadow-sm transition-colors mt-10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-amber-600 dark:text-amber-500 transition-colors">photo_library</span>
                            <h3 className="text-foreground text-[10px] font-black uppercase tracking-widest transition-colors">Fotos del Sobre y Referencia</h3>
                        </div>
                        <button
                            onClick={() => envelopeFileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 hover:bg-amber-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                            Agregar Foto
                        </button>
                        <input
                            type="file"
                            ref={envelopeFileInputRef}
                            onChange={handleEnvelopeImageUpload}
                            className="hidden"
                            accept="image/*"
                        />
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {order.specifications?.envelopeImages?.map((img: string, idx: number) => (
                            <div key={idx} className="aspect-square bg-muted rounded-2xl border border-border overflow-hidden relative group/img transition-colors">
                                <img src={img} className="w-full h-full object-cover transition-transform group-hover/img:scale-110" alt={`Sobre ${idx}`} />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 group-focus-within/img:opacity-100 [@media(hover:none)]:opacity-100 [@media(hover:none)]:bg-transparent transition-opacity flex items-center justify-center [@media(hover:none)]:items-start [@media(hover:none)]:justify-end [@media(hover:none)]:p-2">
                                    <button
                                        onClick={() => handleRemoveEnvelopeImage(idx)}
                                        aria-label={`Eliminar foto ${idx + 1} del sobre`}
                                        className="size-11 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all scale-75 group-hover/img:scale-100 group-focus-within/img:scale-100 [@media(hover:none)]:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                    >
                                        <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {(!order.specifications?.envelopeImages || order.specifications.envelopeImages.length === 0) && (
                            <button
                                type="button"
                                onClick={() => envelopeFileInputRef.current?.click()}
                                className="aspect-square bg-muted/50 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-indigo-500/50 transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                >
                                <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform" aria-hidden="true">add_a_photo</span>
                                <span className="text-[11px] font-black uppercase tracking-widest">Agregar primera foto</span>
                            </button>
                        )}
                    </div>
                </section>
            )}

            {/* Stats Grid */}
            {isJoyero ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10 mb-10">
                    <StatCard 
                        label="Mano de Obra" 
                        value={Number(order.laborCost || 0).toLocaleString() + ' MXN'} 
                        subtext="Trabajo de Taller" 
                        icon="handyman" 
                        color="text-amber-500" 
                    />
                    <StatCard 
                        label="Comisión" 
                        value={Number(order.commission || 0).toLocaleString() + ' MXN'} 
                        subtext="Comisión asignada" 
                        icon="paid" 
                        color="text-emerald-500" 
                    />
                    <StatCard
                        label="Entrega"
                        value={order.dueDate ? new Date(order.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Pendiente'}
                        isDate
                        subtext={order.dueDate ? (
                            (() => {
                                const days = Math.ceil((new Date(order.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                return days > 0 ? `Quedan ${days} días` : days === 0 ? "Entrega hoy" : `Atrasa ${Math.abs(days)} días`;
                            })()
                        ) : "Sin fecha"}
                        icon="event"
                        color="text-foreground"
                        alert={order.dueDate && new Date(order.dueDate) < new Date() ? "priority_high" : undefined}
                        alertColor="text-red-500"
                        border={order.dueDate && new Date(order.dueDate) < new Date() ? "border-l-4 border-l-red-500" : ""}
                    />
                </div>
            ) : (
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${user.role === 'VENDEDOR' ? 'xl:grid-cols-4' : 'xl:grid-cols-6'} gap-4 mt-10 mb-10`}>
                    <StatCard label="Valor Total" value={Number(order.totalAmount || 0).toLocaleString() + ' MXN'} onUpdate={canModifyOrderDetails ? (v) => updateField('totalAmount', v) : undefined} subtext="Venta" icon="payments" color="text-foreground" />
                    <StatCard label="Anticipo" value={Number(order.paidAmount || 0).toLocaleString() + ' MXN'} subtext="Pagado" icon="account_balance_wallet" color="text-emerald-500" />
                    <StatCard 
                        label={order.balance < 0 ? "Saldo a Favor" : "Resta"} 
                        value={Math.abs(Number(order.balance || 0)).toLocaleString() + ' MXN'} 
                        subtext={order.balance < 0 ? "Cliente tiene crédito" : "Pendiente de liquidar"} 
                        icon={order.balance < 0 ? "account_balance" : "pending_actions"} 
                        color={order.balance < 0 ? "text-emerald-500" : "text-amber-500"} 
                        alert={order.balance > 0 ? "priority_high" : undefined} 
                        alertColor="text-amber-500" 
                    />
                    {user.role !== 'VENDEDOR' && (
                        <>
                            <StatCard label="Costo" value={Number(order.cost || 0).toLocaleString() + ' MXN'} onUpdate={canModifyOrderDetails ? (v) => updateField('cost', v) : undefined} subtext="Material + Mano Obra" icon="precision_manufacturing" color="text-foreground" />
                            <StatCard label="Margen" value={(parseValue(order.totalAmount) - parseValue(order.cost)).toLocaleString() + ' MXN'} subtext="Utilidad" icon="trending_up" badge={order.margin} badgeColor="bg-emerald-500/10 text-emerald-600" />
                        </>
                    )}
                    <StatCard
                        label="Entrega"
                        value={order.dueDate ? new Date(order.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Pendiente'}
                        onUpdate={canModifyOrderDetails ? (v) => updateField('dueDate', v) : undefined}
                        isDate
                        subtext={order.dueDate ? (
                            (() => {
                                const days = Math.ceil((new Date(order.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                return days > 0 ? `Quedan ${days} días` : days === 0 ? "Entrega hoy" : `Atrasa ${Math.abs(days)} días`;
                            })()
                        ) : "Sin fecha"}
                        icon="event"
                        color="text-foreground"
                        alert={order.dueDate && new Date(order.dueDate) < new Date() ? "priority_high" : undefined}
                        alertColor="text-red-500"
                        border={order.dueDate && new Date(order.dueDate) < new Date() ? "border-l-4 border-l-red-500" : ""}
                    />
                </div>
            )}

            <AnimatePresence>
                {order && isPaymentModalOpen && (
                    <PaymentModal
                        isOpen={isPaymentModalOpen}
                        onClose={() => setIsPaymentModalOpen(false)}
                        totalAmount={parseValue(order.value)}
                        pendingAmount={parseValue(order.pendingAmount)}
                        onRegisterPayment={handleRegisterPayment}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {order && isEditModalOpen && (
                    <EditOrderModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        order={order}
                        onSave={handleSaveDetails}
                    />
                )}
            </AnimatePresence>

            <RepairPrintView
                isOpen={isPrintViewOpen}
                onClose={() => setIsPrintViewOpen(false)}
                order={order}
            />

            <LabelPrintModal
                isOpen={isLabelPrintOpen}
                onClose={() => setIsLabelPrintOpen(false)}
                order={order}
            />
        </div>
    );
};

const EditableField: React.FC<{ value: string, onUpdate: (v: string) => void, className?: string, isItalic?: boolean, isDate?: boolean }> = ({ value, onUpdate, className, isItalic, isDate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);

    // Sync if external value changes
    useEffect(() => {
        if (isDate && value) {
            // Value might be formatted for UI, we need YYYY-MM-DD for input
            // But usually 'value' passed to StatCard is formatted. 
            // We'll handle date input specifically.
        }
        setCurrentValue(value);
    }, [value, isDate]);

    if (isEditing) {
        return (
            <input
                autoFocus
                type={isDate ? "date" : "text"}
                className={`bg-muted text-foreground border-b border-indigo-500 outline-none px-1 rounded ${className} [color-scheme:light] dark:[color-scheme:dark] transition-colors`}
                value={isDate ? (currentValue && !isNaN(Date.parse(currentValue)) ? new Date(currentValue).toISOString().split('T')[0] : '') : currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={() => { setIsEditing(false); onUpdate(currentValue); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditing(false); onUpdate(currentValue); } }}
            />
        );
    }

    return (
        <span
            onClick={() => setIsEditing(true)}
            className={`cursor-text hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border-b border-transparent hover:border-indigo-500/30 ${isItalic ? 'italic' : ''} ${className}`}
        >
            {value}
        </span>
    );
};

const StatCard: React.FC<{ label: string, value: string, subtext: string | React.ReactNode, icon: string, color: string, badge?: string, badgeColor?: string, alert?: string, alertColor?: string, border?: string, onUpdate?: (v: string) => void, isDate?: boolean }> = ({ label, value, subtext, icon, color, badge, badgeColor, alert, alertColor, border, onUpdate, isDate }) => (
    <div className={`bg-card border border-border rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden group hover:border-indigo-500/40 transition-all shadow-sm ${border || ''}`}>
        <div className="flex justify-between items-start mb-5">
            <span className="text-muted-foreground text-[11px] font-black uppercase tracking-widest">{label}</span>
            <span className={`material-symbols-outlined ${color} opacity-60 group-hover:opacity-100 transition-opacity text-[24px]`} aria-hidden="true">{icon}</span>
        </div>
        <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
                {onUpdate ? (
                    <EditableField value={value} onUpdate={onUpdate} isDate={isDate} className="text-foreground text-2xl xl:text-3xl font-black tracking-tight font-display transition-colors" />
                ) : (
                    <span className="text-foreground text-2xl xl:text-3xl font-black tracking-tight font-display transition-colors">{value}</span>
                )}
                {badge && <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest transition-colors ${badgeColor}`}>{badge}</span>}
            </div>
            <div className="flex items-center gap-2">
                {alert && <span className={`material-symbols-outlined ${alertColor} text-[16px]`} aria-hidden="true">{alert}</span>}
                <div className="text-muted-foreground text-xs font-medium transition-colors">{subtext}</div>
            </div>
        </div>
    </div>
);

const META_TONES = {
    neutral: { icon: 'text-muted-foreground', value: 'text-foreground' },
    emerald: { icon: 'text-emerald-600 dark:text-emerald-400', value: 'text-emerald-700 dark:text-emerald-300' },
    indigo: { icon: 'text-indigo-600 dark:text-indigo-400', value: 'text-indigo-700 dark:text-indigo-300' }
};

const MetaItem: React.FC<{ icon: string; label: string; value: React.ReactNode; tone?: keyof typeof META_TONES }> = ({ icon, label, value, tone = 'neutral' }) => (
    <div className="flex items-center gap-3 min-w-0">
        <span className={`material-symbols-outlined text-[22px] ${META_TONES[tone].icon}`} aria-hidden="true">{icon}</span>
        <div className="min-w-0">
            <dt className="text-muted-foreground text-[11px] font-black uppercase tracking-widest">{label}</dt>
            <dd className={`text-sm font-bold tracking-tight truncate ${META_TONES[tone].value}`}>{value}</dd>
        </div>
    </div>
);

const SpecBadge: React.FC<{ label: string; value?: string | number }> = ({ label, value }) => (
    <div className="bg-card border border-border rounded-2xl px-4 py-3 sm:py-3.5 flex flex-col min-w-[95px] shadow-sm">
        <span className="text-muted-foreground text-[10px] font-black uppercase tracking-wider">{label}</span>
        <span className="text-foreground text-sm sm:text-base font-black truncate mt-1 tracking-tight">{value || '—'}</span>
    </div>
);

const DetailRow: React.FC<{ label: string, value: string, isItalic?: boolean, onUpdate?: (v: string) => void }> = ({ label, value, isItalic, onUpdate }) => (
    <div className="flex justify-between items-baseline gap-4 group transition-colors">
        <span className="text-zinc-400 dark:text-zinc-600 text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-colors">{label}</span>
        <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900/50 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800 transition-colors"></div>
        {onUpdate ? (
            <EditableField value={value} onUpdate={onUpdate} isItalic={isItalic} className="text-zinc-900 dark:text-white text-sm font-bold tracking-tight text-right min-w-[50px] transition-colors" />
        ) : (
            <span className={`text-zinc-900 dark:text-white text-sm font-bold tracking-tight text-right transition-colors ${isItalic ? 'italic' : ''}`}>{value}</span>
        )}
    </div>
);

const STEPS = [
    { name: 'Diseño', status: 'COTIZACION_ENVIADA', icon: 'brush' },
    { name: 'Gemas', status: 'APROBADO_ANTICIPO', icon: 'diamond' },
    { name: 'Fundición', status: 'EN_PRODUCCION', icon: 'bolt' },
    { name: 'Engaste', status: 'EN_PRODUCCION', icon: 'settings_suggest' },
    { name: 'Control', status: 'CONTROL_CALIDAD', icon: 'fact_check' },
    { name: 'Entrega', status: 'ENTREGADO_POSTVENTA', icon: 'local_shipping' }
];

const FlowStep: React.FC<{ name: string, icon: string, status: 'completed' | 'current' | 'upcoming', onClick: () => void }> = ({ name, icon, status, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="relative z-10 flex flex-col items-center gap-3 group cursor-pointer focus:outline-none select-none touch-manipulation active:scale-95 transition-transform"
    >
        <div className={`size-12 rounded-full flex items-center justify-center transition-all duration-300 ${status !== 'upcoming' ? 'bg-card border-2' : 'bg-card border border-border text-muted-foreground/40 group-hover:border-border/80 group-hover:text-muted-foreground'} ${status === 'completed' ? 'border-emerald-500 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''} ${status === 'current' ? 'border-indigo-500 text-foreground shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-110' : ''}`}>
            <span className={`material-symbols-outlined text-[20px] ${status === 'completed' ? 'icon-fill' : ''}`}>{status === 'completed' ? 'check_circle' : icon}</span>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${status === 'completed' ? 'text-emerald-500' : status === 'current' ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>{name}</span>
    </button>
);

const ActivityItem: React.FC<{ user: string, action: string, target: string, time: string, dotColor?: string }> = ({ user, action, target, time, dotColor }) => (
    <div className="flex gap-4 group transition-colors">
        <div className="flex flex-col items-center gap-2">
            <div className={`size-3 rounded-full mt-1.5 border-2 border-background transition-transform group-hover:scale-125 ${dotColor || 'bg-muted-foreground/30'}`} aria-hidden="true"></div>
            <div className="w-px flex-1 bg-border transition-colors"></div>
        </div>
        <div className="pb-2">
            <p className="text-foreground text-sm font-medium transition-colors">
                <span className="font-black text-indigo-600 dark:text-indigo-400 transition-colors">{user}</span> {action} <span className="font-black text-foreground transition-colors">{target}</span>
            </p>
            <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest mt-1.5 transition-colors">{time}</p>
        </div>
    </div>
);

export default OrderDetail;
