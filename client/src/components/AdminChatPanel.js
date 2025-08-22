import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import axios from 'axios';
import './AdminChatPanel.css';

const AdminChatPanel = () => {
  const { user } = useAuth();
  const { threads, reloadThreads, messages, setMessages, sendMessage, markReadAdmin, typing, emitTyping } = useChat();
  const [activeUserId, setActiveUserId] = useState(null);
  const [text, setText] = useState('');
  const endRef = useRef();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeUserId]);

  useEffect(() => {
    if (user?.role === 'admin') reloadThreads();
  }, [user, reloadThreads]);

  const openThread = async (uId) => {
    setActiveUserId(uId);
    try {
      const res = await axios.get(`/api/chat/thread/${uId}`);
      setMessages(res.data.messages || []);
      markReadAdmin(uId);
      reloadThreads();
    } catch (e) {}
  };

  if (!user || user.role !== 'admin') return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() || !activeUserId) return;
    sendMessage(text.trim(), activeUserId);
    setText('');
  };

  return (
    <div className="admin-chat-wrapper">
      <div className="threads">
        <h3>Chats</h3>
        <div className="thread-list">
          {threads
            .filter(t => !(t.lastSender === 'system' && /Welcome to Support/.test(t.lastMessage || '')))
            .map(t => (
            <div key={t.user._id} className={`thread-item ${activeUserId===t.user._id ? 'active' : ''}`} onClick={()=>openThread(t.user._id)}>
              <div className="title">{t.user.name || t.user.email}</div>
              <div className="last">{t.lastMessage?.slice(0,40)}</div>
              {t.unreadForAdmin > 0 && <span className="badge">{t.unreadForAdmin}</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="conversation">
        {activeUserId ? (
          <>
            <div className="messages">
              {messages
                .filter(m => m.user === activeUserId)
                .filter(m => !(m.sender === 'system' && /Welcome to Support/.test(m.message)))
                .map(m => (
                  <div key={m._id} className={`msg ${m.sender === 'admin' ? 'me' : m.sender === 'system' ? 'system' : 'user'}`}>
                    <div className={`bubble ${m.sender === 'system' ? 'system' : ''}`}>{m.message}</div>
                  </div>
                ))}
              {messages.filter(m => m.user === activeUserId).filter(m => !(m.sender === 'system' && /Welcome to Support/.test(m.message))).length === 0 && (
                <div className="msg system"><div className="bubble system">User hasn't started the conversation yet.</div></div>
              )}
              {typing[activeUserId] && (
                <div className="msg user"><div className="bubble typing"><span className="dot1"/><span className="dot2"/><span className="dot3"/></div></div>
              )}
              <div ref={endRef} />
            </div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 16px 6px', gap:'12px', flexWrap:'wrap'}}>
              <div style={{display:'flex', gap:'8px'}}>
              <button type="button" onClick={()=>{
                if (window.confirm('Close this chat? User will see a closure message and can start again.')) {
                  try { window.socket?.emit?.('chat:close', activeUserId); } catch(e) {}
                  // fallback using fetch to trigger event not needed since socket handles
                }
              }} className="close-chat-btn">Close</button>
              <button type="button" onClick={()=>{
                if (window.confirm('Permanently delete this chat thread? This clears history for user and removes from admin list.')) {
                  try { window.socket?.emit?.('chat:delete', activeUserId); } catch(e) {}
                  setMessages(prev => prev.filter(m => m.user !== activeUserId));
                  // Optimistically remove thread from local list
                  try { window.dispatchEvent(new CustomEvent('chat:threadDeleted', { detail: { user: activeUserId } })); } catch(e) {}
                  setActiveUserId(null);
                }
              }} className="close-chat-btn" style={{background:'linear-gradient(135deg,#475569,#1e293b)'}}>Delete</button>
              </div>
              <small style={{color:'#64748b'}}>Closing adds a system message</small>
            </div>
            <form className="input" onSubmit={handleSend}>
              <input value={text} onChange={e=>{ setText(e.target.value); emitTyping(activeUserId); }} placeholder="Reply..." />
              <button type="submit" disabled={!text.trim()}>Send</button>
            </form>
          </>
        ) : <div className="empty">Select a chat</div>}
      </div>
    </div>
  );
};

export default AdminChatPanel;
