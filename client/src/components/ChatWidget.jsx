import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
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
  // Separate in-memory AI-only thread so live messages never include AI ones
  const [aiThread, setAiThread] = useState([]);
  const endRef = useRef();

  useEffect(() => {
    if (open) markReadUser();
  }, [open, messages, markReadUser]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  // Inject a welcome message when first entering AI mode with empty AI thread
  useEffect(() => {
    if (useAI && aiThread.length === 0) {
      setAiThread([
        {
          _id: 'aiwelcome',
            sender: 'system',
            message: 'Welcome to our custom AI PC Assistant! Ask me anything about components, compatibility, performance, or recommendations. 🔧💻',
            createdAt: new Date().toISOString()
        }
      ]);
    }
  }, [useAI, aiThread, setAiThread]);

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
      // Live support path via socket
      sendMessage(content);
      setText('');
      return;
    }
    // AI mode path (do NOT mutate live messages state)
    setAiLoading(true);
    const userMsg = { _id: 'aiu-' + Date.now(), sender: 'user', message: content, createdAt: new Date().toISOString() };
    setAiThread(prev => prev.concat(userMsg));
    setText('');
    try {
      // Build history from AI thread only (last 10 turns)
      const history = aiThread.concat(userMsg).slice(-10).map(m => ({ role: m.sender === 'user' ? 'user' : 'ai', content: m.message }));
  const { data } = await axios.post('/api/ai/chat', { message: content, history });
  const reply = data.success ? data.reply : (data.message || 'AI error');
      const aiMsg = { _id: 'aib-' + Date.now(), sender: 'admin', message: reply, createdAt: new Date().toISOString(), meta: { ai: true } };
      setAiThread(prev => prev.concat(aiMsg));
    } catch (err) {
      setAiThread(prev => prev.concat({ _id: 'aie-' + Date.now(), sender: 'system', message: 'AI failed to respond.', createdAt: new Date().toISOString() }));
    } finally {
      setAiLoading(false);
    }
  };

  // Unread only matters in live mode
  const unread = !useAI ? messages.filter(m => m.sender === 'admin' && !m.readByUser).length : 0;

  // Filter messages based on mode
  const liveMessages = messages.filter(m => !m.meta?.ai && m.sender !== 'ai');
  const filteredMessages = useAI ? aiThread : liveMessages;

  return (
    <div className={`chat-widget ${open ? 'open' : ''}`}> 
      {open && (
        <div className="chat-window">
          <div className={`chat-header ${useAI ? 'ai-mode' : ''}`}>
            <span>{useAI ? '🤖 AI Chatbot' : '💬 Live Support'} {connected ? <span className="dot online" /> : <span className="dot offline" />}</span>
            <button onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="chat-messages">
            {filteredMessages.map(m => {
              const roleClass = m.sender === 'user' ? 'me' : m.sender === 'system' ? 'system' : (m.meta?.ai) ? 'ai' : 'admin';
              return (
                <div key={m._id} className={`chat-msg ${roleClass}`}>
                  <div className={`bubble ${roleClass === 'system' ? 'system' : roleClass === 'ai' ? 'ai' : ''}`}>{m.message}</div>
                </div>
              );
            })}
            {deleted && filteredMessages.length === 0 && (
              <div className="chat-msg system"><div className="bubble system">Chat history was cleared. Start a new conversation!</div></div>
            )}
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
