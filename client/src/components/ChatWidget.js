import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';
import './ChatWidget.css';

const ChatWidget = () => {
  const { isAuthenticated, user } = useAuth();
  const { messages, sendMessage, connected, markReadUser, typing, emitTyping } = useChat();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [deleted, setDeleted] = useState(false);
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

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(text.trim());
    setText('');
  };

  const unread = messages.filter(m => m.sender === 'admin' && !m.readByUser).length;

  return (
    <div className={`chat-widget ${open ? 'open' : ''}`}> 
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <span>💬 Live Support {connected ? <span className="dot online" /> : <span className="dot offline" />}</span>
            <button onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="chat-messages">
            {messages.map(m => (
              <div key={m._id} className={`chat-msg ${m.sender === 'user' ? 'me' : m.sender === 'system' ? 'system' : 'admin'}`}> 
                <div className={`bubble ${m.sender === 'system' ? 'system' : ''}`}>{m.message}</div>
              </div>
            ))}
            {deleted && messages.length === 0 && (
              <div className="chat-msg system"><div className="bubble system">Chat history was cleared. Start a new conversation!</div></div>
            )}
            {Object.keys(typing).some(k => k === user?.id && false) && null}
            {Object.keys(typing).some(k => k === user?.id) && null}
            {Object.keys(typing).some(k => k !== user?.id) && (
              <div className="chat-msg admin"><div className="bubble typing"><span className="dot1"/><span className="dot2"/><span className="dot3"/></div></div>
            )}
            <div ref={endRef} />
          </div>
          <form className="chat-input" onSubmit={handleSend}>
            <input value={text} onChange={e => { setText(e.target.value); emitTyping(); }} placeholder="Type your message..." />
            <button type="submit" disabled={!text.trim()}>➤</button>
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
