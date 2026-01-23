import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatService } from '../services/chat.service';
import { socketService } from '../services/socket.service';

const Messages: React.FC = () => {
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(user);

        loadConversations();
        socketService.connect();

        socketService.onNewMessage((msg) => {
            if (msg.conversationId === selectedId) {
                setMessages(prev => [...prev, msg]);
            }
            // Update last message in conversations list
            setConversations(prev => prev.map(conv =>
                conv.id === msg.conversationId
                    ? { ...conv, messages: [msg], updatedAt: msg.createdAt }
                    : conv
            ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        });

        return () => {
            socketService.disconnect();
        };
    }, [selectedId]);

    useEffect(() => {
        if (selectedId) {
            loadMessages(selectedId);
            socketService.joinRoom(selectedId);
        }
        return () => {
            if (selectedId) socketService.leaveRoom(selectedId);
        };
    }, [selectedId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const loadConversations = async () => {
        try {
            const data = await ChatService.getConversations();
            setConversations(data);
            setIsLoading(false);
        } catch (error) {
            console.error(error);
        }
    };

    const loadMessages = async (id: string) => {
        try {
            const data = await ChatService.getMessages(id);
            setMessages(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedId || !currentUser) return;

        socketService.sendMessage({
            conversationId: selectedId,
            senderId: currentUser.id,
            content: newMessage
        });

        setNewMessage('');
    };

    const selectedConv = conversations.find(c => c.id === selectedId);
    const otherUser = selectedConv?.users.find((u: any) => u.id !== currentUser?.id);

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6 antialiased">
            {/* Sidebar: Conversations List */}
            <div className="w-80 flex flex-col bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 rounded-[32px] overflow-hidden backdrop-blur-sm shadow-sm dark:shadow-2xl transition-colors">
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-900/50">
                    <h2 className="text-zinc-900 dark:text-white text-xl font-black uppercase tracking-widest font-display">Mensajes</h2>
                    <p className="text-zinc-400 dark:text-zinc-500 text-[9px] font-black uppercase tracking-widest mt-1">Chat de Atelier</p>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
                    {isLoading ? (
                        <div className="p-4 text-center text-zinc-400 dark:text-zinc-600 text-[10px] font-black uppercase">Cargando...</div>
                    ) : conversations.length === 0 ? (
                        <div className="p-4 text-center text-zinc-400 dark:text-zinc-600 text-[10px] font-black uppercase">Sin conversaciones</div>
                    ) : (
                        conversations.map((conv) => {
                            const partner = conv.users.find((u: any) => u.id !== currentUser?.id);
                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedId(conv.id)}
                                    className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all group ${selectedId === conv.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-black' : 'hover:bg-zinc-50 dark:hover:bg-white/5 text-zinc-500 dark:text-zinc-400'}`}
                                >
                                    <div className={`size-10 rounded-xl flex items-center justify-center font-black text-xs ${selectedId === conv.id ? 'bg-white dark:bg-zinc-900 text-black dark:text-white' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700'}`}>
                                        {partner?.name?.substring(0, 2).toUpperCase() || '??'}
                                    </div>
                                    <div className="flex-1 text-left overflow-hidden">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className={`font-bold text-sm truncate ${selectedId === conv.id ? 'text-white dark:text-black' : 'text-zinc-900 dark:text-white'}`}>{partner?.name || 'Usuario'}</span>
                                            <span className="text-[9px] font-black opacity-40">
                                                {conv.messages?.[0] ? new Date(conv.messages[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                        <p className={`text-[10px] truncate font-medium tracking-tight ${selectedId === conv.id ? 'opacity-80' : 'opacity-60'}`}>
                                            {conv.messages?.[0]?.content || 'Sin mensajes aún'}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 rounded-[32px] overflow-hidden backdrop-blur-sm shadow-sm dark:shadow-2xl transition-colors">
                {selectedId ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-900/50 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-black font-black text-sm shadow-xl shadow-black/5 dark:shadow-white/5">
                                    {otherUser?.name?.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-zinc-900 dark:text-white font-bold text-lg">{otherUser?.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span className="text-zinc-400 dark:text-zinc-500 text-[9px] font-black uppercase tracking-widest">En línea</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="size-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-zinc-500 transition-all">
                                    <span className="material-symbols-outlined">call</span>
                                </button>
                                <button className="size-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-zinc-500 transition-all">
                                    <span className="material-symbols-outlined">more_vert</span>
                                </button>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar bg-zinc-50/30 dark:bg-transparent dark:bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                            {messages.map((msg, idx) => {
                                const isMe = msg.senderId === currentUser?.id;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] group relative`}>
                                            <div className={`px-5 py-3 rounded-2xl text-sm font-medium shadow-sm dark:shadow-xl ${isMe ? 'bg-zinc-900 dark:bg-white text-white dark:text-black rounded-tr-none' : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-tl-none border border-zinc-100 dark:border-transparent'}`}>
                                                {msg.content}
                                                <div className={`text-[8px] font-black uppercase tracking-tighter mt-1 opacity-40 text-right`}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Chat Input */}
                        <form onSubmit={handleSendMessage} className="p-8 border-t border-zinc-100 dark:border-zinc-900/50 bg-zinc-50/30 dark:bg-zinc-900/20">
                            <div className="relative flex items-center gap-4">
                                <button type="button" className="size-12 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm">
                                    <span className="material-symbols-outlined">add</span>
                                </button>
                                <input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Escribe un mensaje..."
                                    className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-4 px-6 text-sm text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-zinc-700 outline-none transition-all shadow-sm"
                                />
                                <button
                                    type="submit"
                                    className="size-12 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-xl shadow-black/5 dark:shadow-white/5 active:scale-95 disabled:opacity-50"
                                    disabled={!newMessage.trim()}
                                >
                                    <span className="material-symbols-outlined">send</span>
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                        <div className="size-24 rounded-[32px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center mb-6 shadow-sm">
                            <span className="material-symbols-outlined text-zinc-300 dark:text-zinc-700 text-5xl">chat_bubble</span>
                        </div>
                        <h3 className="text-zinc-900 dark:text-white text-xl font-black uppercase tracking-widest font-display">Tus Conversaciones</h3>
                        <p className="text-zinc-400 dark:text-zinc-600 text-xs font-bold uppercase tracking-widest max-w-xs mt-4">
                            Selecciona un chat para comenzar a comunicarte con el equipo en tiempo real.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Messages;
