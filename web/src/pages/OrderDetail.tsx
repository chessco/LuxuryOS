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
import { getStatusLabel } from './Orders';

const OrderDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [order, setOrder] = useState<any | null>(null);
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

        return {
            ...foundOrder,
            clientName: clientName,
            totalAmount: total,
            paidAmount: paid,
            balance: balance,
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
                try {
                    const foundOrder = await OrdersService.getOrder(id);
                    if (foundOrder) {
                        setOrder(enrichOrder(foundOrder));
                        setNotesBuffer(foundOrder.notes || '');

                        // Synthesize Activities
                        const acts: any[] = [];

                        // 1. Creation
                        acts.push({
                            user: "Sistema",
                            action: "creó el pedido",
                            target: "",
                            time: new Date(foundOrder.createdAt).toLocaleString(),
                            dotColor: "bg-muted-foreground/30"
                        });

                        // ...

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
                    }
                } catch (error) {
                    console.error("Failed to fetch order", error);
                }
            }
        };
        fetchOrder();
    }, [id]);

    const handleAdvanceStatus = async () => {
        if (!id) return;
        try {
            await OrdersService.advanceStatus(id);
            // Re-fetch order to see changes
            window.location.reload(); // Simple refresh for now to reset all panels/states
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveDetails = async (data: any) => {
        if (!id) return;
        try {
            await OrdersService.updateOrder(id, data);
            window.location.reload();
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

    const isAuthorized = user.role === 'SYSTEM_ADMIN' || user.role === 'TENANT_ADMIN';

    const handleStepChange = async (index: number) => {
        if (index === currentStep) return;

        if (isAuthorized) {
            const stepStatus = STEPS[index].status;
            try {
                await OrdersService.updateOrder(id!, { stage: stepStatus });
                window.location.reload();
            } catch (error) {
                console.error(error);
                alert("Error al actualizar la fase de producción.");
            }
            return;
        }

        setCurrentStep(index);

        // Add activity log
        const stepName = STEPS[index].name;
        const newActivity = {
            user: "Tú",
            action: "moviste el estado a",
            target: stepName,
            time: "Hace un momento",
            dotColor: "bg-emerald-500"
        };

        setActivities(prev => [newActivity, ...prev]);
    };

    if (!order) {
        return <div className="p-10 text-foreground font-black uppercase tracking-widest transition-colors">Pedido no encontrado</div>;
    }

    const updateField = async (field: string, value: any) => {
        if (!order) return;
        try {
            // Map UI field names to API field names if needed
            const apiField = field === 'item' ? 'pieceType' : field;

            // For numbers
            let processedValue = value;
            if (field === 'value' || field === 'cost' || field === 'laborCost' || field === 'materialCost' || field === 'totalAmount') {
                const str = String(value || '0').replace(/[^0-9.-]/g, '');
                processedValue = parseFloat(str) || 0;
            }

            await OrdersService.updateOrder(order.id, { [apiField]: processedValue });

            // Re-fetch to get recalculated values (totalAmount, balance, etc.)
            const updated = await OrdersService.getOrder(order.id);
            if (updated) {
                setOrder(enrichOrder(updated));
            }
        } catch (error) {
            console.error("Failed to update field", error);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Breadcrumbs & Header */}
            <header className="mb-10">
                <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">
                    <Link to="/dashboard" className="hover:text-foreground transition-colors">Inicio</Link>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    <Link to="/orders" className="hover:text-foreground transition-colors">Pedidos</Link>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    <span className="text-muted-foreground/60 transition-colors">Pedido #ORD-{order.id.substring(0, 8)}</span>
                </nav>

                <div className="flex flex-wrap justify-between items-end gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <h1 className="text-foreground text-5xl font-black tracking-tighter font-display transition-colors">Pedido #ORD-{order.id.substring(0, 8)}</h1>
                            <span className={`px-3 py-1 bg-muted border border-border text-[9px] font-black uppercase tracking-widest rounded-full transition-colors ${order.statusType === 'urgent' ? 'text-red-600 border-red-500/20 bg-red-500/5' :
                                order.statusType === 'success' ? 'text-emerald-600 border-emerald-500/20 bg-emerald-500/5' :
                                    'text-indigo-600 border-indigo-500/20 bg-indigo-500/5'
                                }`}>{order.statusLabel || order.status}</span>
                        </div>
                        <div className="flex items-center gap-6 text-muted-foreground text-xs font-bold uppercase tracking-widest transition-colors">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">history</span>
                                <span>Recibido: {order.date}</span>
                            </div>
                            <div className={`flex items-center gap-2 transition-colors ${order.statusType === 'urgent' ? 'text-red-600' : 'text-indigo-600'}`}>
                                <span className="material-symbols-outlined text-[18px]">{order.statusType === 'urgent' ? 'priority_high' : 'info'}</span>
                                <span>{order.priority}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {user.role === 'SYSTEM_ADMIN' && (
                            <button 
                                onClick={handleDeleteOrder} 
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 hover:bg-red-500/20 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                                <span>Borrar Pedido</span>
                            </button>
                        )}
                        <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:border-indigo-500/50 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm">
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                            <span>Editar Detalles</span>
                        </button>
                        <button onClick={() => setIsLabelPrintOpen(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 hover:bg-amber-500/20 transition-all text-[10px] font-black uppercase tracking-widest">
                            <span className="material-symbols-outlined text-[20px]">print</span>
                            <span>Imprimir Etiqueta</span>
                        </button>
                        {order.type === OrderType.REPAIR && (
                            <button
                                onClick={() => setIsPrintViewOpen(true)}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 hover:bg-amber-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
                            >
                                <span className="material-symbols-outlined text-[20px]">print</span>
                                <span>Visualizar Sobre</span>
                            </button>
                        )}
                        {order.type === OrderType.REPAIR && order.status !== 'REPAIR_COMPLETED' && order.status !== 'DELIVERED' && (
                            <button
                                onClick={() => handleSaveDetails({ status: 'REPAIR_COMPLETED' })}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
                            >
                                <span className="material-symbols-outlined text-[20px]">verified</span>
                                <span>Listo para Entrega</span>
                            </button>
                        )}
                        <button onClick={handleAdvanceStatus} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-foreground text-background transition-all text-[10px] font-black uppercase tracking-widest shadow-xl">
                            <span className="material-symbols-outlined text-[20px]">sync</span>
                            <span>Actualizar Estado</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Stats Grid */}
            {/* Stats Grid */}
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${user.role === 'VENDEDOR' ? 'xl:grid-cols-4' : 'xl:grid-cols-6'} gap-4 mb-10`}>
                <StatCard label="Valor Total" value={Number(order.totalAmount || 0).toLocaleString() + ' MXN'} onUpdate={(v) => updateField('totalAmount', v)} subtext="Venta" icon="payments" color="text-foreground" />
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
                        <StatCard label="Costo" value={Number(order.cost || 0).toLocaleString() + ' MXN'} onUpdate={(v) => updateField('cost', v)} subtext="Material + Mano Obra" icon="precision_manufacturing" color="text-foreground" />
                        <StatCard label="Margen" value={(parseValue(order.totalAmount) - parseValue(order.cost)).toLocaleString() + ' MXN'} subtext="Utilidad" icon="trending_up" badge={order.margin} badgeColor="bg-emerald-500/10 text-emerald-600" />
                    </>
                )}
                <StatCard
                    label="Entrega"
                    value={order.dueDate ? new Date(order.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Pendiente'}
                    onUpdate={(v) => updateField('dueDate', v)}
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Column: Details & Client */}
                <div className="lg:col-span-4 space-y-10">
                    {/* Piece Details - Multiple Support */}
                    <section className="bg-card border border-border rounded-[32px] p-8 backdrop-blur-sm shadow-sm transition-colors">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-indigo-600 transition-colors">diamond</span>
                                <h3 className="text-foreground text-[10px] font-black uppercase tracking-widest transition-colors">Ficha Técnica de Piezas</h3>
                            </div>
                            <span className="text-muted-foreground text-[9px] font-black uppercase tracking-widest bg-muted px-2 py-1 rounded-lg border border-border transition-colors">
                                {order.specifications?.items?.length || 1} {order.specifications?.items?.length > 1 ? 'Piezas' : 'Pieza'}
                            </span>
                        </div>

                        <div className="space-y-12">
                            {(order.specifications?.items || [{
                                item: order.pieceType || order.item,
                                metal: order.metal,
                                color: order.color,
                                karats: order.karats,
                                weight: order.weight,
                                size: order.size,
                                itemCode: order.itemCode
                            }]).map((piece: any, idx: number) => (
                                <div key={idx} className="space-y-6 relative">
                                    {order.specifications?.items?.length > 1 && (
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="h-px flex-1 bg-zinc-900"></div>
                                            <span className="text-zinc-700 text-[8px] font-black uppercase tracking-[0.3em]">Pieza #{idx + 1}</span>
                                            <div className="h-px flex-1 bg-zinc-900"></div>
                                        </div>
                                    )}
                                    <div className="aspect-square bg-muted rounded-2xl border border-border flex items-center justify-center overflow-hidden group/img relative transition-colors">
                                        {order.imageUrl ? (
                                            <img src={order.imageUrl} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700" alt="Pieza" />
                                        ) : (
                                            <div className="size-16 bg-muted/50 rounded-full flex items-center justify-center group-hover/img:scale-110 transition-transform duration-500">
                                                <span className="material-symbols-outlined text-muted-foreground/30 text-3xl transition-colors">image</span>
                                            </div>
                                        )}

                                        {/* Image Overlay Controls */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-all flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-[9px] font-black uppercase tracking-widest hover:bg-muted transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">upload</span> Subir Foto
                                            </button>
                                            <button
                                                onClick={handleGenerateAIImage}
                                                disabled={isGeneratingImage}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
                                            >
                                                <span className={`material-symbols-outlined text-[18px] ${isGeneratingImage ? 'animate-spin' : ''}`}>{isGeneratingImage ? 'sync' : 'auto_awesome'}</span> {isGeneratingImage ? 'Generando...' : 'Generar IA'}
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleImageUpload}
                                                className="hidden"
                                                accept="image/*"
                                            />
                                        </div>

                                        <div className="absolute bottom-4 left-4 right-4 text-center">
                                            <p className="text-white text-xs font-black uppercase tracking-widest truncate drop-shadow-lg">{piece.item || 'Sin nombre'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <DetailRow label="Metal" value={piece.metal || '-'} />
                                        <DetailRow label="Color" value={piece.color || '-'} />
                                        <DetailRow label="Kilataje" value={piece.karats || '-'} />
                                        <DetailRow label="Peso" value={piece.weight ? `${piece.weight} gr` : '-'} />
                                        <DetailRow label="Medida" value={piece.size || '-'} />
                                        <DetailRow label="Grosor" value={piece.thickness || '-'} />
                                        <DetailRow label="Código" value={piece.itemCode || '-'} />
                                        {(piece.laborCost || piece.materialCost) && (
                                            <div className="pt-4 border-t border-border/50 space-y-4">
                                                <DetailRow label="Mano de Obra" value={piece.laborCost ? `${Number(piece.laborCost).toLocaleString()} MXN` : '-'} />
                                                <DetailRow label="Material" value={piece.materialCost ? `${Number(piece.materialCost).toLocaleString()} MXN` : '-'} />
                                            </div>
                                        )}
                                        {piece.description && (
                                            <div className="pt-4 border-t border-border/50">
                                                <span className="text-zinc-400 dark:text-zinc-600 text-[8px] font-black uppercase tracking-widest block mb-2 transition-colors">Descripción / Trabajo</span>
                                                <p className="text-foreground text-[11px] font-medium leading-relaxed bg-muted/50 p-3 rounded-xl border border-border/50 transition-colors">{piece.description}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Client Info */}
                    <section className="bg-card border border-border rounded-[32px] p-8 backdrop-blur-sm shadow-sm transition-colors">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-foreground text-[10px] font-black uppercase tracking-widest transition-colors">Cliente</h3>
                            <Link
                                to={`/clients?search=${encodeURIComponent(order.clientName)}`}
                                className="text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline transition-colors"
                            >
                                Ver Perfil <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            </Link>
                        </div>
                        <div className="flex items-center gap-4 mb-8">
                            {order.avatar ? (
                                <img src={order.avatar} className="size-16 rounded-2xl object-cover grayscale opacity-80" alt="Client" />
                            ) : (
                                <div className={`size-16 rounded-2xl flex items-center justify-center text-xs font-black border border-border shadow-lg transition-colors ${order.initialsColor}`}>{order.initials}</div>
                            )}
                            <div>
                                <h4 className="text-foreground font-bold text-lg transition-colors">{order.clientName}</h4>
                                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1 transition-colors">{order.client?.status || 'Activo'} • {order.client?.location || 'MÉXICO'}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button className="flex items-center justify-center gap-2 bg-muted border border-border rounded-xl py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-indigo-500/50 transition-all shadow-sm transition-colors">
                                <span className="material-symbols-outlined text-[18px]">mail</span> Email
                            </button>
                            <button className="flex items-center justify-center gap-2 bg-muted border border-border rounded-xl py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-indigo-500/50 transition-all shadow-sm transition-colors">
                                <span className="material-symbols-outlined text-[18px]">call</span> Llamar
                            </button>
                        </div>
                    </section>

                    {/* Payment Status */}
                    <section className="bg-card border border-border rounded-[32px] p-8 backdrop-blur-sm shadow-sm transition-colors">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-foreground text-[10px] font-black uppercase tracking-widest transition-colors">Estado del Pago</h3>
                            <span className={`px-2 py-0.5 border text-[8px] font-black uppercase tracking-widest rounded transition-colors ${order.paymentProgress >= 100 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-amber-500/10 border-amber-500/20 text-amber-600'}`}>{order.paymentProgress >= 100 ? "Completo" : "Parcial"}</span>
                        </div>
                        <div className="space-y-6">
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden p-[1px] transition-colors">
                                <div className={`h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all bg-indigo-500`} style={{ width: `${order.paymentProgress}%` }}></div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between text-[11px] font-medium">
                                    <span className="text-muted-foreground uppercase tracking-widest transition-colors">Pagado ({Math.round(order.paymentProgress)}%)</span>
                                    <span className="text-foreground font-black transition-colors">{order.paidAmountFormatted}</span>
                                </div>
                                <div className="flex justify-between text-[11px] font-medium">
                                    <span className="text-muted-foreground uppercase tracking-widest transition-colors">Pendiente</span>
                                    <span className="text-foreground font-black transition-colors">{order.pendingAmount}</span>
                                </div>
                            </div>

                            {/* Payment List */}
                            {order.payments && order.payments.length > 0 && (
                                <div className="space-y-3 mt-8 pt-6 border-t border-border transition-colors">
                                    <h4 className="text-muted-foreground text-[8px] font-black uppercase tracking-widest transition-colors">Historial de Pagos</h4>
                                    <div className="max-h-[150px] overflow-y-auto pr-2 no-scrollbar space-y-2">
                                        {order.payments.map((p: any) => (
                                            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border group/payment transition-colors">
                                                <div>
                                                    <p className="text-foreground text-[10px] font-black transition-colors">{Number(p.amount).toLocaleString()} MXN</p>
                                                    <p className="text-muted-foreground text-[8px] font-bold uppercase tracking-widest transition-colors">{p.method} • {new Date(p.recordedAt).toLocaleDateString()}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeletePayment(p.id, Number(p.amount))}
                                                    className="opacity-0 group-hover/payment:opacity-100 transition-opacity size-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="w-full py-4 rounded-2xl bg-foreground text-background border border-border text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95">
                                Registrar Pago
                            </button>
                        </div>
                    </section>
                </div>

                {/* Right Column: Flow, Notes & Activity */}
                <div className="lg:col-span-8 space-y-10">
                    {/* Dynamic Operational Panel */}
                    {order.type === OrderType.REPAIR && (
                        <RepairPanel order={order} onUpdateStatus={handleSaveDetails} />
                    )}
                    {order.type === OrderType.MANUFACTURE && (
                        <ManufacturePanel order={order} onUpdateStatus={() => { }} />
                    )}

                    {/* Production Flow (Legacy or Manufacture) */}
                    {order.type === OrderType.MANUFACTURE && (
                        <section className="bg-card border border-border rounded-[32px] p-8 backdrop-blur-sm shadow-sm transition-colors">
                            <div className="flex items-center justify-between mb-12">
                                <h3 className="text-foreground text-[10px] font-black uppercase tracking-widest font-display transition-colors">Flujo de Producción</h3>
                                <span className="text-muted-foreground text-[9px] font-bold uppercase tracking-widest transition-colors">Actualizado: Hace 2 horas</span>
                            </div>
                            <div className="relative flex justify-between items-center px-4">
                                <div className="absolute left-0 right-0 h-px bg-border top-1/2 -translate-y-1/2 z-0">
                                    <div
                                        className="h-full bg-indigo-500/20 transition-all duration-500"
                                        style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                                    ></div>
                                </div>
                                {STEPS.map((step, index) => {
                                    let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
                                    if (index < currentStep) status = 'completed';
                                    if (index === currentStep) status = 'current';

                                    return (
                                        <FlowStep
                                            key={step.name}
                                            name={step.name}
                                            icon={step.icon}
                                            status={status}
                                            onClick={() => handleStepChange(index)}
                                            isAuthorized={isAuthorized}
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Envelope / Reference Photos Section */}
                    {order.type === OrderType.REPAIR && (
                        <section className="bg-card border border-border rounded-[32px] p-8 backdrop-blur-sm shadow-sm transition-colors">
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
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={() => handleRemoveEnvelopeImage(idx)}
                                                className="size-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all scale-75 group-hover/img:scale-100"
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {(!order.specifications?.envelopeImages || order.specifications.envelopeImages.length === 0) && (
                                    <div
                                        onClick={() => envelopeFileInputRef.current?.click()}
                                        className="aspect-square bg-muted/50 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground/30 hover:text-muted-foreground/60 hover:border-indigo-500/30 transition-all cursor-pointer group"
                                    >
                                        <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">add_a_photo</span>
                                        <span className="text-[8px] font-black uppercase tracking-widest">Sin fotos</span>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Order Notes */}
                        <section className="bg-card border border-border rounded-[32px] p-8 backdrop-blur-sm shadow-sm flex flex-col h-[500px] transition-colors">
                            <h3 className="text-foreground text-[10px] font-black uppercase tracking-widest mb-8 transition-colors">Notas del Pedido</h3>
                            <textarea
                                value={notesBuffer}
                                onChange={(e) => setNotesBuffer(e.target.value)}
                                className="flex-1 bg-muted rounded-2xl border border-border p-6 text-foreground text-sm leading-relaxed font-medium italic mb-6 resize-none outline-none focus:border-indigo-500/30 transition-all shadow-inner"
                                placeholder="Escribe aquí notas adicionales del pedido..."
                            />
                            <button
                                onClick={() => updateField('notes', notesBuffer)}
                                className="w-full py-4 rounded-2xl bg-foreground text-background border border-border text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95">
                                Guardar Notas
                            </button>
                        </section>

                        {/* Recent Activity */}
                        <section className="bg-card border border-border rounded-[32px] p-8 backdrop-blur-sm shadow-sm h-[500px] flex flex-col transition-colors">
                            <h3 className="text-foreground text-[10px] font-black uppercase tracking-widest mb-8 transition-colors">Actividad Reciente</h3>
                            <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 pr-4">
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
                    </div>
                </div>
            </div>

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
    <div className={`bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden group hover:border-zinc-400 dark:hover:border-zinc-700 transition-all shadow-sm ${border || ''}`}>
        <div className="flex justify-between items-start mb-6">
            <span className="text-zinc-400 dark:text-zinc-600 text-[9px] font-black uppercase tracking-widest">{label}</span>
            <span className={`material-symbols-outlined ${color} opacity-20 group-hover:opacity-100 transition-opacity text-[24px]`}>{icon}</span>
        </div>
        <div className="space-y-2">
            <div className="flex items-center gap-3">
                {onUpdate ? (
                    <EditableField value={value} onUpdate={onUpdate} isDate={isDate} className="text-zinc-900 dark:text-white text-3xl font-black tracking-tight font-display transition-colors" />
                ) : (
                    <span className="text-zinc-900 dark:text-white text-3xl font-black tracking-tight font-display transition-colors">{value}</span>
                )}
                {badge && <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-colors ${badgeColor}`}>{badge}</span>}
            </div>
            <div className="flex items-center gap-2">
                {alert && <span className={`material-symbols-outlined ${alertColor} text-[16px]`}>{alert}</span>}
                <div className="text-zinc-400 dark:text-zinc-500 text-xs font-medium transition-colors">{subtext}</div>
            </div>
        </div>
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
    { name: 'Diseño', icon: 'brush' },
    { name: 'Gemas', icon: 'diamond' },
    { name: 'Fundición', icon: 'bolt' },
    { name: 'Engaste', icon: 'settings_suggest' },
    { name: 'Control', icon: 'fact_check' },
    { name: 'Entrega', icon: 'local_shipping' }
];

const FlowStep: React.FC<{ name: string, icon: string, status: 'completed' | 'current' | 'upcoming', onClick: () => void, isAuthorized?: boolean }> = ({ name, icon, status, onClick, isAuthorized }) => (
    <div onClick={onClick} className={`relative z-10 flex flex-col items-center gap-3 group ${isAuthorized ? 'cursor-pointer' : 'cursor-default pointer-events-none opacity-85'}`}>
        <div className={`size-12 rounded-full flex items-center justify-center transition-all duration-500 ${status !== 'upcoming' ? 'bg-white dark:bg-zinc-950 border-2' : 'bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 text-zinc-300 dark:text-zinc-700' + (isAuthorized ? ' group-hover:border-zinc-400 dark:group-hover:border-zinc-700 group-hover:text-zinc-500 dark:group-hover:text-zinc-500' : '')} ${status === 'completed' ? 'border-emerald-500 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''} ${status === 'current' ? 'border-indigo-500 text-zinc-900 dark:text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-110' : ''}`}>
            <span className={`material-symbols-outlined text-[20px] ${status === 'completed' ? 'icon-fill' : ''}`}>{status === 'completed' ? 'check_circle' : icon}</span>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${status === 'completed' ? 'text-emerald-500' : status === 'current' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-700' + (isAuthorized ? ' group-hover:text-zinc-500' : '')}`}>{name}</span>
    </div>
);

const ActivityItem: React.FC<{ user: string, action: string, target: string, time: string, dotColor?: string }> = ({ user, action, target, time, dotColor }) => (
    <div className="flex gap-4 group transition-colors">
        <div className="flex flex-col items-center gap-2">
            <div className={`size-3 rounded-full mt-1.5 border-2 border-white dark:border-zinc-950 transition-transform group-hover:scale-125 transition-colors ${dotColor || 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800'}`}></div>
            <div className="w-px flex-1 bg-zinc-100 dark:bg-zinc-900 transition-colors"></div>
        </div>
        <div className="pb-2">
            <p className="text-zinc-900 dark:text-white text-sm font-medium transition-colors">
                <span className="font-black text-indigo-600 dark:text-indigo-400 transition-colors">{user}</span> {action} <span className="font-black text-zinc-900 dark:text-white transition-colors">{target}</span>
            </p>
            <p className="text-zinc-400 dark:text-zinc-600 text-[10px] font-bold uppercase tracking-widest mt-1.5 transition-colors">{time}</p>
        </div>
    </div>
);

export default OrderDetail;
