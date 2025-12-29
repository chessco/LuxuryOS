
import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-background-dark">
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-8 pb-10">
        <header className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-card-border">
          <div className="flex flex-col gap-1 w-full">
            <h2 className="text-white text-3xl font-black tracking-tight">Configuración</h2>
            <p className="text-slate-400 text-sm">Gestiona tu perfil, seguridad y preferencias del sistema</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none px-5 py-2.5 rounded-lg border border-card-border text-slate-400 font-medium text-sm hover:text-white transition-colors">
              Cancelar
            </button>
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-primary/25">
              <span className="material-symbols-outlined text-[20px]">save</span>
              <span>Guardar</span>
            </button>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-64 shrink-0">
            <nav className="flex flex-col gap-1 sticky top-0">
              <NavItem icon="person" label="Mi Cuenta" active />
              <NavItem icon="notifications" label="Notificaciones" />
              <NavItem icon="store" label="Negocio" />
              <NavItem icon="lock" label="Seguridad" />
              <NavItem icon="credit_card" label="Facturación" />
            </nav>
          </aside>

          <div className="flex-1 flex flex-col gap-8">
            <section className="bg-card-dark border border-card-border rounded-xl overflow-hidden shadow-lg">
              <div className="p-6 border-b border-card-border">
                <h3 className="text-lg font-bold text-white">Mi Cuenta</h3>
                <p className="text-sm text-slate-500">Actualiza tu información personal y pública.</p>
              </div>
              <div className="p-8 flex flex-col gap-8">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg ring-4 ring-card-border">JS</div>
                    <button className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full shadow-md hover:bg-blue-600 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Joyería Santos</h4>
                    <p className="text-slate-500 text-sm">Administrador Principal</p>
                    <div className="flex gap-3 mt-1">
                      <button className="text-xs font-medium text-primary hover:text-white transition-colors">Cambiar Avatar</button>
                      <button className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors">Eliminar</button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputGroup label="Nombre" value="Joyería" />
                  <InputGroup label="Apellidos" value="Santos" />
                  <div className="md:col-span-2">
                    <InputGroup label="Correo Electrónico" value="admin@joyeriasantos.com" icon="mail" />
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-card-dark border border-card-border rounded-xl overflow-hidden shadow-lg">
              <div className="p-6 border-b border-card-border">
                <h3 className="text-lg font-bold text-white">Notificaciones</h3>
                <p className="text-sm text-slate-500">Elige cómo y cuándo quieres ser contactado.</p>
              </div>
              <div className="p-6 flex flex-col divide-y divide-card-border/30">
                <ToggleItem label="Nuevos Pedidos" sub="Recibe una alerta cuando llegue un pedido nuevo." checked />
                <ToggleItem label="Alerta de Stock Bajo" sub="Notificación cuando un item baje del mínimo." checked />
                <ToggleItem label="Reportes Semanales" sub="Resumen de ventas e inventario por email." />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ icon: string, label: string, active?: boolean }> = ({ icon, label, active }) => (
  <a className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active ? 'bg-primary/10 text-white shadow-sm ring-1 ring-white/5 relative' : 'text-slate-500 hover:bg-card-dark hover:text-white'}`} href="#">
    {active && <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent"></div>}
    <span className={`material-symbols-outlined ${active ? 'text-primary' : ''}`}>{icon}</span>
    <span className="font-medium relative z-10">{label}</span>
  </a>
);

const InputGroup: React.FC<{ label: string, value: string, icon?: string }> = ({ label, value, icon }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
    <div className="relative">
      {icon && <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-[20px]">{icon}</span>}
      <input 
        className={`w-full bg-background-dark border border-card-border rounded-lg ${icon ? 'pl-10' : 'px-4'} py-2.5 text-white focus:ring-1 focus:ring-primary outline-none transition-all placeholder-slate-700`} 
        type="text" 
        defaultValue={value} 
      />
    </div>
  </div>
);

const ToggleItem: React.FC<{ label: string, sub: string, checked?: boolean }> = ({ label, sub, checked }) => (
  <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
    <div className="flex flex-col">
      <span className="text-white font-medium">{label}</span>
      <span className="text-sm text-slate-500">{sub}</span>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" defaultChecked={checked} />
      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
    </label>
  </div>
);

export default Settings;
