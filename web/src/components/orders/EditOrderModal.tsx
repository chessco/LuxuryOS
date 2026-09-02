import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AutocompleteInput from '../AutocompleteInput';
import { ClientsService } from '../../services/clients.service';

interface EditOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
    onSave: (data: any) => Promise<void>;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({ isOpen, onClose, order, onSave }) => {
    const [formData, setFormData] = useState({
        pieceType: order.pieceType,
        value: order.value,
        cost: order.cost,
        laborCost: order.laborCost || 0,
        materialCost: order.materialCost || 0,
        priority: (order.priority || 'MEDIA').toUpperCase(),
        location: order.location || '',
        notes: order.notes || '',
        dueDate: order.dueDate ? new Date(order.dueDate).toISOString().split('T')[0] : '',
        clientId: order.clientId,
        clientName: order.client?.name || order.client || '' // Check if it's already a string or object
    });

    const [clients, setClientOptions] = useState<any[]>([]);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const data = await ClientsService.getAll();
                setClientOptions(data);
            } catch (error) {
                console.error("Failed to fetch clients", error);
            }
        };
        fetchClients();
    }, []);

    // Initialize items from specifications or legacy fields
    const initialItems = order.specifications?.items || [
        {
            item: order.pieceType || '',
            metal: order.metal || '',
            color: order.color || '',
            karats: order.karats || '',
            weight: order.weight || '',
            size: order.size || '',
            thickness: order.thickness || '',
            itemCode: order.itemCode || '',
            description: order.description || ''
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
            const mainItem = items[0] || {};
            const submissionData = {
                ...formData,
                value: cleanNumber(formData.value),
                cost: cleanNumber(formData.cost),
                totalAmount: cleanNumber(formData.value), // Ensure totalAmount is synced
                laborCost: cleanNumber(formData.laborCost),
                materialCost: cleanNumber(formData.materialCost),
                ...mainItem, // metal, color, etc.
                pieceType: mainItem.item,
                specifications: { ...order.specifications, items }
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
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Prioridad del Joyero / Pedido</label>
                                <select
                                    value={(formData.priority || 'MEDIA').toUpperCase()}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm font-bold text-foreground focus:border-indigo-500/50 outline-none appearance-none cursor-pointer transition-colors shadow-inner [color-scheme:light] dark:[color-scheme:dark]"
                                >
                                    <option value="BAJA" className="bg-background font-medium">Baja</option>
                                    <option value="MEDIA" className="bg-background font-medium">Media</option>
                                    <option value="ALTA" className="bg-background font-bold text-red-500">Alta ⚡</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Fecha de Entrega</label>
                                <input
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/50 transition-all outline-none [color-scheme:light] dark:[color-scheme:dark] shadow-inner"
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
                                        <input
                                            value={item.item}
                                            onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                                            className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/30 transition-all outline-none shadow-inner [color-scheme:light] dark:[color-scheme:dark]"
                                            placeholder="Anillo, Collar, etc."
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Metal</label>
                                        <select
                                            value={item.metal}
                                            onChange={(e) => handleItemChange(index, 'metal', e.target.value)}
                                            className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/30 outline-none transition-colors shadow-inner appearance-none cursor-pointer"
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="Oro">Oro</option>
                                            <option value="Plata">Plata</option>
                                            <option value="Platino">Platino</option>
                                            <option value="Otros">Otros</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Color</label>
                                        <select
                                            value={item.color}
                                            onChange={(e) => handleItemChange(index, 'color', e.target.value)}
                                            className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/30 outline-none transition-colors shadow-inner appearance-none cursor-pointer"
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="Amarillo">Amarillo</option>
                                            <option value="Blanco">Blanco</option>
                                            <option value="Rosa">Rosa</option>
                                            <option value="Otros">Otros</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Quilates</label>
                                        <select
                                            value={item.karats}
                                            onChange={(e) => handleItemChange(index, 'karats', e.target.value)}
                                            className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/30 outline-none transition-colors shadow-inner appearance-none cursor-pointer"
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
                            Valores y Costos
                        </h3>
                        <div className="flex flex-col gap-4">
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Mano de Obra (MXN)</label>
                                <input type="number" value={formData.laborCost} onChange={(e) => setFormData({ ...formData, laborCost: e.target.value })} className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/50 transition-all outline-none shadow-inner" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Material (MXN)</label>
                                <input type="number" value={formData.materialCost} onChange={(e) => setFormData({ ...formData, materialCost: e.target.value })} className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/50 transition-all outline-none shadow-inner" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Venta Total (MXN)</label>
                                <input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/50 transition-all outline-none shadow-inner" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Costo Total (MXN)</label>
                                <input type="number" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm text-foreground focus:border-indigo-500/50 transition-all outline-none shadow-inner" />
                            </div>
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
