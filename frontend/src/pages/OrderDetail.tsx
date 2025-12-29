import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MOCK_ORDERS, OrderMock } from '../mockData';

const OrderDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [order, setOrder] = useState<OrderMock | null>(null);

    useEffect(() => {
        const foundOrder = id ? MOCK_ORDERS[id] : MOCK_ORDERS["7829"];
        if (foundOrder) {
            setOrder({ ...foundOrder });
        }
    }, [id]);

    if (!order) {
        return <div className="p-10 text-white font-black uppercase tracking-widest">Orden no encontrada</div>;
    }

    const updateField = (field: keyof OrderMock, value: any) => {
        setOrder(prev => prev ? { ...prev, [field]: value } : null);
    };

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Breadcrumbs & Header */}
            <header className="mb-10">
                <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-6">
                    <Link to="/dashboard" className="hover:text-white transition-colors">Inicio</Link>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    <Link to="/orders" className="hover:text-white transition-colors">Pedidos</Link>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    <span className="text-zinc-400">Pedido #ORD-{order.id}</span>
                </nav>

                <div className="flex flex-wrap justify-between items-end gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <h1 className="text-white text-5xl font-black tracking-tighter font-display">Pedido #ORD-{order.id}</h1>
                            <span className={`px-3 py-1 bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest rounded-full ${order.statusType === 'urgent' ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                                order.statusType === 'success' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                                    'text-indigo-400 border-indigo-500/20 bg-indigo-500/5'
                                }`}>{order.status}</span>
                        </div>
                        <div className="flex items-center gap-6 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                <span>Fecha de Creación: {order.date}</span>
                            </div>
                            <div className={`flex items-center gap-2 ${order.statusType === 'urgent' ? 'text-red-400' : 'text-indigo-400'}`}>
                                <span className="material-symbols-outlined text-[18px]">{order.statusType === 'urgent' ? 'priority_high' : 'info'}</span>
                                <span>{order.priority}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all text-[10px] font-black uppercase tracking-widest">
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                            <span>Editar Detalles</span>
                        </button>
                        <button className="flex items-center gap-2 px-8 py-3 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all text-[10px] font-black uppercase tracking-widest shadow-xl shadow-white/5">
                            <span className="material-symbols-outlined text-[20px]">sync</span>
                            <span>Actualizar Estado</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard label="Valor Total" value={order.value} onUpdate={(v) => updateField('value', v)} subtext="Impuestos incluidos" icon="payments" color="text-white" />
                <StatCard label="Costo de Producción" value={order.cost} onUpdate={(v) => updateField('cost', v)} subtext="Materiales + Mano de obra" icon="precision_manufacturing" color="text-white" />
                <StatCard label="Margen Estimado" value={(parseInt(order.value.replace(/\D/g, '')) - parseInt(order.cost.replace(/\D/g, ''))).toLocaleString() + ' MXN'} subtext="Rentabilidad alta" icon="trending_up" badge={order.margin} badgeColor="bg-emerald-500/10 text-emerald-400" />
                <StatCard label="Fecha de Entrega" value="15 Nov" subtext="Quedan 12 días" icon="event" color="text-white" alert="priority_high" alertColor="text-red-400" border={order.statusType === 'urgent' ? "border-l-4 border-l-red-500" : ""} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Column: Details & Client */}
                <div className="lg:col-span-4 space-y-10">
                    {/* Piece Details */}
                    <section className="bg-zinc-900/30 border border-zinc-900 rounded-[32px] p-8 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <span className="material-symbols-outlined text-indigo-400">diamond</span>
                            <h3 className="text-white text-[10px] font-black uppercase tracking-widest">Detalles de la Pieza</h3>
                        </div>
                        <div className="aspect-square bg-zinc-950 rounded-2xl border border-zinc-800 mb-8 flex items-center justify-center overflow-hidden group">
                            <div className="size-20 bg-zinc-900 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <span className="material-symbols-outlined text-zinc-700 text-4xl">image</span>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <DetailRow label="Tipo" value={order.item} onUpdate={(v) => updateField('item', v)} />
                            <DetailRow label="Material" value={order.material} onUpdate={(v) => updateField('material', v)} />
                            <DetailRow label="Gema Central" value={order.gem} onUpdate={(v) => updateField('gem', v)} />
                            <DetailRow label="Talla" value={order.size} onUpdate={(v) => updateField('size', v)} />
                            <DetailRow label="Grabado" value={order.engraving} onUpdate={(v) => updateField('engraving', v)} isItalic />
                        </div>
                    </section>

                    {/* Client Info */}
                    <section className="bg-zinc-900/30 border border-zinc-900 rounded-[32px] p-8 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-white text-[10px] font-black uppercase tracking-widest">Cliente</h3>
                            <button className="text-indigo-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline">
                                Ver Perfil <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-4 mb-8">
                            {order.avatar ? (
                                <img src={order.avatar} className="size-16 rounded-2xl object-cover grayscale opacity-80" alt="Client" />
                            ) : (
                                <div className={`size-16 rounded-2xl flex items-center justify-center text-xs font-black border border-zinc-800 shadow-xl ${order.initialsColor}`}>{order.initials}</div>
                            )}
                            <div>
                                <h4 className="text-white font-bold text-lg">{order.client}</h4>
                                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">VIP • Madrid, ES</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button className="flex items-center justify-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl py-3 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:border-zinc-700 transition-all">
                                <span className="material-symbols-outlined text-[18px]">mail</span> Email
                            </button>
                            <button className="flex items-center justify-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl py-3 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:border-zinc-700 transition-all">
                                <span className="material-symbols-outlined text-[18px]">call</span> Llamar
                            </button>
                        </div>
                    </section>

                    {/* Payment Status */}
                    <section className="bg-zinc-900/30 border border-zinc-900 rounded-[32px] p-8 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-white text-[10px] font-black uppercase tracking-widest">Estado del Pago</h3>
                            <span className={`px-2 py-0.5 border text-[8px] font-black uppercase tracking-widest rounded ${order.isPaid && order.pendingAmount === "0 €" ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>{order.isPaid && order.pendingAmount === "0 €" ? "Completo" : "Parcial"}</span>
                        </div>
                        <div className="space-y-6">
                            <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden p-[1px]">
                                <div className={`h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all bg-indigo-500`} style={{ width: `${order.paymentProgress}%` }}></div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between text-[11px] font-medium">
                                    <span className="text-zinc-500 uppercase tracking-widest">Pagado ({order.paymentProgress}%)</span>
                                    <span className="text-white font-black">{order.paidAmount}</span>
                                </div>
                                <div className="flex justify-between text-[11px] font-medium">
                                    <span className="text-zinc-500 uppercase tracking-widest">Pendiente</span>
                                    <span className="text-white font-black">{order.pendingAmount}</span>
                                </div>
                            </div>
                            <button className="w-full py-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:border-white transition-all shadow-lg active:scale-95">
                                Registrar Pago
                            </button>
                        </div>
                    </section>
                </div>

                {/* Right Column: Flow, Notes & Activity */}
                <div className="lg:col-span-8 space-y-10">
                    {/* Production Flow */}
                    <section className="bg-zinc-900/30 border border-zinc-900 rounded-[32px] p-8 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-12">
                            <h3 className="text-white text-[10px] font-black uppercase tracking-widest font-display">Flujo de Producción</h3>
                            <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-widest">Actualizado: Hace 2 horas</span>
                        </div>
                        <div className="relative flex justify-between items-center px-4">
                            <div className="absolute left-0 right-0 h-px bg-zinc-900 top-1/2 -translate-y-1/2 z-0"></div>
                            <FlowStep name="Diseño" icon="brush" active />
                            <FlowStep name="Gemas" icon="diamond" active />
                            <FlowStep name="Fundición" icon="bolt" current />
                            <FlowStep name="Engaste" icon="settings_suggest" />
                            <FlowStep name="Control" icon="fact_check" />
                            <FlowStep name="Entrega" icon="local_shipping" />
                        </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Order Notes */}
                        <section className="bg-zinc-900/30 border border-zinc-900 rounded-[32px] p-8 backdrop-blur-sm flex flex-col h-[500px]">
                            <h3 className="text-white text-[10px] font-black uppercase tracking-widest mb-8">Notas del Pedido</h3>
                            <div className="flex-1 bg-zinc-950/50 rounded-2xl border border-zinc-900 p-6 text-zinc-400 text-sm leading-relaxed font-medium italic mb-6">
                                El cliente solicitó un grabado especial en cursiva clásica.<br />
                                Revisar la pureza del platino antes de la fundición final.
                            </div>
                            <button className="w-full py-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-all">
                                Guardar Notas
                            </button>
                        </section>

                        {/* Recent Activity */}
                        <section className="bg-zinc-900/30 border border-zinc-900 rounded-[32px] p-8 backdrop-blur-sm h-[500px] flex flex-col">
                            <h3 className="text-white text-[10px] font-black uppercase tracking-widest mb-8">Actividad Reciente</h3>
                            <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 pr-4">
                                <ActivityItem user="Juan Pérez" action="movió el estado a" target="Fundición" time="Hace 2 horas" dotColor="bg-indigo-500" />
                                <ActivityItem user="Sistema" action="confirmó recepción de" target="Diamante 2.01ct" time="Ayer, 14:30" />
                                <ActivityItem user="Alejandra Gómez" action="realizó un pago de" target="9.250 €" time="12 Oct 2023, 10:15" />
                                <ActivityItem user="Sistema" action="Pedido creado por" target="Carlos Joyero" time="12 Oct 2023, 09:00" />
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EditableField: React.FC<{ value: string, onUpdate: (v: string) => void, className?: string, isItalic?: boolean }> = ({ value, onUpdate, className, isItalic }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);

    // Sync if external value changes
    useEffect(() => setCurrentValue(value), [value]);

    if (isEditing) {
        return (
            <input
                autoFocus
                className={`bg-zinc-800 text-white border-b border-indigo-500 outline-none px-1 rounded ${className}`}
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={() => { setIsEditing(false); onUpdate(currentValue); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditing(false); onUpdate(currentValue); } }}
            />
        );
    }

    return (
        <span
            onClick={() => setIsEditing(true)}
            className={`cursor-text hover:text-indigo-400 transition-colors border-b border-transparent hover:border-indigo-500/30 ${isItalic ? 'italic' : ''} ${className}`}
        >
            {value}
        </span>
    );
};

const StatCard: React.FC<{ label: string, value: string, subtext: string, icon: string, color: string, badge?: string, badgeColor?: string, alert?: string, alertColor?: string, border?: string, onUpdate?: (v: string) => void }> = ({ label, value, subtext, icon, color, badge, badgeColor, alert, alertColor, border, onUpdate }) => (
    <div className={`bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden group hover:border-zinc-700 transition-all ${border || ''}`}>
        <div className="flex justify-between items-start mb-6">
            <span className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">{label}</span>
            <span className={`material-symbols-outlined ${color} opacity-20 group-hover:opacity-100 transition-opacity text-[24px]`}>{icon}</span>
        </div>
        <div className="space-y-2">
            <div className="flex items-center gap-3">
                {onUpdate ? (
                    <EditableField value={value} onUpdate={onUpdate} className="text-white text-3xl font-black tracking-tight font-display" />
                ) : (
                    <span className="text-white text-3xl font-black tracking-tight font-display">{value}</span>
                )}
                {badge && <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${badgeColor}`}>{badge}</span>}
            </div>
            <div className="flex items-center gap-2">
                {alert && <span className={`material-symbols-outlined ${alertColor} text-[16px]`}>{alert}</span>}
                <p className="text-zinc-500 text-xs font-medium">{subtext}</p>
            </div>
        </div>
    </div>
);

