
import React from 'react';
import { Link } from 'react-router-dom';
import { Client } from '../types';

const mockClients: Client[] = [
  { id: '8902', name: 'Alejandra Gómez', email: 'alejandra.g@example.com', phone: '+34 612 345 678', location: 'Madrid, España', spend: '125.400 €', status: 'VIP', joinDate: '2021', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAecXAJ_Kh2yMFGoR46arZpPnabn_5Smx3RV6nk1C4cyOC3E_ck4kuAMdiaKuCq-BIDpxNnlNGiz2_bSM0XWWLNTeoODo3s_Rc37icMqu_gEcwF3mnc8N3-XP8cuUab2dyU4hhI0oyECt0ql81fkAiwlww8AfSIQUvjNUAqX-hhztsC6ciAbpCdTdJMoqC5Pb34M6DlpP-QmYh38c2tIDiPjNas2PP7HLPdK1YPUWqYHHdRw4oNSY79FU376J4qx9cYofMwtTZhhc' },
  { id: '8903', name: 'Carlos Ruiz', email: 'carlos.ruiz@luxury.co', phone: '+34 655 987 654', location: 'Barcelona, España', spend: '42.800 €', status: 'Activo', joinDate: '2023', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsbgZu6q7gjBgjhdd6CroBAISPMg5E2ruOPle_-f0EpUWtdajmR0k_bKHvTIdMVjcnLMD8ZgfeCNKPiiGG6qg1nIhIWM16yy99aZZ0-8773BHvojgl4Zvmu-qpUc-Q_8Rbi4DE9OLbu4GCdfSs10v0Sxd1tDKoCSG8_JN5vzcs0wb7XXpOt3Av9LMt0E72uB5cu3yl6LYVAAqZ2HYZprEp1I-GZEo9BCp4QPVe9Cz6D3M1KLWhDy2ylmwTWADYQPCllLxnwBsu2AA' },
  { id: '8904', name: 'María Vargas', email: 'maria.vargas@design.es', phone: '+52 55 1234 5678', location: 'CDMX, México', spend: '0 €', status: 'Nuevo', joinDate: '2024' },
  { id: '8905', name: 'Sofia Loren', email: 'sofia.loren@art.it', phone: '+39 333 123 4567', location: 'Roma, Italia', spend: '890.000 €', status: 'VIP', joinDate: '2019', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVfoOFlWjOqSARLHMIkLlBLAJRnjc2PyixcI33zFyA2LejDX5ybTZnj4adDxhHjabArKy1L0M8e94b0W1PRXdD_3mPfoUGoWpHxRtb1LczKfUCrrQT-_M6vq8IO83tl1dqVb3KRTUT_Hcv6d_jKVTnAmDi48W_GZN5f1wk8hG81Hmr7miTW9CiNhL2jv3nY7dY8JOiK0xS-zLnqIXHkyPKMkR-xDlwtyA--s2NLfRsa9ZFJpW_TFf6T7hplDbDzymf_cYgBLk1PWw' },
  { id: '8906', name: 'Javier López', email: 'j.lopez@invest.com', phone: '+1 305 555 0199', location: 'Miami, USA', spend: '15.000 €', status: 'En Espera', joinDate: '2022' },
];

const Clients: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center py-8 px-6 md:px-10 lg:px-20 max-w-[1400px] mx-auto w-full">
      <div className="w-full flex flex-col gap-6">
        {/* Breadcrumbs */}
        <div className="flex flex-wrap gap-2 items-center text-slate-400 text-sm">
          <Link to="/" className="hover:text-primary transition-colors">Inicio</Link>
          <span className="material-symbols-outlined text-base">chevron_right</span>
          <span className="text-white">Gestión de Clientes</span>
        </div>

        {/* Heading */}
        <div className="flex flex-col md:flex-row flex-wrap justify-between gap-6 items-start md:items-end">
          <div className="flex flex-col gap-2 max-w-2xl">
            <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight">Gestión de Clientes</h1>
            <p className="text-slate-400 text-base font-normal">Administre sus relaciones con clientes VIP, historial de compras y preferencias de diseño.</p>
          </div>
          <button className="flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-blue-600 transition-colors h-10 px-6 text-white text-sm font-bold shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Nuevo Cliente</span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-card-dark rounded-xl p-4 border border-card-border flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative flex items-center w-full h-10 rounded-lg bg-background-dark border border-card-border overflow-hidden focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                <div className="grid place-items-center h-full w-12 text-slate-400">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input 
                  className="peer h-full w-full outline-none text-sm text-white bg-transparent pr-2 placeholder-slate-500" 
                  placeholder="Buscar por nombre, email o teléfono..." 
                  type="text" 
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex h-10 items-center justify-center gap-x-2 rounded-lg bg-background-dark border border-card-border px-4 hover:border-primary/50 text-white transition-colors">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">filter_list</span>
                <span className="text-sm font-medium">Filtros</span>
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-background-dark border border-card-border hover:text-white text-slate-400 transition-colors">
                <span className="material-symbols-outlined text-[20px]">grid_view</span>
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <span className="material-symbols-outlined text-[20px]">view_list</span>
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap items-center border-t border-card-border pt-4">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider mr-2">Estado:</span>
            <button className="flex h-7 items-center justify-center rounded-full bg-white text-background-dark px-3 hover:bg-gray-200 transition-colors text-xs font-bold">Todos</button>
            <button className="flex h-7 items-center justify-center rounded-full bg-card-border text-slate-400 px-3 hover:text-white transition-colors text-xs font-medium">VIP</button>
            <button className="flex h-7 items-center justify-center rounded-full bg-card-border text-slate-400 px-3 hover:text-white transition-colors text-xs font-medium">Nuevos</button>
            <button className="flex h-7 items-center justify-center rounded-full bg-card-border text-slate-400 px-3 hover:text-white transition-colors text-xs font-medium">En Espera</button>
            <div className="flex-1"></div>
            <span className="text-slate-400 text-xs">Mostrando <strong>1-5</strong> de <strong>45</strong></span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-card-border bg-card-dark shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-card-border bg-black/20 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">Cliente</th>
                  <th className="py-4 px-6">Contacto</th>
                  <th className="py-4 px-6">Ubicación</th>
                  <th className="py-4 px-6">Gasto Total</th>
                  <th className="py-4 px-6">Estado</th>
                  <th className="py-4 px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/50">
                {mockClients.map((client) => (
                  <tr key={client.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6">
                      <Link to={`/clients/${client.id}`} className="flex items-center gap-4 cursor-pointer">
                        <div className="relative size-10 flex-shrink-0">
                          {client.avatar ? (
                            <div className="size-10 rounded-full bg-cover bg-center" style={{ backgroundImage: `url('${client.avatar}')` }} />
                          ) : (
                            <div className="size-10 rounded-full bg-gradient-to-br from-blue-900 to-slate-800 border border-card-border text-white flex items-center justify-center text-xs font-bold uppercase">
                              {client.name.split(' ').map(n => n[0]).join('')}
                            </div>
                          )}
                          {client.status === 'VIP' && (
                            <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-green-500 border-2 border-card-dark"></div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white text-sm font-bold group-hover:text-primary transition-colors">{client.name}</span>
                          <span className="text-slate-500 text-xs">ID: CLI-{client.id}</span>
                        </div>
                      </Link>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1 text-xs text-slate-400">
                        <div className="flex items-center gap-2 group-hover:text-white transition-colors">
                          <span className="material-symbols-outlined text-[14px]">mail</span>
                          <span>{client.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[14px]">call</span>
                          <span>{client.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-white">{client.location}</td>
                    <td className="py-4 px-6 text-sm font-medium text-white">{client.spend}</td>
                    <td className="py-4 px-6">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button className="text-slate-500 hover:text-white p-1 rounded hover:bg-white/5 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-slate-500 hidden md:block">Mostrando 1 a 5 de 45 clientes</p>
          <div className="flex gap-2">
            <button className="h-10 px-4 rounded-lg border border-card-border bg-card-dark text-slate-400 hover:text-white transition-colors disabled:opacity-50" disabled>Anterior</button>
            <div className="hidden md:flex gap-1">
              <button className="w-10 h-10 rounded-lg bg-primary text-white text-sm font-bold">1</button>
              <button className="w-10 h-10 rounded-lg text-slate-400 hover:text-white transition-colors">2</button>
              <button className="w-10 h-10 rounded-lg text-slate-400 hover:text-white transition-colors">3</button>
              <span className="flex items-center justify-center w-10 text-slate-500">...</span>
              <button className="w-10 h-10 rounded-lg text-slate-400 hover:text-white transition-colors">9</button>
            </div>
            <button className="h-10 px-4 rounded-lg border border-card-border bg-card-dark text-slate-400 hover:text-white transition-colors">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: Client['status'] }> = ({ status }) => {
  const styles = {
    VIP: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Activo: 'bg-green-500/10 text-green-400 border-green-500/20',
    Nuevo: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'En Espera': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${styles[status]}`}>
      {status}
    </span>
  );
};

export default Clients;
