
import React from 'react';
import { useParams, Link } from 'react-router-dom';

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex-1 flex flex-col items-center py-8 px-6 md:px-10 lg:px-20 max-w-[1400px] mx-auto w-full">
      <div className="w-full flex flex-col gap-6">
        <div className="flex flex-wrap gap-2 items-center text-slate-400 text-sm">
          <Link to="/" className="hover:text-primary transition-colors">Inicio</Link>
          <span className="material-symbols-outlined text-base">chevron_right</span>
          <Link to="/orders" className="hover:text-primary transition-colors">Pedidos</Link>
          <span className="material-symbols-outlined text-base">chevron_right</span>
          <span className="text-white">Pedido #ORD-{id}</span>
        </div>

        <div className="flex flex-col md:flex-row flex-wrap justify-between gap-6 items-start md:items-end pb-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight">Pedido #ORD-{id}</h1>
              <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-400 border border-blue-500/20 shadow-sm shadow-blue-900/20">
                En Proceso
              </span>
            </div>
            <p className="text-slate-400 text-base font-normal flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              Fecha de Creación: 12 Oct 2023
              <span className="mx-2">•</span>
              <span className="text-white font-medium">Prioridad Alta</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="flex min-w-[84px] items-center justify-center rounded-lg h-10 px-4 border border-card-border bg-transparent hover:bg-card-border transition-colors text-white text-sm font-medium">
              <span className="material-symbols-outlined text-[20px] mr-2">edit</span>
              Editar Detalles
            </button>
            <button className="flex min-w-[84px] items-center justify-center rounded-lg h-10 px-6 bg-primary hover:bg-blue-600 transition-colors text-white text-sm font-bold shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-[20px] mr-2">update</span>
              Actualizar Estado
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <DetailStat label="Valor Total" value="18.500 €" sub="Impuestos incluidos" icon="payments" />
          <DetailStat label="Costo Producción" value="8.250 €" sub="Materiales + Mano" icon="engineering" />
          <DetailStat label="Margen" value="10.250 €" badge="55%" icon="trending_up" />
          <DetailStat label="Fecha Entrega" value="15 Nov" sub="Quedan 12 días" icon="event_busy" urgent />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-card-dark border border-card-border rounded-xl p-6">
              <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">diamond</span>
                Detalles de la Pieza
              </h3>
              <div className="aspect-video w-full rounded-lg bg-[#282e39] mb-4 flex items-center justify-center border border-card-border">
                <span className="material-symbols-outlined text-slate-500 text-4xl">image</span>
              </div>
              <div className="flex flex-col gap-3">
                <ItemProp label="Tipo" value="Anillo Solitario" />
                <ItemProp label="Material" value="Platino 950" />
                <ItemProp label="Gema Central" value="Diamante 2.01ct, VVS1, D" />
                <ItemProp label="Talla" value="52 EU" />
                <ItemProp label="Grabado" value='"A & J Forever"' isItalic />
              </div>
            </div>

            <div className="bg-card-dark border border-card-border rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-white text-base font-bold">Cliente</h4>
                <Link to="/clients/8902" className="text-primary hover:text-blue-400 text-xs font-bold uppercase flex items-center gap-1">
                  Ver Perfil <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </Link>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="size-12 rounded-full border-2 border-card-border overflow-hidden">
                  <div 
                    className="size-full bg-cover bg-center" 
                    style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBAecXAJ_Kh2yMFGoR46arZpPnabn_5Smx3RV6nk1C4cyOC3E_ck4kuAMdiaKuCq-BIDpxNnlNGiz2_bSM0XWWLNTeoODo3s_Rc37icMqu_gEcwF3mnc8N3-XP8cuUab2dyU4hhI0oyECt0ql81fkAiwlww8AfSIQUvjNUAqX-hhztsC6ciAbpCdTdJMoqC5Pb34M6DlpP-QmYh38c2tIDiPjNas2PP7HLPdK1YPUWqYHHdRw4oNSY79FU376J4qx9cYofMwtTZhhc')` }}
                  />
                </div>
                <div>
                  <p className="text-white font-bold">Alejandra Gómez</p>
                  <p className="text-slate-500 text-sm">VIP • Madrid, ES</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 p-2 rounded bg-background-dark border border-card-border text-xs text-slate-400 hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[16px]">mail</span> Email
                </button>
                <button className="flex items-center justify-center gap-2 p-2 rounded bg-background-dark border border-card-border text-xs text-slate-400 hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[16px]">call</span> Llamar
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-card-dark border border-card-border rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white text-lg font-bold">Flujo de Producción</h3>
                <span className="text-slate-500 text-sm">Actualizado: Hace 2 horas</span>
              </div>
              <div className="relative pt-4 pb-2">
                <div className="absolute top-[44px] left-0 w-full h-0.5 bg-card-border -translate-y-1/2 z-0"></div>
                <div className="relative z-10 flex justify-between">
                  <FlowStep icon="design_services" label="Diseño" active />
                  <FlowStep icon="diamond" label="Gemas" active />
                  <FlowStep icon="whatshot" label="Fundición" isCurrent />
                  <FlowStep icon="handyman" label="Engaste" />
                  <FlowStep icon="fact_check" label="Control" />
                  <FlowStep icon="local_shipping" label="Entrega" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
              <div className="bg-card-dark border border-card-border rounded-xl p-6 flex flex-col">
                <h4 className="text-white text-base font-bold mb-4">Notas del Pedido</h4>
                <textarea 
                  className="w-full h-full min-h-[160px] bg-background-dark border border-card-border rounded-lg p-3 text-sm text-white placeholder-slate-600 focus:border-primary outline-none" 
                  defaultValue="El cliente solicitó un grabado especial en cursiva clásica. Revisar la pureza del platino antes de la fundición final."
                />
                <button className="mt-3 w-full py-2 rounded-lg bg-card-border hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold uppercase transition-colors">Guardar Notas</button>
              </div>
              <div className="bg-card-dark border border-card-border rounded-xl p-6 flex flex-col">
                <h4 className="text-white text-base font-bold mb-4">Actividad Reciente</h4>
                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                  <RecentActivityItem title="Juan Pérez" action="movió el estado a" target="Fundición" time="Hace 2 horas" isPrimary />
                  <RecentActivityItem title="Sistema" action="confirmó recepción de" target="Diamante 2.01ct" time="Ayer, 14:30" />
                  <RecentActivityItem title="Alejandra Gómez" action="realizó un pago de" target="9.250 €" time="12 Oct 2023" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailStat: React.FC<{ label: string, value: string, sub?: string, badge?: string, icon: string, urgent?: boolean }> = ({ label, value, sub, badge, icon, urgent }) => (
  <div className={`bg-card-dark border rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden ${urgent ? 'border-l-4 border-l-red-500 border-card-border' : 'border-card-border'}`}>
    <div className="absolute right-0 top-0 p-4 opacity-5">
      <span className="material-symbols-outlined text-6xl">{icon}</span>
    </div>
    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-white text-2xl font-black">{value}</span>
      {badge && <span className="bg-green-500/10 text-green-400 text-xs px-1.5 py-0.5 rounded border border-green-500/20">{badge}</span>}
    </div>
    <span className={`text-[10px] ${urgent ? 'text-red-400 flex items-center gap-1' : 'text-slate-600'}`}>
      {urgent && <span className="material-symbols-outlined text-[14px]">warning</span>}
      {sub}
    </span>
  </div>
);

