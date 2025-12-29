"use client";

import React, { useState } from 'react';

const AIAssistantPage: React.FC = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bienvenido, Mateo. Soy tu asistente de Luxury OS. ¿En qué puedo ayudarte hoy con la gestión de tu atelier?' }
  ]);
  const [input, setInput] = useState('');

  const suggestions = [
    "Resumen de ventas del mes",
    "Previsión de inventario para gemas",
    "Analizar eficiencia del taller",
    "Reporte de clientes VIP"
  ];

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');

    // Simulate thinking
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'He analizado los datos actuales. Basado en las tendencias de este trimestre, recomiendo aumentar el stock de zafiros azules en un 15% para cubrir las órdenes proyectadas de junio.'
      }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] max-w-5xl mx-auto w-full">
      <div className="flex flex-col h-full bg-zinc-900/20 border border-zinc-900 rounded-3xl overflow-hidden backdrop-blur-sm shadow-2xl">
        {/* Chat Header */}
        <div className="px-8 py-6 border-b border-zinc-900 bg-zinc-900/40 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-white/5">
              <span className="material-symbols-outlined text-black text-[22px]">auto_awesome</span>
            </div>
            <div>
              <h2 className="text-white text-sm font-black uppercase tracking-widest">Intelligence Assistant</h2>
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Conectado a Red Neuronal Luxury OS</p>
              </div>
            </div>
          </div>
          <button className="text-zinc-600 hover:text-white transition-colors">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-hide">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`size-8 rounded-xl flex-shrink-0 flex items-center justify-center border ${msg.role === 'assistant' ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`}>
                  <span className="material-symbols-outlined text-[16px]">
                    {msg.role === 'assistant' ? 'bolt' : 'person'}
                  </span>
                </div>
                <div className={`rounded-3xl px-6 py-4 text-sm leading-relaxed shadow-sm ${msg.role === 'assistant'
                    ? 'bg-zinc-900/50 border border-zinc-800 text-white'
                    : 'bg-white text-black font-medium'
                  }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        <div className="px-8 py-4 flex gap-2 overflow-x-auto no-scrollbar border-t border-zinc-900/50">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="px-4 py-2 rounded-full border border-zinc-800 bg-zinc-950/50 text-zinc-500 text-[9px] font-black uppercase tracking-widest hover:border-zinc-700 hover:text-white transition-all whitespace-nowrap"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-8 bg-zinc-950/50">
          <div className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Pregunta sobre tu negocio..."
              className="w-full bg-zinc-900 border-none rounded-2xl px-6 py-5 text-sm text-white focus:ring-1 focus:ring-white transition-all pr-32 placeholder-zinc-700"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
              <button className="p-2 text-zinc-600 hover:text-white transition-colors">
                <span className="material-symbols-outlined">mic</span>
              </button>
              <button
                onClick={handleSend}
                className="bg-white text-black p-3 rounded-xl hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPage;
