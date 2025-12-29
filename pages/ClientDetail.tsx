
import React from 'react';
import { useParams, Link } from 'react-router-dom';

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex-1 flex flex-col items-center py-8 px-6 md:px-10 lg:px-20 max-w-[1400px] mx-auto w-full">
      <div className="w-full flex flex-col gap-6">
        {/* Navigation */}
        <div className="flex flex-wrap gap-2 items-center text-slate-400 text-sm">
          <Link to="/" className="hover:text-primary transition-colors">Inicio</Link>
          <span className="material-symbols-outlined text-base">chevron_right</span>
          <Link to="/clients" className="hover:text-primary transition-colors">Clientes</Link>
          <span className="material-symbols-outlined text-base">chevron_right</span>
          <span className="text-white">Detalles de Alejandra Gómez</span>
        </div>

        {/* Heading */}
        <div className="flex flex-col md:flex-row flex-wrap justify-between gap-6 items-start md:items-end pb-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight">Alejandra Gómez</h1>
              <span className="inline-flex items-center rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-purple-400 border border-purple-500/20 shadow-sm shadow-purple-900/20">
                VIP
              </span>
            </div>
            <p className="text-slate-400 text-base font-normal leading-normal flex items-center gap-2">
              <span className="size-2 rounded-full bg-green-500 animate-pulse"></span>
              Última actividad: Hace 2 días
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="flex min-w-[84px] items-center justify-center rounded-lg h-10 px-4 border border-card-border bg-transparent hover:bg-card-border transition-colors text-white text-sm font-medium">
              <span className="material-symbols-outlined text-[20px] mr-2">edit</span>
              Editar Cliente
            </button>
            <button className="flex min-w-[84px] items-center justify-center rounded-lg h-10 px-6 bg-primary hover:bg-blue-600 transition-colors text-white text-sm font-bold shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-[20px] mr-2">add</span>
              Nuevo Pedido
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-card-dark border border-card-border rounded-xl p-6 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-primary/10 to-transparent"></div>
              <div className="relative z-10 size-28 rounded-full border-4 border-card-dark shadow-xl mb-4">
                <div 
                  className="size-full rounded-full bg-cover bg-center" 
                  style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBAecXAJ_Kh2yMFGoR46arZpPnabn_5Smx3RV6nk1C4cyOC3E_ck4kuAMdiaKuCq-BIDpxNnlNGiz2_bSM0XWWLNTeoODo3s_Rc37icMqu_gEcwF3mnc8N3-XP8cuUab2dyU4hhI0oyECt0ql81fkAiwlww8AfSIQUvjNUAqX-hhztsC6ciAbpCdTdJMoqC5Pb34M6DlpP-QmYh38c2tIDiPjNas2PP7HLPdK1YPUWqYHHdRw4oNSY79FU376J4qx9cYofMwtTZhhc')` }}
                />
              </div>
              <h3 className="text-white text-lg font-bold">Alejandra Gómez</h3>
              <p className="text-slate-500 text-sm mb-6">ID: #CLI-8902</p>
              
              <div className="w-full flex flex-col gap-4 text-left">
                <DetailRow icon="mail" label="Email" value="alejandra.g@example.com" />
                <DetailRow icon="call" label="Teléfono" value="+34 612 345 678" />
                <DetailRow icon="location_on" label="Ubicación" value="Madrid, España" />
                <DetailRow icon="calendar_month" label="Cliente Desde" value="15 Noviembre, 2021" />
              </div>
            </div>

            <div className="bg-card-dark border border-card-border rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-white text-base font-bold">Preferencias de Diseño</h4>
                <button className="text-primary hover:text-blue-400 text-xs font-bold uppercase">Editar</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Oro Rosa', 'Estilo Minimalista', 'Diamantes Talla Pera', 'Anillo Talla 52', 'Sin Níquel'].map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-md bg-background-dark border border-card-border text-xs text-slate-400 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="bg-card-dark border border-card-border rounded-xl p-6 flex flex-col">
              <h4 className="text-white text-base font-bold mb-4">Notas Privadas</h4>
              <textarea 
                className="w-full h-32 bg-background-dark border border-card-border rounded-lg p-3 text-sm text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary resize-none outline-none" 
                defaultValue="Preferencia por citas en horario de tarde. Interesada en la próxima colección de zafiros para el aniversario en Julio."
              />
              <button className="mt-3 w-full py-2 rounded-lg bg-card-border hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold uppercase transition-colors">
                Guardar Notas
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsCard label="Gasto Total" value="125.400 €" trend="+12%" icon="payments" />
              <StatsCard label="Pedidos Totales" value="8" trend="completados" icon="shopping_bag" />
              <StatsCard label="Ticket Promedio" value="15.675 €" icon="analytics" />
            </div>

            <div className="bg-card-dark border border-card-border rounded-xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-card-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-white text-lg font-bold">Historial de Pedidos</h3>
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-dark border border-card-border text-xs text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">filter_list</span>
                    Filtrar
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-dark border border-card-border text-xs text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Exportar
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/10 border-b border-card-border text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-6">ID Pedido</th>
                      <th className="py-4 px-6">Producto / Servicio</th>
                      <th className="py-4 px-6">Fecha</th>
                      <th className="py-4 px-6">Estado</th>
                      <th className="py-4 px-6 text-right">Valor</th>
                      <th className="py-4 px-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border/50">
                    <OrderRow id="ORD-7829" item="Anillo Solitario 2ct" date="12 Oct 2023" status="En Proceso" statusColor="text-blue-400 bg-blue-500/10 border-blue-500/20" value="18.500 €" icon="diamond" />
                    <OrderRow id="ORD-6521" item="Reloj Edición Limitada" date="05 Sep 2023" status="Entregado" statusColor="text-green-400 bg-green-500/10 border-green-500/20" value="45.000 €" icon="watch" />
                    <OrderRow id="ORD-5900" item="Diseño Personalizado" date="22 Jun 2023" status="Completado" statusColor="text-green-400 bg-green-500/10 border-green-500/20" value="8.200 €" icon="design_services" />
                    <OrderRow id="ORD-4102" item="Mantenimiento" date="10 Feb 2023" status="Entregado" statusColor="text-green-400 bg-green-500/10 border-green-500/20" value="450 €" icon="handyman" />
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-card-border flex justify-center bg-black/5">
                <button className="text-sm text-slate-500 hover:text-primary transition-colors font-medium">Ver historial completo</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailRow: React.FC<{ icon: string, label: string, value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-background-dark/50 border border-card-border">
    <div className="size-8 rounded-full bg-card-border flex items-center justify-center text-slate-400">
      <span className="material-symbols-outlined text-sm">{icon}</span>
    </div>
    <div className="flex flex-col overflow-hidden">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm text-white font-medium truncate">{value}</span>
    </div>
  </div>
);

