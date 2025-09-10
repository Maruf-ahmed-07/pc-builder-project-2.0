import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [messages, setMessages] = useState([]);
  const [connected] = useState(true); // always true for REST polling
  const [threads, setThreads] = useState([]); // admin only
  const [typing] = useState({}); // placeholder (typing unsupported with REST)
  const [pollIntervalMs] = useState(4000);
  const activeAdminUserIdRef = useRef(null); // track which user thread admin is viewing
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

  // Initial fetch
  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      setMessages([]);
      return;
    }
    loadUserThread();
    loadAdminThreads();
  }, [isLoading, isAuthenticated, user, loadUserThread, loadAdminThreads]);

  // Polling for user messages
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    const id = setInterval(() => {
      if (user?.role === 'admin' && activeAdminUserIdRef.current) {
        // poll selected admin thread
        axios.get(`/api/chat/thread/${activeAdminUserIdRef.current}`).then(r => {
          if (Array.isArray(r.data.messages)) setMessages(r.data.messages);
        }).catch(()=>{});
      } else {
        loadUserThread();
      }
      if (user?.role === 'admin') {
        loadAdminThreads();
      }
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [isAuthenticated, isLoading, user, loadUserThread, loadAdminThreads, pollIntervalMs]);


  // Admin selects a thread to view
  const setActiveAdminUser = (userId) => {
    activeAdminUserIdRef.current = userId;
    if (!userId) {
      setMessages([]);
      return;
    }
    axios.get(`/api/chat/thread/${userId}`).then(r => {
      if (Array.isArray(r.data.messages)) setMessages(r.data.messages);
    }).catch(()=>{});
  };

  const sendMessage = async (text, targetUserId) => {
    const body = { text };
    try {
      let res;
      if (user?.role === 'admin' && targetUserId) {
        res = await axios.post(`/api/chat/message/${targetUserId}`, body);
        // refresh selected thread
        setActiveAdminUser(targetUserId);
      } else {
        res = await axios.post('/api/chat/message', body);
        loadUserThread();
      }
      if (audioRef.current && user?.role === 'admin') {
        // optional sound when admin sends
        try { audioRef.current.currentTime = 0; audioRef.current.play(); } catch (_) {}
      }
      return res?.data;
    } catch (e) {
      return { success: false };
    }
  };

  // emit typing
  const emitTyping = () => {}; // no-op in REST mode

  const markReadUser = async () => { try { await axios.post('/api/chat/read'); } catch(_){} };
  const markReadAdmin = async (userId) => { if (!userId) return; try { await axios.post(`/api/chat/read/${userId}`); } catch(_){} };

  const value = {
    messages,
    setMessages,
    sendMessage,
    connected,
    threads,
    reloadThreads: loadAdminThreads,
  presence: { onlineUsers: [], onlineAdmins: 0 }, // placeholder
    loadUserThread,
    markReadUser,
  markReadAdmin,
  typing,
  emitTyping,
  setActiveAdminUser
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
