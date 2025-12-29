
import React from 'react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  return (
    <div className="flex h-screen w-full bg-background-dark overflow-hidden">
      {/* Left Visual Side */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-end p-12 bg-[#05080f]">
        <div className="absolute inset-0 z-0">
          <div 
            className="w-full h-full bg-cover bg-center opacity-70" 
            style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuA0ko1Rsy7h0TOFlf5riAFgqjshXdyPuqnyOS5qlgzAps0kgO2xkp1Pgdb7VaOginz7L-P19Qek660bR3DjyT4Li7dWQvWsOROVfgb_5Y3ZrWsABFh3FsjcD6A6jyyOBBsTfwzHIfGkZdf-RCEv9Nk61qBn-SkD_3NroSE5M-iVApSxdJ5P7CA2e8waR8sKae6bofFWZMmzRZ9Me8_aNuBE-L9OZtoOG70mPncjXKJRbJGxFZtvB2f0KbSDE7tmYOk3q6i2m-JF5Ks')` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#101622] via-[#101622]/40 to-transparent"></div>
          <div className="absolute inset-0 bg-primary/10 mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 max-w-lg mb-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-white text-4xl">diamond</span>
            <h1 className="text-3xl font-bold tracking-tight text-white font-display">Luxury OS</h1>
          </div>
          <blockquote className="text-xl font-light leading-relaxed text-gray-200 border-l-2 border-primary pl-6 italic">
            "La excelencia no es un acto, sino un hábito. Gestione su atelier con la precisión de un maestro joyero."
          </blockquote>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="flex flex-1 flex-col justify-center items-center px-6 sm:px-12 xl:px-24 bg-background-light dark:bg-background-dark relative overflow-y-auto">
        <div className="w-full max-w-[440px] flex flex-col gap-8 py-10">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-2 mb-2 text-slate-900 dark:text-white">
            <span className="material-symbols-outlined text-3xl text-primary">diamond</span>
            <span className="text-xl font-bold font-display">Luxury OS</span>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
              Bienvenido a Luxury OS
            </h2>
            <p className="text-slate-500 dark:text-[#9da6b9] text-base font-normal">
              Gestión integral para alta joyería. Inicie sesión para acceder a su panel de control.
            </p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
            <label className="flex flex-col gap-1.5">
              <span className="text-slate-900 dark:text-white text-sm font-medium">Correo electrónico</span>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-200 material-symbols-outlined">mail</span>
                <input 
                  className="w-full rounded-lg bg-white dark:bg-[#1c1f27] border border-slate-200 dark:border-[#3b4354] px-4 py-3.5 pl-11 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200" 
                  placeholder="ejemplo@empresa.com" 
                  type="email" 
                  defaultValue="admin@luxuryos.com"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-900 dark:text-white text-sm font-medium">Contraseña</span>
              </div>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-200 material-symbols-outlined">lock</span>
                <input 
                  className="w-full rounded-lg bg-white dark:bg-[#1c1f27] border border-slate-200 dark:border-[#3b4354] px-4 py-3.5 pl-11 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200" 
                  placeholder="••••••••" 
                  type="password" 
                  defaultValue="password123"
                />
              </div>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input className="h-4 w-4 rounded border-slate-300 dark:border-[#3b4354] bg-transparent text-primary focus:ring-primary/20 transition-all cursor-pointer" type="checkbox" defaultChecked />
                <span className="text-sm font-medium text-slate-600 dark:text-[#9da6b9] group-hover:text-slate-800 dark:group-hover:text-white transition-colors">Recordar mi usuario</span>
              </label>
              <a className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors" href="#">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button 
              type="submit"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 px-4 text-base font-bold text-white shadow-lg shadow-primary/25 hover:bg-blue-700 hover:shadow-primary/40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#101622] transition-all duration-200"
            >
              <span>Iniciar Sesión</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 dark:text-[#5f6a80]">
              © 2024 Luxury OS. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
