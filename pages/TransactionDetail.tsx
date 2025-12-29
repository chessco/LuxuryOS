
import React from 'react';
import { useParams, Link } from 'react-router-dom';

const TransactionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark">
      <header className="bg-background-dark/80 backdrop-blur-md border-b border-card-border shrink-0 z-10">
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link className="hover:text-white" to="/finance">Finanzas</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-white">#TRX-{id}</span>
          </div>
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-white text-3xl font-black tracking-tight">Detalle de Transacción</h2>
              <p className="text-slate-500 text-sm">Visualizando movimiento financiero ID: #TRX-{id}-AB</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 bg-card-dark hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg border border-card-border transition-all text-sm">
                <span className="material-symbols-outlined text-[20px]">print</span>
                <span>Imprimir</span>
              </button>
              <button className="flex items-center gap-2 bg-card-dark hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg border border-card-border transition-all text-sm">
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-10">
          <div className="p-8 rounded-xl bg-card-dark border border-card-border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0 relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                <span className="material-symbols-outlined text-[32px] relative z-10">arrow_downward</span> 
              </div>
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  Ingreso Confirmado
                </p>
                <h1 className="text-white text-4xl md:text-5xl font-black tracking-tight">$22,500.00 <span className="text-xl text-slate-700 font-medium ml-1">MXN</span></h1>
              </div>
            </div>
            <div className="flex flex-col md:items-end gap-3 w-full md:w-auto border-t md:border-t-0 border-card-border pt-4 md:pt-0">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="material-symbols-outlined text-[16px]">check_circle</span> Completado
              </span>
              <p className="text-slate-500 text-sm font-medium">28 Oct 2023, 10:42 AM</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="p-6 rounded-xl bg-card-dark border border-card-border">
                <h3 className="text-white font-bold text-lg mb-6 border-b border-card-border pb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">info</span> Información General
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InfoItem label="ID Transacción" value={`#TRX-${id}-AB882`} isMono />
                  <InfoItem label="Método de Pago" value="Transferencia SPEI" />
                  <InfoItem label="Categoría" value="Anticipo de Orden" />
                  <InfoItem label="Cuenta Destino" value="BBVA Bancomer **** 8291" />
                </div>
                <div className="mt-8 pt-6 border-t border-card-border">
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-3">Notas / Concepto</p>
                  <div className="bg-background-dark/50 p-4 rounded-lg border border-card-border text-sm text-slate-300 leading-relaxed">
                    Pago de anticipo del 50% correspondiente a la Orden #4092. El saldo restante se cobrará al finalizar la producción.
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-card-dark border border-card-border">
                <h3 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">shopping_bag</span> Orden Relacionada
                </h3>
                <div className="bg-black/20 border border-card-border rounded-lg p-4 flex items-center gap-4 hover:border-primary/30 transition-all cursor-pointer">
                  <div className="w-16 h-16 bg-card-dark rounded border border-card-border flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-700 text-[32px]">diamond</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-base">Orden #4092</h4>
                    <p className="text-slate-500 text-sm">Anillo Solitario Zafiro • Talla 6.5</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-base">$45,000.00</p>
                    <p className="text-[10px] text-slate-600">Valor Total</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="p-6 rounded-xl bg-card-dark border border-card-border">
                <h3 className="text-white font-bold text-lg mb-6">Cliente Asociado</h3>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg ring-2 ring-card-dark">DA</div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Diego Alvarez</h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-primary/20 text-blue-200 border border-primary/30 font-bold uppercase tracking-wider">VIP</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <ClientAction icon="mail" text="diego.alvarez@example.com" />
                  <ClientAction icon="call" text="+52 55 1234 5678" />
                  <ClientAction icon="location_on" text="Polanco, CDMX" />
                </div>
                <button className="w-full mt-8 py-2.5 rounded-lg border border-card-border bg-background-dark hover:bg-slate-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  Ver Perfil <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
                </button>
              </div>

              <div className="p-6 rounded-xl bg-card-dark border border-card-border flex flex-col gap-3">
                <button className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white py-3 rounded-lg font-bold text-sm shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-[20px]">send</span> Enviar Recibo
                </button>
                <button className="flex items-center justify-center gap-2 bg-background-dark border border-card-border hover:bg-slate-700 text-white py-3 rounded-lg font-medium text-sm">
                  <span className="material-symbols-outlined text-[20px]">attach_file</span> Adjuntar Comprobante
                </button>
                <div className="h-px bg-card-border my-2"></div>
                <button className="text-red-400 hover:text-red-300 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">block</span> Reportar Problema
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const InfoItem: React.FC<{ label: string, value: string, isMono?: boolean }> = ({ label, value, isMono }) => (
  <div>
    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-2">{label}</p>
    <p className={`text-white text-sm ${isMono ? 'font-mono bg-background-dark px-3 py-2 rounded border border-card-border w-fit' : 'font-medium'}`}>{value}</p>
  </div>
);

const ClientAction: React.FC<{ icon: string, text: string }> = ({ icon, text }) => (
  <div className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer group">
    <div className="w-8 h-8 rounded-full bg-background-dark border border-card-border flex items-center justify-center group-hover:border-primary/50 transition-colors">
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
    </div>
    <span className="truncate">{text}</span>
  </div>
);

export default TransactionDetail;
