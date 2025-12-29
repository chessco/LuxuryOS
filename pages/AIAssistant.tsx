
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hola Mateo. Soy tu asistente inteligente de Luxury OS. ¿En qué puedo ayudarte con el atelier hoy? Puedo redactar correos para clientes VIP, investigar tendencias de mercado o darte consejos sobre gemología.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { role: 'user', parts: [{ text: userMsg }] }
        ],
        config: {
          systemInstruction: "Eres un asistente experto para un taller de alta joyería llamado 'Luxury OS'. Eres elegante, profesional y tienes profundos conocimientos en gemología, relojería de lujo, ventas VIP y gestión de producción. Responde siempre en español de forma concisa y lujosa.",
          temperature: 0.7,
        }
      });

      const aiText = response.text || "Lo siento, no pude procesar esa solicitud.";
      setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Hubo un error al conectar con el motor de IA. Por favor, verifica tu conexión." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "Redacta un correo de agradecimiento para Alejandra Gómez.",
    "¿Cuáles son las tendencias en diamantes para 2024?",
    "Consejos para limpiar esmeraldas colombianas.",
    "Analiza el precio actual del oro de 18k."
  ];

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-4xl icon-fill">auto_awesome</span>
            AI Atelier Assistant
          </h2>
          <p className="text-slate-400 mt-1">Potencia tu taller con inteligencia artificial de última generación.</p>
        </div>
        <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest animate-pulse">
          Gemini 3 Powered
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-card-dark border border-card-border rounded-2xl shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
        
        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
        >
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                m.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10' 
                  : 'bg-[#111318] border border-card-border text-slate-200 rounded-tl-none shadow-xl'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#111318] border border-card-border rounded-2xl rounded-tl-none p-4 shadow-xl">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-card-border bg-[#111318]/50">
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestions.map((s, i) => (
              <button 
                key={i}
                onClick={() => setInput(s)}
                className="text-[10px] px-3 py-1.5 rounded-full bg-card-dark border border-card-border text-slate-400 hover:text-white hover:border-primary/50 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="relative group">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Haz una pregunta técnica o solicita un borrador..."
              className="w-full bg-card-dark border border-card-border rounded-xl py-4 pl-5 pr-14 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-inner"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-10 bg-primary rounded-lg flex items-center justify-center text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
