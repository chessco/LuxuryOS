import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AutocompleteInput from '../AutocompleteInput';
import { PieceSelect } from './PieceSelect';
import { ClientsService } from '../../services/clients.service';
import { UsersService } from '../../services/users.service';
import { SelectWithOther } from './SelectWithOther';

interface EditOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
    onSave: (data: any) => Promise<void>;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({ isOpen, onClose, order, onSave }) => {
    const user = React.useMemo(() => {
        try {
            const raw = localStorage.getItem('user');
            if (raw) return JSON.parse(raw);
        } catch {}
        return null;
    }, []);
    const isJoyero = 
        user?.role === 'JOYERO' || 
        String(user?.role || '').toUpperCase().includes('JOYER') ||
        String(user?.email || '').toLowerCase().includes('joyero') ||
        String(user?.name || '').toLowerCase().includes('joyero');
    const isVendedor = 
        user?.role === 'VENDEDOR' || 
        String(user?.role || '').toUpperCase().includes('VEND') ||
        String(user?.email || '').toLowerCase().includes('ventas') || 
        String(user?.email || '').toLowerCase().includes('vendedor') ||
        String(user?.name || '').toLowerCase().includes('ventas') ||
        String(user?.name || '').toLowerCase().includes('vendedor');
    const canSeeCost = !isJoyero && !isVendedor;

    const [formData, setFormData] = useState({
        pieceType: order.pieceType,
        value: order.value,
        cost: order.cost,
        laborCost: order.laborCost || 0,
        materialCost: order.materialCost || 0,
        assignedTo: order.specifications?.assignedTo || order.specifications?.assignedJeweler || '',
        priority: (order.priority || 'MEDIA').toUpperCase(),
        location: order.location || '',
        department: order.specifications?.department || order.department || 'Taller Cared',
        promisedDate: order.promisedAt ? new Date(order.promisedAt).toISOString().split('T')[0] : (order.specifications?.promisedDate || (order.dueDate ? new Date(order.dueDate).toISOString().split('T')[0] : '')),
        status: (order.status || order.stage || 'RECEIVED').toUpperCase(),
        notes: order.notes || '',
        dueDate: order.dueDate ? new Date(order.dueDate).toISOString().split('T')[0] : '',
        clientId: order.clientId,
        clientName: order.client?.name || order.client || '' // Check if it's already a string or object
    });

    const [clients, setClientOptions] = useState<any[]>([]);
    const [assignableUsers, setAssignableUsers] = useState<any[]>([]);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const data = await ClientsService.getAll();
                setClientOptions(data);
            } catch (error) {
                console.error("Failed to fetch clients", error);
            }
        };
        const fetchUsers = async () => {
            try {
                const data = await UsersService.getAll();
                if (Array.isArray(data)) {
                    const filtered = data.filter(u => {
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
                }
            } catch (error) {
                console.error("Failed to fetch assignable users", error);
            }
        };
        fetchClients();
        fetchUsers();
    }, []);

    const formatUserRole = (role?: string, name?: string, email?: string) => {
        const r = String(role || '').toUpperCase();
        const str = `${r} ${name || ''} ${email || ''}`.toLowerCase();
        if (r === 'JOYERO' || str.includes('joyero')) return 'Joyero';
        if (r === 'DESIGNER' || r === 'DISENADOR' || r === 'DISEÑADOR' || str.includes('diseña') || str.includes('disena') || str.includes('design')) return 'Diseñador';
        return 'Admin';
    };

    // Initialize items from specifications or legacy fields
    const initialItems = order.specifications?.items?.map((it: any) => ({
        ...it,
        description: it.description || it.notes || it.trabajo || order.description || ''
    })) || [
        {
            item: order.pieceType || '',
            metal: order.metal || '',
            color: order.color || '',
            karats: order.karats || '',
            weight: order.weight || '',
            size: order.size || '',
            thickness: order.thickness || '',
            itemCode: order.itemCode || '',
            description: order.description || order.notes || ''
        }
    ];

    const [items, setItems] = useState<any[]>(initialItems);
    const [isSaving, setIsSaving] = useState(false);

    const handleItemChange = (index: number, field: string, value: string) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { item: '', metal: '', color: '', karats: '', weight: '', size: '', thickness: '', itemCode: '', description: '' }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const cleanNumber = (val: any) => {
                const str = String(val || '0').replace(/[^0-9.-]/g, '');
                return parseFloat(str) || 0;
            };

            // Sync first item to top-level fields for consistency/listing
            const syncedItems = items.map((it: any) => {
                const desc = it.description || it.notes || '';
                return {
                    ...it,
                    description: desc,
                    notes: desc
                };
            });
            const mainItem = syncedItems[0] || {};
            const submissionData = {
                ...formData,
                status: formData.status,
                stage: formData.status,
                priority: isJoyero ? (order.priority || 'MEDIA').toUpperCase() : formData.priority,
                value: cleanNumber(formData.value),
                cost: cleanNumber(formData.cost),
                totalAmount: cleanNumber(formData.value), // Ensure totalAmount is synced
                laborCost: cleanNumber(formData.laborCost),
                materialCost: cleanNumber(formData.materialCost),
                promisedAt: formData.promisedDate ? new Date(formData.promisedDate) : undefined,
                dueDate: formData.promisedDate ? new Date(formData.promisedDate) : (formData.dueDate ? new Date(formData.dueDate) : undefined),
                ...mainItem, // metal, color, etc.
                description: mainItem.description || mainItem.notes || '',
                notes: formData.notes || '',
                pieceType: mainItem.item,
                specifications: {
                    ...order.specifications,
                    assignedTo: formData.assignedTo || undefined,
                    assignedJeweler: formData.assignedTo || undefined,
                    items: syncedItems,
                    department: (formData.department || 'Taller Cared').trim(),
                    promisedDate: formData.promisedDate
                }
            };

            await onSave(submissionData);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 z-[110] w-full max-w-lg bg-background border-l border-border shadow-2xl flex flex-col transition-colors"
            >
                {/* Header */}
                <div className="p-8 border-b border-border bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <div className="size-10 rounded-xl bg-primary flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-primary-foreground">edit</span>
                        </div>
                        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div>
                        <h2 className="text-foreground text-xl font-black uppercase tracking-widest font-display transition-colors">Editar Pedido</h2>
                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1.5 transition-colors">Actualizar Información del Atelier</p>
                    </div>
                </div>
                {/* Form Body */}
                <form className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar" onSubmit={handleSubmit}>
                    {/* Section: General */}
                    <div className="space-y-6">
                        <h3 className="text-foreground text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2 transition-colors">
                            <span className="size-1.5 rounded-full bg-indigo-500"></span>
                            Configuración General y Cliente
                        </h3>
                        <div className="space-y-4">
                            <AutocompleteInput
                                name="client"
                                value={formData.clientName}
                                onChange={(val) => {
                                    const selected = clients.find(c => c.name === val);
                                    setFormData(prev => ({
                                        ...prev,
                                        clientName: val,
                                        clientId: selected?.id || prev.clientId
                                    }));
                                }}
                                options={clients.map(c => c.name)}
                                placeholder="Cambiar cliente..."
                                icon="person"
                            />
                        </div>
                        <div className="flex flex-col gap-4">
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Fecha Recibido (Sistema)</label>
                                <div className="flex items-center gap-3 bg-muted border border-border rounded-xl py-3 px-4 text-muted-foreground transition-colors shadow-inner">
                                    <span className="material-symbols-outlined text-[18px]">history</span>
                                    <span className="text-sm font-medium transition-colors">
                                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-MX', {
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        }) : 'N/A'}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors flex items-center justify-between">
                                    <span>Prioridad del Pedido</span>
                                    {isJoyero && <span className="text-amber-500 font-bold">(Solo lectura para Joyero)</span>}
                                </label>
                                <select
                                    disabled={isJoyero}
                                    value={(formData.priority || 'MEDIA').toUpperCase()}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm font-bold text-foreground focus:border-indigo-500/50 outline-none appearance-none cursor-pointer transition-colors shadow-inner disabled:opacity-60 disabled:cursor-not-allowed [color-scheme:light] dark:[color-scheme:dark]"
                                >
                                    <option value="BAJA" className="bg-background font-medium">Baja</option>
                                    <option value="MEDIA" className="bg-background font-medium">Media</option>
                                    <option value="ALTA" className="bg-background font-bold text-red-500">Alta ⚡</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Estado del Pedido / Flujo</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm font-bold text-foreground focus:border-indigo-500/50 outline-none appearance-none cursor-pointer transition-colors shadow-inner [color-scheme:light] dark:[color-scheme:dark]"
                                >
                                    {isJoyero ? (
                                        <>
                                            <option value={order.type === 'MANUFACTURE' ? 'READY_FOR_PICKUP' : 'REPAIR_COMPLETED'}>Terminado</option>
                                            <option value="RETURNED">Devuelto</option>
                                            {!['REPAIR_COMPLETED', 'READY_FOR_PICKUP', 'TERMINADO', 'RETURNED'].includes(formData.status) && (
                                                <option value={formData.status}>{formData.status} (Actual)</option>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <option value="RECEIVED">Recibido</option>
                                            <option value={order.type === 'MANUFACTURE' ? 'IN_PRODUCTION' : 'IN_REPAIR'}>En Taller</option>
                                            <option value={order.type === 'MANUFACTURE' ? 'READY_FOR_PICKUP' : 'REPAIR_COMPLETED'}>Terminado</option>
                                            <option value="DELIVERED">Entregado</option>
                                            <option value="RETURNED">Devuelto</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Departamento / Localización</label>
                                <SelectWithOther
                                    value={formData.department || 'Taller Cared'}
                                    onChange={(val) => setFormData({ ...formData, department: val })}
                                    options={['Taller Cared', 'Taller Fabiola', 'Relojero']}
                                    placeholder="Seleccionar departamento..."
                                    otherPlaceholder="Especificar otro departamento / localización..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors flex items-center justify-between">
                                    <span>Fecha Compromiso de Entrega</span>
                                    {isJoyero && <span className="text-amber-500 font-bold">(Solo lectura para Joyero)</span>}
                                </label>
                                <input
                                    type="date"
                                    disabled={isJoyero}
                                    value={formData.promisedDate || formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, promisedDate: e.target.value, dueDate: e.target.value })}
                                    className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/50 transition-all outline-none [color-scheme:light] dark:[color-scheme:dark] shadow-inner disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Ubicación (Física)</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/50 transition-all outline-none shadow-inner"
                                    placeholder="Ej. Taller Central, Caja Fuerte, Vitrina..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Piezas */}
                    <div className="space-y-8">
                        <div className="flex items-center justify-between pt-2 border-t border-border transition-colors">
                            <h3 className="text-foreground text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2 transition-colors">
                                <span className="size-1.5 rounded-full bg-amber-500"></span>
                                Ficha Técnica (Piezas)
                            </h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-white transition-colors text-[9px] font-black uppercase tracking-widest"
                            >
                                <span className="material-symbols-outlined text-sm">add_circle</span>
                                Agregar Pieza
                            </button>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="space-y-6 p-6 rounded-2xl bg-muted/30 border border-border relative group/item transition-colors shadow-sm">
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="absolute -top-2 -right-2 size-6 rounded-full bg-background border border-border text-muted-foreground hover:text-red-500 hover:border-red-500/30 dark:hover:text-red-400 transition-all flex items-center justify-center shadow-lg"
                                    >
                                        <span className="material-symbols-outlined text-xs">close</span>
                                    </button>
                                )}
                                <div className="flex flex-col gap-4">
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Pieza #{index + 1}</label>
                                        <PieceSelect
                                            value={item.item}
                                            onChange={(val) => handleItemChange(index, 'item', val)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Metal</label>
                                        <SelectWithOther
                                            value={item.metal}
                                            onChange={(val) => handleItemChange(index, 'metal', val)}
                                            options={['Oro', 'Plata', 'Platino']}
                                            placeholder="Seleccionar metal..."
                                            otherPlaceholder="Especificar otro metal..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Color</label>
                                        <SelectWithOther
                                            value={item.color}
                                            onChange={(val) => handleItemChange(index, 'color', val)}
                                            options={['Amarillo', 'Blanco', 'Rosa']}
                                            placeholder="Seleccionar color..."
                                            otherPlaceholder="Especificar otro color..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Quilates</label>
                                        <SelectWithOther
                                            value={item.karats}
                                            onChange={(val) => handleItemChange(index, 'karats', val)}
                                            options={['10 K', '14 K', '18 K', '21.6 K']}
                                            placeholder="Seleccionar quilates..."
                                            otherPlaceholder="Especificar otros quilates..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Peso (Gr)</label>
                                        <input value={item.weight} onChange={(e) => handleItemChange(index, 'weight', e.target.value)} onBlur={() => { if (item.weight && !item.weight.toUpperCase().endsWith('GR')) handleItemChange(index, 'weight', `${item.weight.trim()} GR`); }} className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/30 outline-none transition-colors shadow-inner" placeholder="0.0" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Medida</label>
                                        <input value={item.size} onChange={(e) => handleItemChange(index, 'size', e.target.value)} onBlur={() => { if (item.size && !item.size.toUpperCase().endsWith('CM')) handleItemChange(index, 'size', `${item.size.trim()} CM`); }} className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/30 outline-none transition-colors shadow-inner" placeholder="7" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Grosor</label>
                                        <input value={item.thickness} onChange={(e) => handleItemChange(index, 'thickness', e.target.value)} onBlur={() => { if (item.thickness && !item.thickness.toUpperCase().endsWith('MM')) handleItemChange(index, 'thickness', `${item.thickness.trim()} MM`); }} className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/30 outline-none transition-colors shadow-inner" placeholder="2mm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">SKU</label>
                                        <input value={item.itemCode} onChange={(e) => handleItemChange(index, 'itemCode', e.target.value)} className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/30 outline-none transition-colors shadow-inner" placeholder="REF-01" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Descripción del Trabajo</label>
                                        <textarea
                                            value={item.description}
                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                            className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/30 transition-all outline-none min-h-[80px] resize-none shadow-inner"
                                            placeholder="Ajuste, pulido, etc."
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Section: Finanzas */}
                    <div className="space-y-6">
                        <h3 className="text-foreground text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2 pt-2 border-t border-border transition-colors">
                            <span className="size-1.5 rounded-full bg-emerald-500"></span>
                            {canSeeCost ? 'Valores y Costos' : 'Valores'}
                        </h3>
                        <div className="flex flex-col gap-4">
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Mano de Obra (MXN)</label>
                                <input type="number" value={formData.laborCost} onChange={(e) => setFormData({ ...formData, laborCost: e.target.value })} className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/50 transition-all outline-none shadow-inner" />
                            </div>
                            {canSeeCost && (
                                <div className="space-y-2">
                                    <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Material (MXN)</label>
                                    <input type="number" value={formData.materialCost} onChange={(e) => setFormData({ ...formData, materialCost: e.target.value })} className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/50 transition-all outline-none shadow-inner" />
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Asignar a</label>
                                <div className="relative">
                                    <select
                                        value={formData.assignedTo || ''}
                                        onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                                        className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500 outline-none appearance-none cursor-pointer"
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
                            {!isJoyero && (
                                <div className="space-y-2">
                                    <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Venta Total (MXN)</label>
                                    <input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/50 transition-all outline-none shadow-inner" />
                                </div>
                            )}
                            {canSeeCost && (
                                <div className="space-y-2">
                                    <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Costo Total (MXN)</label>
                                    <input type="number" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/50 transition-all outline-none shadow-inner" />
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Section: Notas */}
                    <div className="space-y-4 pt-2 border-t border-border transition-colors">
                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Notas / Observaciones</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full bg-muted border border-border rounded-xl py-4 px-4 text-sm text-foreground transition-all min-h-[120px] resize-none outline-none focus:border-indigo-500/30 shadow-inner"
                        />
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="p-8 border-t border-border bg-muted/30 grid grid-cols-2 gap-4 transition-colors">
                    <button type="button" onClick={onClose} className="py-4 rounded-xl text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-foreground transition-all">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="py-4 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-primary/90 transition-all shadow-xl shadow-black/10 dark:shadow-white/5 active:scale-95 disabled:opacity-50 transition-colors"
                    >
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </motion.div>
        </>
    );
};
