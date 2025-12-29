"use client";

import React from 'react';
import Link from 'next/link';
import { Client } from '@/lib/types';

const mockClients: Client[] = [
  { id: '8902', name: 'Alejandra Gómez', email: 'alejandra.g@example.com', phone: '+34 612 345 678', location: 'Madrid, España', spend: '125.400 €', status: 'VIP', joinDate: '2021', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAecXAJ_Kh2yMFGoR46arZpPnabn_5Smx3RV6nk1C4cyOC3E_ck4kuAMdiaKuCq-BIDpxNnlNGiz2_bSM0XWWLNTeoODo3s_Rc37icMqu_gEcwF3mnc8N3-XP8cuUab2dyU4hhI0oyECt0ql81fkAiwlww8AfSIQUvjNUAqX-hhztsC6ciAbpCdTdJMoqC5Pb34M6DlpP-QmYh38c2tIDiPjNas2PP7HLPdK1YPUWqYHHdRw4oNSY79FU376J4qx9cYofMwtTZhhc' },
  { id: '8903', name: 'Carlos Ruiz', email: 'carlos.ruiz@luxury.co', phone: '+34 655 987 654', location: 'Barcelona, España', spend: '42.800 €', status: 'Activo', joinDate: '2023', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsbgZu6q7gjBgjhdd6CroBAISPMg5E2ruOPle_-f0EpUWtdajmR0k_bKHvTIdMVjcnLMD8ZgfeCNKPiiGG6qg1nIhIWM16yy99aZZ0-8773BHvojgl4Zvmu-qpUc-Q_8Rbi4DE9OLbu4GCdfSs10v0Sxd1tDKoCSG8_JN5vzcs0wb7XXpOt3Av9LMt0E72uB5cu3yl6LYVAAqZ2HYZprEp1I-GZEo9BCp4QPVe9Cz6D3M1KLWhDy2ylmwTWADYQPCllLxnwBsu2AA' },
  { id: '8904', name: 'María Vargas', email: 'maria.vargas@design.es', phone: '+52 55 1234 5678', location: 'CDMX, México', spend: '0 €', status: 'Nuevo', joinDate: '2024' },
  { id: '8905', name: 'Sofia Loren', email: 'sofia.loren@art.it', phone: '+39 333 123 4567', location: 'Roma, Italia', spend: '890.000 €', status: 'VIP', joinDate: '2019', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVfoOFlWjOqSARLHMIkLlBLAJRnjc2PyixcI33zFyA2LejDX5ybTZnj4adDxhHjabArKy1L0M8e94b0W1PRXdD_3mPfoUGoWpHxRtb1LczKfUCrrQT-_M6vq8IO83tl1dqVb3KRTUT_Hcv6d_jKVTnAmDi48W_GZN5f1wk8hG81Hmr7miTW9CiNhL2jv3nY7dY8JOiK0xS-zLnqIXHkyPKMkR-xDlwtyA--s2NLfRsa9ZFJpW_TFf6T7hplDbDzymf_cYgBLk1PWw' },
  { id: '8906', name: 'Javier López', email: 'j.lopez@invest.com', phone: '+1 305 555 0199', location: 'Miami, USA', spend: '15.000 €', status: 'En Espera', joinDate: '2022' },
];

const ClientsPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center max-w-[1400px] mx-auto w-full">
      <div className="w-full flex flex-col gap-8">
        {/* Breadcrumbs */}
        <div className="flex flex-wrap gap-2 items-center text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
          <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
          <span className="material-symbols-outlined text-base">chevron_right</span>
          <span className="text-zinc-300">Gestión de Clientes</span>
        </div>

        {/* Heading */}
        <div className="flex flex-col lg:flex-row flex-wrap justify-between gap-6 items-start lg:items-end">
          <div className="flex flex-col gap-3 max-w-2xl">
            <h1 className="text-white text-4xl font-black tracking-tight">Gestión de Clientes</h1>
            <p className="text-zinc-500 text-sm font-medium">Administre sus relaciones con clientes VIP, historial de compras y preferencias de diseño.</p>
          </div>
          <button className="flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-200 transition-all h-12 px-8 text-black text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-white/5 active:scale-95">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Nuevo Cliente</span>
          </button>
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
                  placeholder="Buscar por nombre, email o teléfono..."
                  type="text"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex h-12 items-center justify-center gap-x-2 rounded-xl bg-zinc-900/50 border border-zinc-900 px-6 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all text-xs font-bold uppercase tracking-widest">
                <span className="material-symbols-outlined text-zinc-500 text-[20px]">filter_list</span>
                <span>Filtros</span>
              </button>
              <div className="flex bg-zinc-900/50 rounded-xl p-1 border border-zinc-900">
                <button className="flex h-10 w-10 items-center justify-center rounded-lg hover:text-white text-zinc-500 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">grid_view</span>
                </button>
                <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-white shadow-lg">
                  <span className="material-symbols-outlined text-[20px]">view_list</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap items-center border-t border-zinc-900/50 pt-6">
            <span className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em] mr-2">Estado:</span>
            <button className="flex h-8 items-center justify-center rounded-full bg-white text-black px-4 hover:bg-zinc-200 transition-colors text-[10px] font-black uppercase tracking-widest">Todos</button>
            <button className="flex h-8 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 px-4 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">VIP</button>
            <button className="flex h-8 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 px-4 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">Nuevos</button>
            <button className="flex h-8 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 px-4 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">En Espera</button>
            <div className="flex-1"></div>
            <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Mostrando 1-5 de 45</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-sm shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-900/40 text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="py-5 px-8">Cliente</th>
                  <th className="py-5 px-8">Contacto</th>
                  <th className="py-5 px-8">Ubicación</th>
                  <th className="py-5 px-8">Gasto Total</th>
                  <th className="py-5 px-8">Estado</th>
                  <th className="py-5 px-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50">
                {mockClients.map((client) => (
                  <tr key={client.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
                    <td className="py-6 px-8">
                      <Link href={`/clients/${client.id}`} className="flex items-center gap-4">
                        <div className="relative size-12 flex-shrink-0">
                          {client.avatar ? (
                            <div className="size-12 rounded-full bg-cover bg-center grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all border border-zinc-800 shadow-xl" style={{ backgroundImage: `url('${client.avatar}')` }} />
                          ) : (
                            <div className="size-12 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center text-[10px] font-black uppercase tracking-widest shadow-xl">
                              {client.name.split(' ').map(n => n[0]).join('')}
                            </div>
                          )}
                          {client.status === 'VIP' && (
                            <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-indigo-500 border-2 border-zinc-950"></div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-white text-sm font-bold group-hover:text-white group-hover:underline decoration-zinc-800 underline-offset-4 transition-all">{client.name}</span>
                          <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">ID: CLI-{client.id}</span>
                        </div>
                      </Link>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex flex-col gap-1.5 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-2 group-hover:text-zinc-300 transition-colors">
                          <span className="material-symbols-outlined text-[14px]">mail</span>
                          <span>{client.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[14px]">call</span>
                          <span>{client.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-8 text-xs font-medium text-zinc-400">{client.location}</td>
                    <td className="py-6 px-8 text-sm font-bold text-white">{client.spend}</td>
                    <td className="py-6 px-8">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="py-6 px-8 text-right">
                      <button className="text-zinc-700 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition-all">
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between py-4">
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] hidden md:block">Mostrando 1 a 5 de 45 clientes</p>
          <div className="flex gap-3">
            <button className="h-10 px-6 rounded-xl border border-zinc-900 bg-zinc-900/50 text-zinc-600 text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-zinc-700 transition-all disabled:opacity-30" disabled>Anterior</button>
            <div className="hidden md:flex gap-2">
              <button className="w-10 h-10 rounded-xl bg-white text-black text-[10px] font-black">1</button>
              <button className="w-10 h-10 rounded-xl bg-zinc-900/50 border border-zinc-900 text-zinc-500 text-[10px] font-black hover:text-white hover:border-zinc-700 transition-all">2</button>
              <button className="w-10 h-10 rounded-xl bg-zinc-900/50 border border-zinc-900 text-zinc-500 text-[10px] font-black hover:text-white hover:border-zinc-700 transition-all">3</button>
            </div>
            <button className="h-10 px-6 rounded-xl border border-zinc-900 bg-zinc-900/50 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-zinc-700 transition-all">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: Client['status'] }> = ({ status }) => {
  const styles = {
    VIP: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.05)]',
    Activo: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Nuevo: 'bg-white/10 text-white border-white/20',
    'En Espera': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest border ${styles[status]}`}>
      {status}
    </span>
  );
};

export default ClientsPage;
