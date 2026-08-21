import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatService } from '../services/chat.service';
import { socketService } from '../services/socket.service';
import { UsersService } from '../services/users.service';

const Messages: React.FC = () => {
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // New Chat State
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);

    const handleOpenNewChat = async () => {
        setIsNewChatOpen(true);
        try {
            const users = await UsersService.getAll();
            setAvailableUsers(users.filter((u: any) => u.id !== currentUser?.id));
        } catch (error) {
            console.error("Failed to load users", error);
        }
    };

    const handleStartConversation = async (userId: string) => {
        try {
            console.log("Starting conversation with user:", userId);
            const conversation = await ChatService.findOrCreateConversation(userId);
            console.log("Conversation created/found:", conversation);

            setConversations(prev => {
                const exists = prev.find(c => c.id === conversation.id);
                if (exists) return prev;
                return [conversation, ...prev];
            });
            setSelectedId(conversation.id);
            setIsNewChatOpen(false);
        } catch (error) {
            console.error("Failed to create conversation. Full error:", error);
            alert("Error al iniciar conversación. Revisa la consola.");
        }
    };

    const selectedIdRef = useRef<string | null>(null);

    useEffect(() => {
        selectedIdRef.current = selectedId;
    }, [selectedId]);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(user);

        loadConversations();
        socketService.connect();

        socketService.onNewMessage((msg) => {
            if (msg.conversationId === selectedIdRef.current) {
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
            // No disconnect here to keep socket alive across chat switches
        };
    }, []); // Only on mount

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
            <div className="w-80 flex flex-col bg-card border border-border rounded-[32px] overflow-hidden backdrop-blur-sm shadow-sm transition-colors">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-foreground text-xl font-black uppercase tracking-widest font-display">Mensajes</h2>
                        <p className="text-muted-foreground text-[9px] font-black uppercase tracking-widest mt-1">Chat de Atelier</p>
                    </div>
                    <button
                        onClick={handleOpenNewChat}
                        className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                        title="Nuevo Mensaje"
                    >
                        <span className="material-symbols-outlined text-xl">edit_square</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
                    {isLoading ? (
                        <div className="p-4 text-center text-zinc-400 dark:text-zinc-600 text-[10px] font-black uppercase">Cargando...</div>
                    ) : conversations.length === 0 ? (
                        <div className="p-4 text-center text-zinc-400 dark:text-zinc-600 text-[10px] font-black uppercase">Sin conversaciones</div>
                    ) : (
                        conversations.map((conv) => {
                            // Robust partner identification
                            const partner = conv.users.find((u: any) => u.id !== currentUser?.id) || conv.users[0];
                            const partnerName = partner?.name || partner?.email || 'Usuario';
                            const partnerInitial = partnerName.substring(0, 2).toUpperCase();

                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedId(conv.id)}
                                    className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all group ${selectedId === conv.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
                                >
                                    <div className={`size-10 rounded-xl flex items-center justify-center font-black text-xs ${selectedId === conv.id ? 'bg-background text-foreground' : 'bg-muted text-muted-foreground border border-border'}`}>
                                        {partnerInitial}
                                    </div>
                                    <div className="flex-1 text-left overflow-hidden">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className={`font-bold text-sm truncate ${selectedId === conv.id ? 'text-primary-foreground' : 'text-foreground'}`}>
                                                {partnerName}
                                            </span>
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
            <div className="flex-1 flex flex-col bg-card border border-border rounded-[32px] overflow-hidden backdrop-blur-sm shadow-sm transition-colors">
                {selectedId ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-muted/20">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shadow-xl shadow-black/5 dark:shadow-white/5">
                                    {(otherUser?.name || otherUser?.email || '??').substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-foreground font-bold text-lg">{otherUser?.name || otherUser?.email || 'Cargando...'}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span className="text-muted-foreground text-[9px] font-black uppercase tracking-widest">En línea</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="size-10 rounded-xl hover:bg-muted/50 flex items-center justify-center text-muted-foreground transition-all">
                                    <span className="material-symbols-outlined">call</span>
                                </button>
                                <button className="size-10 rounded-xl hover:bg-muted/50 flex items-center justify-center text-muted-foreground transition-all">
                                    <span className="material-symbols-outlined">more_vert</span>
                                </button>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar bg-muted/10 transition-colors">
                            {messages.map((msg, idx) => {
                                const isMe = msg.senderId === currentUser?.id;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] group relative`}>
                                            <div className={`px-5 py-3 rounded-2xl text-sm font-medium shadow-sm dark:shadow-xl ${isMe ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-background text-foreground rounded-tl-none border border-border'}`}>
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
                        <form onSubmit={handleSendMessage} className="p-8 border-t border-border bg-muted/20">
                            <div className="relative flex items-center gap-4">
                                <button type="button" className="size-12 rounded-2xl bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shadow-sm">
                                    <span className="material-symbols-outlined">add</span>
                                </button>
                                <input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Escribe un mensaje..."
                                    className="flex-1 bg-background border border-border rounded-2xl py-4 px-6 text-sm text-foreground focus:border-primary outline-none transition-all shadow-sm"
                                />
                                <button
                                    type="submit"
                                    className="size-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                                    disabled={!newMessage.trim()}
                                >
                                    <span className="material-symbols-outlined">send</span>
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                        <div className="size-24 rounded-[32px] bg-muted border border-border flex items-center justify-center mb-6 shadow-sm">
                            <span className="material-symbols-outlined text-muted-foreground text-5xl">chat_bubble</span>
                        </div>
                        <h3 className="text-foreground text-xl font-black uppercase tracking-widest font-display">Tus Conversaciones</h3>
                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest max-w-xs mt-4">
                            Selecciona un chat para comenzar a comunicarte con el equipo en tiempo real.
                        </p>
                    </div>
                )}
            </div>

            {/* New Chat Modal */}
            <AnimatePresence>
                {isNewChatOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                            onClick={() => setIsNewChatOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 m-auto w-full max-w-md h-fit max-h-[80vh] bg-card border border-border rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col"
                        >
                            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                                <h3 className="text-foreground font-black uppercase tracking-widest">Nuevo Mensaje</h3>
                                <button onClick={() => setIsNewChatOpen(false)} className="text-muted-foreground hover:text-foreground">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 px-2">Seleccionar Usuario</p>
                                <div className="space-y-2">
                                    {availableUsers.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleStartConversation(user.id)}
                                            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-colors text-left group border border-transparent hover:border-border/50"
                                        >
                                            <div className="size-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black text-xs group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                {user.name?.substring(0, 2).toUpperCase() || '??'}
                                            </div>
                                            <div>
                                                <h4 className="text-foreground font-bold text-sm">{user.name}</h4>
                                                <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">{user.role}</p>
                                            </div>
                                            <span className="material-symbols-outlined ml-auto text-muted-foreground/30 group-hover:text-indigo-500 transition-colors">send</span>
                                        </button>
                                    ))}
                                    {availableUsers.length === 0 && (
                                        <p className="text-center text-muted-foreground text-xs py-8">No hay otros usuarios disponibles.</p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Messages;
