import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Inline types and mock data to remove dependency on external file for now
interface ItemMock {
    id: string;
    sku: string;
    name: string;
    detail: string;
    type: string;
    location: string;
    quantity: number;
    value: string;
    cost: string;
    icon: string;
    color: string;
    alert?: boolean;
}

const MOCK_INVENTORY_DATA: Record<string, ItemMock> = {
    "101": { id: "101", sku: "RNG-DIA-001", name: "Anillo Diamante Solitario", detail: "Platino 950, 2.01ct", type: "Joyería", location: "Bóveda Principal", quantity: 3, value: "$150,000", cost: "$85,000", icon: "diamond", color: "text-zinc-400" },
    "102": { id: "102", sku: "WCH-RLX-002", name: "Reloj Oyster Perpetual", detail: "Acero, 41mm, Azul", type: "Relojería", location: "Vitrina 1", quantity: 1, value: "$220,000", cost: "$180,000", icon: "watch", color: "text-zinc-400" },
    "103": { id: "103", sku: "GEM-RUB-003", name: "Rubí Sangre de Pichón", detail: "3.5ct, Sin Tratamiento", type: "Gemas", location: "Caja Fuerte", quantity: 5, value: "$85,000", cost: "$40,000", icon: "diamond", color: "text-red-400" },
    "104": { id: "104", sku: "BRA-GLD-004", name: "Brazalete Tennis", detail: "Oro Blanco 18k, 5ctw", type: "Joyería", location: "Vitrina 2", quantity: 2, value: "$95,000", cost: "$55,000", icon: "stars", color: "text-zinc-400", alert: true },
};