const DetailRow: React.FC<{ label: string, value: string, isItalic?: boolean, onUpdate?: (v: string) => void }> = ({ label, value, isItalic, onUpdate }) => (
    <div className="flex justify-between items-baseline gap-4 group">
        <span className="text-zinc-600 text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{label}</span>
        <div className="h-px flex-1 bg-zinc-900/50 group-hover:bg-zinc-800 transition-colors"></div>
        {onUpdate ? (
            <EditableField value={value} onUpdate={onUpdate} isItalic={isItalic} className="text-white text-sm font-bold tracking-tight text-right min-w-[50px]" />
        ) : (
            <span className={`text-white text-sm font-bold tracking-tight text-right ${isItalic ? 'italic' : ''}`}>{value}</span>
        )}
    </div>
);

const FlowStep: React.FC<{ name: string, icon: string, active?: boolean, current?: boolean }> = ({ name, icon, active, current }) => (
    <div className="relative z-10 flex flex-col items-center gap-3 group">
        <div className={`size-12 rounded-full flex items-center justify-center transition-all duration-500 ${active || current ? 'bg-zinc-950 border-2' : 'bg-zinc-950 border border-zinc-900 text-zinc-700'} ${active ? 'border-emerald-500 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''} ${current ? 'border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-110' : ''}`}>
            <span className={`material-symbols-outlined text-[20px] ${active ? 'icon-fill' : ''}`}>{active ? 'check_circle' : icon}</span>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${active ? 'text-emerald-500' : current ? 'text-white' : 'text-zinc-700'}`}>{name}</span>
    </div>
);

const ActivityItem: React.FC<{ user: string, action: string, target: string, time: string, dotColor?: string }> = ({ user, action, target, time, dotColor }) => (
    <div className="flex gap-4 group">
        <div className="flex flex-col items-center gap-2">
            <div className={`size-3 rounded-full mt-1.5 border-2 border-zinc-950 transition-transform group-hover:scale-125 ${dotColor || 'bg-zinc-800 text-zinc-800'}`}></div>
            <div className="w-px flex-1 bg-zinc-900"></div>
        </div>
        <div className="pb-2">
            <p className="text-white text-sm font-medium">
                <span className="font-black text-indigo-400">{user}</span> {action} <span className="font-black text-white">{target}</span>
            </p>
            <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mt-1.5">{time}</p>
        </div>
    </div>
);

export default OrderDetail;