const StatsCard: React.FC<{ label: string, value: string, trend?: string, icon: string }> = ({ label, value, trend, icon }) => (
  <div className="bg-card-dark border border-card-border rounded-xl p-5 flex flex-col gap-2 shadow-md">
    <div className="flex justify-between items-start">
      <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{label}</span>
      <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-white text-2xl font-black">{value}</span>
      {trend && (
        <span className={`${trend.includes('+') ? 'text-green-500' : 'text-slate-400'} text-xs font-bold`}>
          {trend}
        </span>
      )}
    </div>
  </div>
);

const OrderRow: React.FC<{ id: string, item: string, date: string, status: string, statusColor: string, value: string, icon: string }> = ({ id, item, date, status, statusColor, value, icon }) => (
  <tr className="group hover:bg-white/[0.02] transition-colors">
    <td className="py-4 px-6">
      <Link to={`/orders/${id.split('-')[1]}`} className="text-primary text-sm font-medium hover:underline cursor-pointer">{id}</Link>
    </td>
    <td className="py-4 px-6">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded bg-background-dark border border-card-border flex items-center justify-center text-slate-500">
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
        <span className="text-white text-sm">{item}</span>
      </div>
    </td>
    <td className="py-4 px-6 text-slate-400 text-sm">{date}</td>
    <td className="py-4 px-6">
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${statusColor}`}>
        {status}
      </span>
    </td>
    <td className="py-4 px-6 text-right text-white text-sm font-bold">{value}</td>
    <td className="py-4 px-6 text-right">
      <button className="text-slate-500 hover:text-white p-1 rounded hover:bg-white/5 transition-colors">
        <span className="material-symbols-outlined text-[18px]">visibility</span>
      </button>
    </td>
  </tr>
);

export default ClientDetail;
