import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
// Polling implementation (socket removed for serverless)
import API_BASE_URL from '../config/api';
import axios from 'axios';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]); // admin only
  const [presence, setPresence] = useState({ onlineUsers: [], onlineAdmins: 0 });
  const audioRef = useRef(null);
  const intervalRef = useRef(null);

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
      setMessages([]);
      setThreads([]);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    loadUserThread();
    loadAdminThreads();
    fetchPresence();
    intervalRef.current = setInterval(() => {
      loadUserThread();
      if (user?.role === 'admin') loadAdminThreads();
      fetchPresence();
    }, 5000);
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [isAuthenticated, isLoading, user, loadUserThread, loadAdminThreads]);


  useEffect(() => {
    const handler = (e) => {
      if (!e?.detail?.user) return;
      setThreads(prev => prev.filter(t => t?.user?._id !== e.detail.user));
    };
    window.addEventListener('chat:threadDeleted', handler);
    return () => window.removeEventListener('chat:threadDeleted', handler);
  }, []);

  const sendMessage = async (text, targetUserId) => {
    if (!text) return;
    try {
      await axios.post('/api/chat/send', { text, userId: targetUserId });
      if (user?.role === 'admin' && targetUserId) {
        loadAdminThreads();
        const res = await axios.get(`/api/chat/thread/${targetUserId}`);
        setMessages(res.data.messages || []);
      } else {
        loadUserThread();
      }
    } catch (e) {}
  };

  // emit typing
  const emitTyping = () => {};

  const markReadUser = async () => { try { await axios.post('/api/chat/read'); } catch(e){} };
  const markReadAdmin = async (userId) => { if (!userId) return; try { await axios.post(`/api/chat/read/${userId}`); } catch(e){} };

  const fetchPresence = async () => {
    try {
      const res = await axios.get('/api/chat/presence');
      setPresence(res.data);
    } catch (e) {}
  };

  const value = {
    messages,
    setMessages,
    sendMessage,
    threads,
    reloadThreads: loadAdminThreads,
    presence,
    loadUserThread,
    markReadUser,
    markReadAdmin,
    typing: {},
    emitTyping
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