const InventoryPage: React.FC = () => {
    // --- CRUD State ---
    const [items, setItems] = useState<Record<string, ItemMock>>(MOCK_INVENTORY_DATA);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ItemMock | null>(null);

    // --- Actions ---
    const handleDelete = (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este artículo del inventario?')) {
            const newItems = { ...items };
            delete newItems[id];
            setItems(newItems);
        }
    };

    const handleSave = (itemData: Partial<ItemMock>) => {
        if (editingItem) {
            // Edit
            setItems(prev => ({
                ...prev,
                [editingItem.id]: { ...editingItem, ...itemData } as ItemMock
            }));
        } else {
            // Create
            const id = Math.floor(Math.random() * 10000).toString();
            const newItem: ItemMock = {
                id,
                sku: itemData.sku || `NEW-${id}`,
                name: itemData.name || 'Nuevo Artículo',
                detail: itemData.detail || '',
                type: itemData.type || 'Joyería',
                location: itemData.location || 'Bodega',
                quantity: itemData.quantity || 0,
                value: itemData.value || '0 MXN',
                cost: itemData.cost || '0 MXN',
                icon: itemData.icon || 'diamond',
                color: 'text-zinc-400',
                ...itemData
            } as ItemMock;
            setItems(prev => ({ ...prev, [id]: newItem }));
        }
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const openModal = (item?: ItemMock) => {
        setEditingItem(item || null);
        setIsModalOpen(true);
    };

    return (
        <div className="flex-1 flex flex-col items-center max-w-[1400px] mx-auto w-full">
            <div className="w-full flex flex-col gap-8">
                {/* Heading */}
                <div className="flex flex-col lg:flex-row flex-wrap justify-between gap-6 items-start lg:items-end">
                    <div className="flex flex-col gap-3 max-w-2xl">
                        <h1 className="text-white text-4xl font-black tracking-tight font-display">Inventario</h1>
                        <p className="text-zinc-500 text-sm font-medium">Control de existencias, ubicación y valoración de piezas de lujo.</p>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-200 transition-all h-12 px-8 text-black text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-white/5 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        <span>Nuevo Artículo</span>
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryStat label="Valor Total" value="$845,200" />
                    <SummaryStat label="Piezas" value={Object.keys(items).length.toString()} />
                    <SummaryStat label="Stock Bajo" value="5" badge="Alerta" badgeColor="text-red-400 bg-red-400/10 border-red-400/20" />
                    <SummaryStat label="En Consignación" value="12" />
                </div>

                {/* Toolbar */}
                <div className="bg-zinc-900/30 rounded-2xl p-6 border border-zinc-900 backdrop-blur-sm flex flex-col gap-6">
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                        <div className="flex-1 max-w-md">
                            <div className="relative flex items-center w-full h-12 rounded-xl bg-zinc-900/50 border border-zinc-900 overflow-hidden focus-within:border-zinc-700 transition-all">
                                <div className="grid place-items-center h-full w-12 text-zinc-500">
                                    <span className="material-symbols-outlined">search</span>
                                </div>
                                <input
                                    className="peer h-full w-full outline-none text-sm text-white bg-transparent pr-2 placeholder-zinc-600"
                                    placeholder="Buscar por nombre, SKU o categoría..."
                                    type="text"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                            {['Ubicación', 'Stock Bajo', 'Diamantes', 'Filtros'].map(f => (
                                <button key={f} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-900/50 border border-zinc-900 px-6 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                    {f === 'Stock Bajo' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"></span>}
                                    <span>{f}</span>
                                    {['Ubicación', 'Filtros'].includes(f) && <span className="material-symbols-outlined text-[18px] text-zinc-600">{f === 'Filtros' ? 'filter_list' : 'keyboard_arrow_down'}</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-900/40 border-b border-zinc-900 text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                <th className="px-8 py-5 font-bold w-1/2">Artículo</th>
                                <th className="px-8 py-5 font-bold">Ubicación</th>
                                <th className="px-8 py-5 font-bold text-center">Cantidad</th>
                                <th className="px-8 py-5 font-bold text-right">Valor</th>
                                <th className="px-8 py-5 font-bold text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/50">
                            {(Object.values(items) as ItemMock[]).map(item => (
                                <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-5">
                                            <div className="h-14 w-14 rounded-2xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-center shadow-xl shrink-0 group-hover:border-zinc-600 transition-colors">
                                                <span className="material-symbols-outlined text-[24px] text-zinc-400 group-hover:text-white transition-colors">{item.icon}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-base leading-tight tracking-tight group-hover:underline decoration-zinc-800 underline-offset-4">{item.name}</h4>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">SKU: {item.sku}</span>
                                                    <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                                                    <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{item.detail}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                                            <span className="material-symbols-outlined text-[18px] text-zinc-700">location_on</span>
                                            <span>{item.location}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="font-black text-white text-base">{item.quantity}</span>
                                            {item.alert && <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse"></span>}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <p className="font-bold text-white text-base">{item.value}</p>
                                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-0.5">COST: {item.cost}</p>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openModal(item); }}
                                                className="p-2 rounded-xl text-zinc-700 hover:text-white hover:bg-zinc-800 transition-all"
                                                title="Editar"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">edit</span>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                className="p-2 rounded-xl text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                title="Eliminar"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="px-8 py-5 border-t border-zinc-900 bg-black/10 flex items-center justify-between">
                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Mostrando {(Object.values(items) as ItemMock[]).length} artículos</p>
                        <div className="flex gap-2">
                            <button className="h-10 px-6 rounded-xl border border-zinc-900 bg-zinc-900/50 text-zinc-600 text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-zinc-700 transition-all">Anterior</button>
                            <button className="h-10 px-6 rounded-xl border border-zinc-900 bg-zinc-900/50 text-zinc-600 text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-zinc-700 transition-all">Siguiente</button>
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <InventoryModal
                    item={editingItem}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

const SummaryStat: React.FC<{ label: string, value: string, badge?: string, badgeColor?: string }> = ({ label, value, badge, badgeColor }) => (
    <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-900 backdrop-blur-sm shadow-sm flex flex-col gap-2">
        <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
        <div className="flex items-center gap-3">
            <p className="text-white text-2xl font-black tracking-tighter">{value}</p>
            {badge && <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border ${badgeColor}`}>{badge}</span>}
        </div>
    </div>
);

const InventoryModal: React.FC<{ item: ItemMock | null, onClose: () => void, onSave: (data: Partial<ItemMock>) => void }> = ({ item, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<ItemMock>>(item || {
        sku: '',
        name: '',
        type: 'Joyería',
        location: '',
        quantity: 1,
        value: '',
        cost: '',
        icon: 'diamond'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-900 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="px-8 py-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/40">
                    <h2 className="text-white text-lg font-black uppercase tracking-widest font-display">
                        {item ? 'Editar Artículo' : 'Nuevo Artículo'}
                    </h2>
                    <button onClick={onClose} className="size-8 flex items-center justify-center rounded-lg hover:bg-zinc-900 text-zinc-600 hover:text-white transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form className="p-8 space-y-6" onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">SKU</label>
                            <input
                                name="sku"
                                value={formData.sku}
                                onChange={handleChange}
                                required
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white focus:outline-none transition-all placeholder-zinc-700"
                                placeholder="Ej. RNG-001"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Nombre</label>
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white focus:outline-none transition-all placeholder-zinc-700"
                                placeholder="Ej. Anillo Diamante"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Ubicación</label>
                            <select
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white focus:outline-none transition-all"
                            >
                                <option value="">Seleccionar...</option>
                                <option value="Bóveda Principal">Bóveda Principal</option>
                                <option value="Vitrina 1">Vitrina 1</option>
                                <option value="Vitrina 2">Vitrina 2</option>
                                <option value="Caja Fuerte">Caja Fuerte</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Categoría</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white focus:outline-none transition-all"
                            >
                                <option value="Joyería">Joyería</option>
                                <option value="Relojería">Relojería</option>
                                <option value="Gemas">Gemas</option>
                                <option value="Accesorios">Accesorios</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Cantidad</label>
                            <input
                                name="quantity"
                                type="number"
                                value={formData.quantity}
                                onChange={handleChange}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white focus:outline-none transition-all placeholder-zinc-700"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Valor Venta</label>
                            <input
                                name="value"
                                value={formData.value}
                                onChange={handleChange}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white focus:outline-none transition-all placeholder-zinc-700"
                                placeholder="$0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Costo</label>
                            <input
                                name="cost"
                                value={formData.cost}
                                onChange={handleChange}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white focus:outline-none transition-all placeholder-zinc-700"
                                placeholder="$0.00"
                            />
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl hover:bg-zinc-900 text-zinc-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest">Cancelar</button>
                        <button type="submit" className="px-8 py-3 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all text-xs font-bold uppercase tracking-widest shadow-lg shadow-white/10">Guardar Artículo</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InventoryPage;