const ItemProp: React.FC<{ label: string, value: string, isItalic?: boolean }> = ({ label, value, isItalic }) => (
  <div className="flex justify-between border-b border-card-border pb-2 last:border-0">
    <span className="text-slate-500 text-sm">{label}</span>
    <span className={`text-white text-sm font-medium ${isItalic ? 'italic' : ''}`}>{value}</span>
  </div>
);

const FlowStep: React.FC<{ icon: string, label: string, active?: boolean, isCurrent?: boolean }> = ({ icon, label, active, isCurrent }) => (
  <div className="flex flex-col items-center gap-2">
    <div className={`size-10 rounded-full border-2 flex items-center justify-center transition-all ${
      isCurrent ? 'bg-primary border-primary text-white scale-110 shadow-lg shadow-primary/30 z-10' : 
      active ? 'border-green-500 text-green-500 bg-card-dark' : 'border-card-border text-slate-600 bg-card-dark'
    }`}>
      <span className={`material-symbols-outlined text-xl ${isCurrent ? 'animate-pulse' : ''}`}>{icon}</span>
    </div>
    <span className={`text-[10px] font-bold uppercase tracking-wide ${isCurrent ? 'text-primary' : active ? 'text-green-500' : 'text-slate-600'}`}>
      {label}
    </span>
  </div>
);

const RecentActivityItem: React.FC<{ title: string, action: string, target: string, time: string, isPrimary?: boolean }> = ({ title, action, target, time, isPrimary }) => (
  <div className="relative pl-4 border-l border-card-border pb-1">
    <div className={`absolute -left-[6.5px] top-1 size-3 rounded-full border border-card-dark ${isPrimary ? 'bg-primary' : 'bg-slate-700'}`}></div>
    <p className="text-sm font-normal text-slate-400">
      <span className="font-bold text-white">{title}</span> {action} <span className={`${isPrimary ? 'text-primary' : 'text-white'} font-medium`}>{target}</span>
    </p>
    <p className="text-[10px] text-slate-600 mt-1">{time}</p>
  </div>
);

export default OrderDetail;
