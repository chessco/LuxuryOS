import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../services/api';

// Estilos del markdown que devuelve Aura (negritas, listas, enlaces, código, tablas)
const markdownComponents: Components = {
    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    ul: ({ children }) => <ul className="list-disc pl-5 mb-3 last:mb-0 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 last:mb-0 space-y-1">{children}</ol>,
    h1: ({ children }) => <h3 className="font-black text-base mb-2">{children}</h3>,
    h2: ({ children }) => <h3 className="font-black text-base mb-2">{children}</h3>,
    h3: ({ children }) => <h4 className="font-bold mb-2">{children}</h4>,
    a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline underline-offset-2">{children}</a>
    ),
    code: ({ children }) => <code className="px-1.5 py-0.5 rounded bg-muted text-[12px] font-mono">{children}</code>,
    table: ({ children }) => <div className="overflow-x-auto mb-3"><table className="text-xs border-collapse">{children}</table></div>,
    th: ({ children }) => <th className="border border-border px-3 py-1.5 text-left font-bold">{children}</th>,
    td: ({ children }) => <td className="border border-border px-3 py-1.5">{children}</td>,
};

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

const AIAssistantPage: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: 'Hola, soy Aura, tu asistente de Luxury OS. ¿En qué puedo ayudarte hoy con la gestión de tu atelier?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const suggestions = [
        "Resumen de ventas del mes",
        "Previsión de inventario para gemas",
        "Analizar eficiencia del taller",
        "Reporte de clientes VIP"
    ];

    const handleSend = async () => {
        const text = input.trim();
        if (!text || loading) return;
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        setInput('');
        setLoading(true);

        try {
            // El consumo de IA se canaliza por PitayaCore (agente pitayacore/aura)
            const { data } = await api.post('/ai/chat', { message: text });
            setMessages(prev => [...prev, { role: 'assistant', content: data.content || 'No obtuve respuesta. Intenta de nuevo.' }]);
        } catch (error: any) {
            const detail = error.response?.data?.message || 'No pude conectar con el asistente. Intenta de nuevo en unos momentos.';
            setMessages(prev => [...prev, { role: 'assistant', content: detail }]);
        } finally {
            setLoading(false);
        }
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
                            <h2 className="text-foreground text-sm font-black uppercase tracking-widest font-display transition-colors">Asistente Aura</h2>
                            <div className="flex items-center gap-2">
                                <span className="size-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest transition-colors">Conectado a PitayaCore · Luxury OS</p>
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
                                    {msg.role === 'assistant' ? (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                            {msg.content}
                                        </ReactMarkdown>
                                    ) : (
                                        <span className="whitespace-pre-wrap">{msg.content}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="rounded-3xl px-6 py-4 text-sm bg-muted/30 border border-border text-muted-foreground animate-pulse">
                                Aura está pensando...
                            </div>
                        </div>
                    )}
                    <div ref={endRef} />
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
                                disabled={loading}
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
