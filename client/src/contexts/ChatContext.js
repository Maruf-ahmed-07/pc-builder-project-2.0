import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [threads, setThreads] = useState([]); // admin only
  const [presence, setPresence] = useState({ onlineUsers: [], onlineAdmins: 0 });
  const [typing, setTyping] = useState({}); // { userId|self: timestamp }
  const audioRef = useRef(null);

  // Load existing thread 
  const loadUserThread = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    try {
      const res = await axios.get('/api/chat/thread');
      setMessages(res.data.messages || []);
    } catch (e) {
    }
  }, [isAuthenticated, user]);

  const loadAdminThreads = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    try {
      const res = await axios.get('/api/chat/threads');
      setThreads(res.data.threads || []);
    } catch (e) {}
  }, [user]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setMessages([]);
      return;
    }

    // Connect socket
    const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const s = io(base, { withCredentials: true });
  window.socket = s;
    socketRef.current = s;

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('chat:new', (msg) => {
      setMessages(prev => prev.concat(msg));
      // play notification if not own message
      if (audioRef.current && ((user?.role === 'admin' && msg.sender === 'user') || (user?.role === 'user' && msg.sender === 'admin'))) {
        try { audioRef.current.currentTime = 0; audioRef.current.play(); } catch (e) {}
      }
    });
    s.on('chat:presence', (data) => setPresence(data));
    s.on('chat:typing', (info) => {
      if (!info) return;
      setTyping(prev => ({ ...prev, [info.user || 'self']: info.ts }));
      // cleanup after 4s
      setTimeout(() => {
        setTyping(prev => {
          const copy = { ...prev };
          Object.keys(copy).forEach(k => { if (Date.now() - copy[k] > 3500) delete copy[k]; });
          return copy;
        });
      }, 4000);
    });
    s.on('chat:deleted', (info) => {
      if (!info?.user) return;
      setMessages(prev => prev.filter(m => m.user !== info.user));
  // Also remove the thread from admin 
  setThreads(prev => prev.filter(t => t?.user?._id !== info.user));
    });

    loadUserThread();
    loadAdminThreads();

    return () => {
      s.disconnect();
    };
  }, [isAuthenticated, isLoading, user, loadUserThread, loadAdminThreads]);


  useEffect(() => {
    const handler = (e) => {
      if (!e?.detail?.user) return;
      setThreads(prev => prev.filter(t => t?.user?._id !== e.detail.user));
    };
    window.addEventListener('chat:threadDeleted', handler);
    return () => window.removeEventListener('chat:threadDeleted', handler);
  }, []);

  const sendMessage = (text, targetUserId) => {
    if (!socketRef.current || !text) return;
    if (user?.role === 'admin' && targetUserId) {
      // For admin, we need to include userId
      socketRef.current.emit('chat:message', { text, userId: targetUserId });
    } else {
      socketRef.current.emit('chat:message', { text });
    }
  };

  // emit typing
  const emitTyping = (targetUserId) => {
    if (!socketRef.current) return;
    if (user?.role === 'admin') {
      socketRef.current.emit('chat:typing', { userId: targetUserId });
    } else {
      socketRef.current.emit('chat:typing', {});
    }
  };

  const markReadUser = () => socketRef.current?.emit('chat:markReadUser');
  const markReadAdmin = (userId) => socketRef.current?.emit('chat:markReadAdmin', userId);

  const value = {
    messages,
    setMessages,
    sendMessage,
    connected,
    threads,
    reloadThreads: loadAdminThreads,
    presence,
    loadUserThread,
    markReadUser,
  markReadAdmin,
  typing,
  emitTyping,
    socket: socketRef.current
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="auto" style={{ display:'none' }}>
        <source src="data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA///////////////////////////////////////////////8AAAAALGFuYyBtcDMAAAAAAAAAAAAAAAACcQCA///////////////////////////////////////////////8AAAAAEkxhdmY1OC4yNS4xMDA= " type="audio/mpeg" />
      </audio>
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
