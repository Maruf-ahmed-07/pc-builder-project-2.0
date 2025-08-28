import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';
import './ChatWidget.css';

const ChatWidget = () => {
  const { isAuthenticated, user } = useAuth();
  const { messages, sendMessage, connected, markReadUser, typing, emitTyping, setMessages } = useChat();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [deleted, setDeleted] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const endRef = useRef();

  useEffect(() => {
    if (open) markReadUser();
  }, [open, messages, markReadUser]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  // Watch for thread deletion (messages empties while open)
  useEffect(() => {
    if (open && messages.length === 0) {
      setDeleted(true);
    }
  }, [messages, open]);

  if (!isAuthenticated || user?.role === 'admin') return null;

  const handleSend = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    if (!useAI) {
      sendMessage(content);
      setText('');
      return;
    }
    // AI mode
    setAiLoading(true);
    setMessages(prev => prev.concat({ _id: 'temp-'+Date.now(), sender: 'user', message: content, createdAt: new Date().toISOString(), readByUser: true, readByAdmin: true }));
    setText('');
    try {
      const history = messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'ai', content: m.message })).slice(-10);
      const res = await fetch('/api/ai/chat', { 
        method:'POST', 
        headers:{ 'Content-Type':'application/json' }, 
        credentials: 'include',
        body: JSON.stringify({ message: content, history }) 
      });
      const data = await res.json();
      const reply = data.success ? data.reply : (data.message || 'AI error');
      setMessages(prev => prev.concat({ _id: 'ai-'+Date.now(), sender: 'admin',
        message: reply, createdAt: new Date().toISOString(), readByUser: true, readByAdmin: true, meta:{ ai:true } }));
    } catch (err) {
      setMessages(prev => prev.concat({ _id: 'aierr-'+Date.now(), sender: 'system', message: 'AI failed to respond.', createdAt: new Date().toISOString(), readByUser: true, readByAdmin: true }));
    } finally {
      setAiLoading(false);
    }
  };

  const unread = useAI ? 0 : messages.filter(m => m.sender === 'admin' && !m.readByUser).length;

  return (
    <div className={`chat-widget ${open ? 'open' : ''}`}> 
      {open && (
        <div className="chat-window">
          <div className={`chat-header ${useAI ? 'ai-mode' : ''}`}>
            <span>{useAI ? '🤖 AI Chatbot' : '💬 Live Support'} {connected ? <span className="dot online" /> : <span className="dot offline" />}</span>
            <button onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="chat-messages">
            {messages
              .filter(m => {
                if (useAI) {
                  // In AI mode, only show system, user, and AI messages
                  return m.sender === 'system' || m.sender === 'user' || m.meta?.ai;
                }
                // In live mode, show all messages except AI messages
                return !m.meta?.ai;
              })
              .map(m => {
              const roleClass = m.sender === 'user' ? 'me' : m.sender === 'system' ? 'system' : m.meta?.ai ? 'ai' : 'admin';
              return (
                <div key={m._id} className={`chat-msg ${roleClass}`}>
                  <div className={`bubble ${m.sender === 'system' ? 'system' : roleClass === 'ai' ? 'ai' : ''}`}>{m.message}</div>
                </div>
              );
            })}
            {deleted && messages.filter(m => useAI ? (m.sender === 'system' || m.sender === 'user' || m.meta?.ai) : (!m.meta?.ai)).length === 0 && (
              <div className="chat-msg system"><div className="bubble system">Chat history was cleared. Start a new conversation!</div></div>
            )}
            {Object.keys(typing).some(k => k === user?.id && false) && null}
            {Object.keys(typing).some(k => k === user?.id) && null}
            {!useAI && Object.keys(typing).some(k => k !== user?.id) && (
              <div className="chat-msg admin"><div className="bubble typing"><span className="dot1"/><span className="dot2"/><span className="dot3"/></div></div>
            )}
            <div ref={endRef} />
          </div>
          <form className="chat-input" onSubmit={handleSend}>
            <input value={text} onChange={e => { setText(e.target.value); emitTyping(); }} placeholder={useAI ? 'Ask AI anything about PCs...' : 'Type your message...'} />
            <button type="button" onClick={() => setUseAI(v => !v)} className={`mode-btn ${useAI ? 'on' : ''}`} title={useAI ? 'AI mode on' : 'Switch to AI'}>{useAI ? 'AI' : 'LIVE'}</button>
            <button type="submit" disabled={!text.trim() || aiLoading}>{aiLoading ? '…' : '➤'}</button>
          </form>
        </div>
      )}
      {!open && (
        <button className="chat-toggle" onClick={() => setOpen(true)}>
          <span className="icon">💬</span>
          <span className="label">Chat</span>
          {unread > 0 && <span className="badge">{unread}</span>}
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
