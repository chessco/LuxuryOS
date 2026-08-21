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
        <div className="flex flex-col h-[calc(100vh-160px)] max-w-5xl mx-auto w-full transition-colors">
            <div className="flex flex-col h-full bg-card border border-border rounded-3xl overflow-hidden backdrop-blur-sm shadow-xl transition-all duration-500">
                {/* Chat Header */}
                <div className="px-8 py-6 border-b border-border bg-muted/20 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="size-10 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-lg transition-colors">
                            <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
                        </div>
                        <div>
                            <h2 className="text-foreground text-sm font-black uppercase tracking-widest font-display transition-colors">Intelligence Assistant</h2>
                            <div className="flex items-center gap-2">
                                <span className="size-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest transition-colors">Conectado a Red Neuronal Luxury OS</p>
                            </div>
                        </div>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar scroll-smooth">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`size-8 rounded-xl flex-shrink-0 flex items-center justify-center border shadow-sm transition-colors ${msg.role === 'assistant' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-background text-muted-foreground border-border'
                                    }`}>
                                    <span className="material-symbols-outlined text-[16px]">
                                        {msg.role === 'assistant' ? 'bolt' : 'person'}
                                    </span>
                                </div>
                                <div className={`rounded-3xl px-6 py-4 text-sm leading-relaxed shadow-sm transition-all duration-300 ${msg.role === 'assistant'
                                    ? 'bg-muted/30 border border-border text-foreground'
                                    : 'bg-primary text-primary-foreground font-medium'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Suggestions */}
                <div className="px-8 py-4 flex gap-2 overflow-x-auto no-scrollbar border-t border-border/50 transition-colors">
                    {suggestions.map(s => (
                        <button
                            key={s}
                            onClick={() => setInput(s)}
                            className="px-4 py-2 rounded-full border border-border bg-background text-muted-foreground text-[9px] font-black uppercase tracking-widest hover:border-foreground hover:text-foreground transition-all whitespace-nowrap shadow-sm"
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {/* Input Area */}
                <div className="p-8 bg-muted/20 border-t border-border transition-colors">
                    <div className="relative group">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Pregunta sobre tu negocio..."
                            className="w-full bg-background border border-border rounded-2xl px-6 py-5 text-sm text-foreground focus:border-indigo-500 transition-all pr-32 placeholder-muted-foreground shadow-inner"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                                <span className="material-symbols-outlined">mic</span>
                            </button>
                            <button
                                onClick={handleSend}
                                className="bg-primary text-primary-foreground p-3 rounded-xl hover:opacity-90 transition-all shadow-xl shadow-primary/20 active:scale-95 transition-colors"
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
