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
        priority: order.priority,
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
            itemCode: order.itemCode || ''
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
        setItems([...items, { item: '', metal: '', color: '', karats: '', weight: '', size: '', itemCode: '' }]);
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
                className="fixed inset-y-0 right-0 z-[110] w-full max-w-lg bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-900 shadow-2xl flex flex-col transition-colors"
            >
                {/* Header */}
                <div className="p-8 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/20 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <div className="size-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-white dark:text-black">edit</span>
                        </div>
                        <button onClick={onClose} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div>
                        <h2 className="text-zinc-900 dark:text-white text-xl font-black uppercase tracking-widest font-display transition-colors">Editar Pedido</h2>
                        <p className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1.5 transition-colors">Actualizar Información del Atelier</p>
                    </div>
                </div>
                {/* Form Body */}
                <form className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar" onSubmit={handleSubmit}>
                    {/* Section: General */}
                    <div className="space-y-6">
                        <h3 className="text-zinc-900 dark:text-white text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2 transition-colors">
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-2">
                                <label className="text-zinc-400 dark:text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Fecha Recibido (Sistema)</label>
                                <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-900 rounded-xl py-3 px-4 text-zinc-500 transition-colors shadow-inner">
                                    <span className="material-symbols-outlined text-[18px]">history</span>
                                    <span className="text-sm font-medium transition-colors">
                                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-MX', {
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        }) : 'N/A'}
                                    </span>
                                </div>
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-zinc-400 dark:text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Prioridad</label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 rounded-xl py-3 px-4 text-sm text-zinc-900 dark:text-white focus:border-zinc-300 dark:focus:border-zinc-700 outline-none appearance-none cursor-pointer transition-colors shadow-inner [color-scheme:light] dark:[color-scheme:dark]"
                                >
                                    <option value="BAJA" className="bg-white dark:bg-zinc-900">Baja</option>
                                    <option value="MEDIA" className="bg-white dark:bg-zinc-900">Media</option>
                                    <option value="ALTA" className="bg-white dark:bg-zinc-900">Alta</option>
                                </select>
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-zinc-400 dark:text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Fecha de Entrega</label>
                                <input
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 rounded-xl py-3 px-4 text-sm text-zinc-900 dark:text-white focus:border-indigo-500/50 dark:focus:border-white transition-all outline-none [color-scheme:light] dark:[color-scheme:dark] shadow-inner"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Piezas */}
                    <div className="space-y-8">
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-900/50 transition-colors">
                            <h3 className="text-zinc-900 dark:text-white text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2 transition-colors">
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
                            <div key={index} className="space-y-6 p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-900 relative group/item transition-colors shadow-sm">
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="absolute -top-2 -right-2 size-6 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:text-red-500 hover:border-red-500/30 dark:hover:text-red-400 transition-all flex items-center justify-center shadow-lg"
                                    >
                                        <span className="material-symbols-outlined text-xs">close</span>
                                    </button>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-zinc-400 dark:text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Pieza #{index + 1}</label>
                                        <input
                                            value={item.item}
                                            onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                                            className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 rounded-xl py-3 px-4 text-sm text-zinc-900 dark:text-white focus:border-zinc-300 dark:focus:border-zinc-700 transition-all outline-none shadow-inner [color-scheme:light] dark:[color-scheme:dark]"
                                            placeholder="Anillo, Collar, etc."
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 dark:text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Metal</label>
                                        <input value={item.metal} onChange={(e) => handleItemChange(index, 'metal', e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 rounded-xl py-3 px-4 text-sm text-zinc-900 dark:text-white focus:border-zinc-300 dark:focus:border-zinc-700 outline-none transition-colors shadow-inner" placeholder="Oro, Plata" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 dark:text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Color</label>
                                        <input value={item.color} onChange={(e) => handleItemChange(index, 'color', e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 rounded-xl py-3 px-4 text-sm text-zinc-900 dark:text-white focus:border-zinc-300 dark:focus:border-zinc-700 outline-none transition-colors shadow-inner" placeholder="Blanco..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 dark:text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Quilates</label>
                                        <input value={item.karats} onChange={(e) => handleItemChange(index, 'karats', e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 rounded-xl py-3 px-4 text-sm text-zinc-900 dark:text-white focus:border-zinc-300 dark:focus:border-zinc-700 outline-none transition-colors shadow-inner" placeholder="14k" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 dark:text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Peso (Gr)</label>
                                        <input value={item.weight} onChange={(e) => handleItemChange(index, 'weight', e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 rounded-xl py-3 px-4 text-sm text-zinc-900 dark:text-white focus:border-zinc-300 dark:focus:border-zinc-700 outline-none transition-colors shadow-inner" placeholder="0.0" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 dark:text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Medida</label>
                                        <input value={item.size} onChange={(e) => handleItemChange(index, 'size', e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 rounded-xl py-3 px-4 text-sm text-zinc-900 dark:text-white focus:border-zinc-300 dark:focus:border-zinc-700 outline-none transition-colors shadow-inner" placeholder="7" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 dark:text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1 transition-colors">SKU</label>
                                        <input value={item.itemCode} onChange={(e) => handleItemChange(index, 'itemCode', e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 rounded-xl py-3 px-4 text-sm text-zinc-900 dark:text-white focus:border-zinc-300 dark:focus:border-zinc-700 outline-none transition-colors shadow-inner" placeholder="REF-01" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Section: Finanzas */}
                    <div className="space-y-6">
                        <h3 className="text-zinc-900 dark:text-white text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900/30 transition-colors">
                            <span className="size-1.5 rounded-full bg-emerald-500"></span>
                            Valores y Costos
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-zinc-400 dark:text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Venta (MXN)</label>
                                <input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 rounded-xl py-3 px-4 text-sm text-zinc-900 dark:text-white focus:border-indigo-500/50 dark:focus:border-white transition-all outline-none shadow-inner" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-zinc-400 dark:text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Costo (MXN)</label>
                                <input type="number" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 rounded-xl py-3 px-4 text-sm text-zinc-900 dark:text-white focus:border-indigo-500/50 dark:focus:border-white transition-all outline-none shadow-inner" />
                            </div>
                        </div>
                    </div>
                    {/* Section: Notas */}
                    <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-900/50 transition-colors">
                        <label className="text-zinc-400 dark:text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1 transition-colors">Notas / Observaciones</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 rounded-xl py-4 px-4 text-sm text-zinc-900 dark:text-white transition-all min-h-[120px] resize-none outline-none focus:border-zinc-300 dark:focus:border-zinc-700 shadow-inner"
                        />
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="p-8 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/20 grid grid-cols-2 gap-4 transition-colors">
                    <button type="button" onClick={onClose} className="py-4 rounded-xl text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white transition-all">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-black dark:hover:bg-zinc-200 transition-all shadow-xl shadow-black/10 dark:shadow-white/5 active:scale-95 disabled:opacity-50 transition-colors"
                    >
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </motion.div>
        </>
    );
};
