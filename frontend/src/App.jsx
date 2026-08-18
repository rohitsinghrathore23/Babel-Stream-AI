import React, { useState, useEffect, useRef } from 'react';
import { Send, Globe, MessageSquare, Sparkles, ArrowLeft, Users, History, PanelLeftOpen, PanelLeftClose, ShieldCheck, Zap, Lock, Cpu, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

const socket = io('http://127.0.0.1:5000');

const LANGUAGES = [
  { code: 'English', label: '🇬🇧 English' },
  { code: 'German', label: '🇩🇪 German (Deutsch)' },
  { code: 'Spanish', label: '🇪🇸 Spanish (Español)' },
  { code: 'French', label: '🇫🇷 French (Français)' },
  { code: 'Hindi', label: '🇮🇳 Hindi (हिन्दी)' },
  { code: 'Japanese', label: '🇯🇵 Japanese (日本語)' }
];

const MessageBubble = ({ msg, currentRole }) => {
  const [showHidden, setShowHidden] = useState(false);
  const isMyMessage = currentRole === msg.sender_role;
  const senderName = msg.sender_role === 'customer' ? 'Customer' : 'Support Agent';
  
  const time = msg.timestamp 
    ? new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const primaryText = isMyMessage ? msg.original_text : msg.translated_text;
  const hiddenText = isMyMessage ? msg.translated_text : msg.original_text;
  
  const buttonLabel = isMyMessage 
      ? (showHidden ? '🙈 Hide Translation' : '👁️ Show Translation')
      : (showHidden ? '🙈 Hide Original' : '👁️ Show Original');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'} w-full my-3`}
    >
      <div className="flex items-center gap-1.5 mb-1 px-1">
        <span className="text-xs font-semibold text-purple-300">{senderName}</span>
        <span className="text-[10px] text-purple-400">• {time}</span>
      </div>
      
      <div className={`relative px-4 py-3 rounded-2xl max-w-[80%] shadow-lg text-sm leading-relaxed transition-all ${
        isMyMessage 
          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-sm shadow-violet-600/30 border border-violet-400/20' 
          : 'bg-[#120f24] text-slate-200 border border-purple-900/50 rounded-bl-sm shadow-black/40'
      }`}>
        <p className="text-base font-medium">{primaryText}</p>
        
        <button 
          onClick={() => setShowHidden(!showHidden)} 
          className={`mt-2 text-xs font-semibold flex items-center gap-1 transition-colors ${
            isMyMessage ? 'text-violet-200 hover:text-white' : 'text-purple-400 hover:text-purple-300'
          }`}
        >
          {buttonLabel}
        </button>
        
        <AnimatePresence>
          {showHidden && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`mt-2 text-xs rounded-xl p-2.5 italic border ${
                isMyMessage 
                  ? 'bg-violet-700/60 border-violet-400/30 text-violet-100' 
                  : 'bg-[#0b0914] border-purple-900/60 text-purple-300'
              }`}
            >
              <span className="font-bold not-italic block text-[10px] uppercase tracking-wider mb-0.5 opacity-70">
                {isMyMessage ? 'Translated Version:' : 'Original Text:'}
              </span>
              {hiddenText}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [room, setRoom] = useState(() => localStorage.getItem('chat_room') || '');
  const [role, setRole] = useState(() => localStorage.getItem('chat_role') || 'customer');
  const [sourceLang, setSourceLang] = useState(() => localStorage.getItem('chat_source_lang') || 'English');
  const [targetLang, setTargetLang] = useState(() => localStorage.getItem('chat_lang') || 'German');
  const [joined, setJoined] = useState(() => localStorage.getItem('chat_joined') === 'true');
  
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [pastChats, setPastChats] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const chatEndRef = useRef(null);

  const fetchPastChats = async () => {
    try {
      const res = await fetch('http://127.0.0.1:5000/api/chats');
      const data = await res.json();
      setPastChats(data);
    } catch (e) {
      console.error("Failed to load past chats", e);
    }
  };

  useEffect(() => {
    fetchPastChats();
    if (joined && room) {
      socket.emit('join_room', { room });
    }

    socket.on('load_history', (history) => {
      setMessages(history);
    });

    socket.on('receive_message', (data) => {
      setIsTyping(false);
      setMessages((prev) => [...prev, data]);
      fetchPastChats();

      if (data.sender_role !== role && ttsEnabled) {
        const speech = new SpeechSynthesisUtterance(data.translated_text);
        speech.rate = 0.9; 
        window.speechSynthesis.speak(speech);
      }
    });

    return () => {
      socket.off('load_history');
      socket.off('receive_message');
    };
  }, [joined, room, role, ttsEnabled]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (room.trim()) {
      const cleanRoom = room.trim();
      setRoom(cleanRoom);
      socket.emit('join_room', { room: cleanRoom });
      setJoined(true);
      
      localStorage.setItem('chat_room', cleanRoom);
      localStorage.setItem('chat_role', role);
      localStorage.setItem('chat_source_lang', sourceLang);
      localStorage.setItem('chat_lang', targetLang);
      localStorage.setItem('chat_joined', 'true');
      fetchPastChats();
    }
  };

  const handleSelectPastChat = (selectedRoom) => {
    setRoom(selectedRoom);
    socket.emit('join_room', { room: selectedRoom });
    setJoined(true);
    localStorage.setItem('chat_room', selectedRoom);
    localStorage.setItem('chat_joined', 'true');
    setSidebarOpen(false);
  };

  const handleNewChat = () => {
    const newRoomId = 'room-' + Math.random().toString(36).substring(2, 9);
    setRoom(newRoomId);
    setMessages([]);
    socket.emit('join_room', { room: newRoomId });
    setJoined(true);
    localStorage.setItem('chat_room', newRoomId);
    localStorage.setItem('chat_joined', 'true');
    setSidebarOpen(false);
  };

  const handleLeave = () => {
    setJoined(false);
    setRoom('');
    setMessages([]);
    localStorage.removeItem('chat_room');
    localStorage.removeItem('chat_joined');
    fetchPastChats();
  };

  const handleSend = (textToSend) => {
    const text = textToSend || messageInput;
    if (text.trim() === '') return;
    
    setIsTyping(true);
    socket.emit('chat_message', {
      text: text.trim(),
      sender_role: role,
      target_language: targetLang,
      room: room
    });
    
    setMessageInput('');
  };

  const quickPhrasesMap = {
    'German': ["Hallo, ich brauche Hilfe.", "Wie viel kostet das?", "Vielen Dank für Ihre Hilfe!"],
    'Spanish': ["Hola, necesito ayuda.", "¿Cuánto cuesta esto?", "¡Muchas gracias por tu ayuda!"],
    'French': ["Bonjour, j'ai besoin d'aide.", "Combien ça coûte ?", "Merci beaucoup pour votre aide !"],
    'Hindi': ["नमस्ते, मुझे सहायता चाहिए।", "इसकी कीमत क्या है?", "आपकी सहायता के लिए धन्यवाद!"],
    'Japanese': ["こんにちは、助けが必要です。", "価格はいくらですか？", "お手伝いありがとうございます！"],
    'English': ["Hello, how can I help you today?", "Please give me a moment to check.", "Thank you for your assistance!"]
  };

  const quickPhrases = quickPhrasesMap[sourceLang] || quickPhrasesMap['English'];

  return (
    <div className="min-h-screen bg-[#06040f] font-sans text-gray-100 flex flex-col selection:bg-violet-500 selection:text-white relative overflow-x-hidden">
      
      {/* SIDEBAR DRAWER */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm"
            />
            <motion.aside 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-80 bg-[#090616] border-r border-purple-950 flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-purple-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-gradient-to-tr from-violet-600 to-indigo-500 p-2 rounded-xl shadow-lg shadow-violet-600/30">
                    <History size={18} className="text-white" />
                  </div>
                  <span className="font-bold text-sm tracking-tight text-white">Chat History</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-purple-400 hover:text-white p-1.5 rounded-xl bg-[#120f24] border border-purple-900/60">
                  <PanelLeftClose size={16} />
                </button>
              </div>

              <div className="p-3 border-b border-purple-950/60 bg-[#0c091d]">
                <button onClick={handleNewChat} className="w-full bg-violet-600 hover:bg-violet-500 text-white p-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition font-medium shadow-md shadow-violet-600/30">
                  <span>+</span> Start New Chat Room
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {pastChats.length === 0 ? (
                  <p className="text-xs text-purple-500/60 px-2 py-4 text-center italic">No previous saved chats found.</p>
                ) : (
                  pastChats.map((chat) => {
                    const chatDate = new Date(chat.timestamp * 1000).toLocaleString([], {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    });

                    return (
                      <button 
                        key={chat.room}
                        onClick={() => handleSelectPastChat(chat.room)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition flex flex-col gap-0.5 truncate border ${
                          room === chat.room && joined
                            ? 'bg-violet-600/20 border-violet-500/40 text-white font-medium shadow-inner' 
                            : 'bg-[#0e0b1c]/40 border-purple-950 hover:bg-[#120f24] text-purple-200'
                        }`}
                      >
                        <span className="truncate w-full font-semibold">{chat.title}</span>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[9px] text-purple-400/60">Room: {chat.room}</span>
                          <span className="text-[9px] text-purple-500/50">{chatDate}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="w-full bg-[#080514]/90 backdrop-blur-md border-b border-purple-950 py-3.5 px-6 flex justify-between items-center z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="text-purple-300 p-2 rounded-xl bg-[#120f24] border border-purple-900/80 hover:border-violet-500 transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <PanelLeftOpen size={16} className="text-violet-400" />
            <span className="hidden sm:inline">History</span>
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-violet-600 to-indigo-500 p-2 rounded-xl shadow-lg shadow-violet-600/30 border border-violet-400/30">
              <Globe size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm text-white tracking-tight">BabelStream</h1>
                <span className="text-[9px] bg-violet-600/30 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded font-mono">AI</span>
              </div>
              <p className="text-[10px] text-purple-300/60">Enterprise Cross-Lingual Communication Suite</p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#100c21] border border-purple-900/60 px-3 py-1.5 rounded-full text-[11px] text-purple-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>AI Engine Online</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#100c21] border border-purple-900/60 px-3 py-1.5 rounded-full text-[11px] text-purple-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>WebSocket Secure</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#100c21] border border-purple-900/60 px-3 py-1.5 rounded-full text-[11px] text-purple-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Translation Ready</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-violet-900/40 to-indigo-900/40 border border-violet-500/30 px-3 py-1.5 rounded-full text-[11px] text-violet-200 font-medium">
            <Sparkles size={12} className="text-violet-400" />
            <span>Powered by Gemini</span>
          </div>
        </div>
        
        {joined && (
          <button onClick={handleLeave} className="bg-[#120f24] hover:bg-purple-950 text-purple-200 text-xs py-2 px-3.5 rounded-xl border border-purple-900/60 transition flex items-center gap-1.5 font-medium">
            <ArrowLeft size={14} /> Leave Room
          </button>
        )}
      </header>

      {/* MAIN VIEW */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 flex flex-col justify-center z-10">
        <AnimatePresence mode="wait">
          {!joined ? (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full flex flex-col space-y-8 my-auto py-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 flex flex-col space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="bg-violet-950/80 border border-violet-500/40 text-violet-300 text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Sparkles size={12} className="text-violet-400" /> AI-Powered • Real-time • Secure
                    </span>
                  </div>

                  <div>
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none">
                      Speak Naturally.<br />
                      <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">Connect Globally.</span>
                    </h2>
                    <p className="text-purple-300/70 text-sm sm:text-base mt-4 max-w-xl leading-relaxed">
                      Real-time AI translation that breaks language barriers and builds stronger connections across enterprise operations.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <span className="bg-[#100c21] border border-purple-900/60 text-purple-200 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2">
                      <Zap size={14} className="text-violet-400" /> Real-time Translation
                    </span>
                    <span className="bg-[#100c21] border border-purple-900/60 text-purple-200 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2">
                      <Cpu size={14} className="text-violet-400" /> Multi-Language
                    </span>
                    <span className="bg-[#100c21] border border-purple-900/60 text-purple-200 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2">
                      <Lock size={14} className="text-violet-400" /> Secure & Private
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="bg-[#0b0817] border border-purple-900/80 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none"></div>
                    
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="bg-violet-600/20 border border-violet-500/30 p-2.5 rounded-2xl text-violet-400">
                        <Users size={20} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-base">Join Secure Workspace</h3>
                        <p className="text-xs text-purple-300/60">Configure your room, language, and role.</p>
                      </div>
                    </div>

                    <form onSubmit={handleJoin} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1.5">Room Identifier</label>
                        <div className="relative">
                          <input 
                            type="text" value={room} onChange={(e) => setRoom(e.target.value)}
                            className="w-full bg-[#130f26] border border-purple-900/80 rounded-2xl py-3 pl-4 pr-10 text-white text-sm placeholder-purple-600 focus:ring-2 focus:ring-violet-500 outline-none"
                            placeholder="e.g. global-room-01" required
                          />
                          <CheckCircle size={16} className="absolute right-3.5 top-3.5 text-emerald-400" />
                        </div>
                        <span className="text-[10px] text-emerald-400 mt-1 block">✓ Room ready to connect.</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1.5">Your Language</label>
                          <select 
                            value={sourceLang} onChange={(e) => { setSourceLang(e.target.value); localStorage.setItem('chat_source_lang', e.target.value); }}
                            className="w-full bg-[#130f26] border border-purple-900/80 rounded-2xl py-3 px-3 text-white text-xs outline-none cursor-pointer"
                          >
                            {LANGUAGES.map((lang) => (
                              <option key={lang.code} value={lang.code}>{lang.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1.5">Translation Language</label>
                          <select 
                            value={targetLang} onChange={(e) => { setTargetLang(e.target.value); localStorage.setItem('chat_lang', e.target.value); }}
                            className="w-full bg-[#130f26] border border-purple-900/80 rounded-2xl py-3 px-3 text-white text-xs outline-none cursor-pointer"
                          >
                            {LANGUAGES.map((lang) => (
                              <option key={lang.code} value={lang.code}>{lang.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1.5">Operational Role</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            type="button" 
                            onClick={() => { setRole('customer'); localStorage.setItem('chat_role', 'customer'); }}
                            className={`py-3 rounded-2xl border text-center transition ${role === 'customer' ? 'bg-violet-600/20 border-violet-500 text-white' : 'bg-[#130f26] border-purple-900/60 text-purple-300'}`}
                          >
                            <span className="font-bold text-xs">Customer</span>
                          </button>
                          <button 
                            type="button" 
                            onClick={() => { setRole('employee'); localStorage.setItem('chat_role', 'employee'); }}
                            className={`py-3 rounded-2xl border text-center transition ${role === 'employee' ? 'bg-violet-600/20 border-violet-500 text-white' : 'bg-[#130f26] border-purple-900/60 text-purple-300'}`}
                          >
                            <span className="font-bold text-xs">Support Agent</span>
                          </button>
                        </div>
                      </div>

                      <button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 text-white font-bold py-3.5 rounded-2xl text-sm shadow-lg shadow-violet-600/30 transition flex items-center justify-center gap-2 mt-2">
                        Initialize Secure Connection →
                      </button>

                      <div className="text-center pt-1">
                        <span className="text-[10px] text-purple-400/60 flex items-center justify-center gap-1">
                          <Lock size={10} /> End-to-end encrypted • Your data is protected
                        </span>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full bg-[#0b0817] border border-purple-900/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[78vh] my-auto"
            >
              <div className="bg-[#06040f] border-b border-purple-950 p-4 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="font-bold text-sm text-white">Room: <span className="text-violet-400">{room}</span></span>
                  <div className="hidden sm:flex gap-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${role === 'customer' ? 'bg-emerald-900/50 text-emerald-300 border-emerald-500/30' : 'bg-amber-900/50 text-amber-300 border-amber-500/30'}`}>
                      Role: {role === 'customer' ? 'Customer' : 'Support Agent'}
                    </span>
                    <span className="text-[10px] bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">You: {sourceLang}</span>
                    <span className="text-[10px] bg-violet-900/50 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30">Target: {targetLang}</span>
                  </div>
                </div>
                <label className="flex items-center cursor-pointer gap-2 bg-[#130f26] border border-purple-900/60 py-1.5 px-3 rounded-xl text-xs">
                  <input type="checkbox" checked={ttsEnabled} onChange={() => setTtsEnabled(!ttsEnabled)} className="accent-violet-500 rounded cursor-pointer" />
                  <span className="text-purple-200">Auto-Speak</span>
                </label>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#06040f]/60">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-purple-400/50 space-y-2">
                    <MessageSquare size={36} />
                    <p className="text-sm">Secure workspace ready. Start messaging below!</p>
                  </div>
                )}
                {messages.map((msg, index) => (
                  <MessageBubble key={index} msg={msg} currentRole={role} />
                ))}
                {isTyping && (
                  <div className="flex items-center gap-2 bg-[#130f26] border border-purple-900/60 text-violet-300 text-xs py-2 px-4 w-fit rounded-full animate-pulse">
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-ping"></span>
                    <span>✨ Translating {sourceLang} to {targetLang}...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="px-4 py-2 bg-[#06040f] border-t border-purple-950 flex gap-2 overflow-x-auto items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400/70 flex items-center gap-1 shrink-0"><Sparkles size={12} className="text-violet-400" /> Quick:</span>
                {quickPhrases.map((phrase, idx) => (
                  <button key={idx} onClick={() => handleSend(phrase)} className="text-xs bg-[#130f26] hover:bg-purple-950 text-purple-200 border border-purple-900/60 px-3 py-1 rounded-full whitespace-nowrap transition">
                    {phrase}
                  </button>
                ))}
              </div>

              <div className="p-4 bg-[#06040f] border-t border-purple-950 flex gap-3 items-center">
                <input 
                  type="text" value={messageInput} 
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type your message here..." 
                  className="flex-1 bg-[#130f26] border border-purple-900/80 rounded-2xl px-4 py-3 text-sm text-white placeholder-purple-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button onClick={() => handleSend()} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 text-white p-3 rounded-2xl transition shadow-lg shadow-violet-600/30">
                  <Send size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="w-full bg-[#06040f] border-t border-purple-950 py-3 px-6 text-center text-xs text-purple-400/60">
        © 2026 BabelStream AI Inc. All rights reserved.
      </footer>
    </div>
  );
}