import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './SupportTickets.css';

const TicketDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const res = await axios.get(`/api/contact/${id}`);
      return res.data.contact;
    }
  });

  const replyMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axios.post(`/api/contact/${id}/response`, { message: payload });
      return res.data.contact;
    },
    onSuccess: (updated) => {
      toast.success('Reply sent');
      setReply('');
      queryClient.setQueryData(['ticket', id], updated);
      queryClient.invalidateQueries(['my-tickets']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    }
  });

  if (isLoading) return <div className="container"><div className="loading">Loading ticket...</div></div>;
  if (isError) return <div className="container"><div className="error">Failed to load ticket.</div></div>;

  return (
    <div className="container">
      <div className="ticket-detail-page">
        <div className="breadcrumb">
          <Link to="/support/tickets" className="link">← Back to My Tickets</Link>
        </div>
        <div className="ticket-header">
          <h1>{data.subject}</h1>
          <div className="meta">
            <span className={`status-badge status-${data.status.replace(/\s+/g,'-').toLowerCase()}`}>{data.status}</span>
            <span className={`priority-badge priority-${data.priority?.toLowerCase()}`}>{data.priority}</span>
            <span className="category">{data.category}</span>
            <span className="created">Opened {new Date(data.createdAt).toLocaleString()}</span>
          </div>
        </div>

        <div className="original-message card">
          <h3>Original Message</h3>
          <p className="message-body">{data.message}</p>
        </div>

        <div className="responses-section">
          <h3>Conversation</h3>
          <div className="responses-list">
            {data.responses && data.responses.length ? (
              data.responses.map(r => (
                <div key={r._id + r.respondedAt} className={`response-item ${r.respondedBy?._id === data.user?._id ? 'user-reply' : 'admin-reply'}`}>
                  <div className="response-meta">
                    <strong>{r.respondedBy?.name || 'User'}</strong>
                    <span>{new Date(r.respondedAt).toLocaleString()}</span>
                  </div>
                  <div className="response-message">{r.message}</div>
                </div>
              ))
            ) : (
              <div className="empty-conversation">No replies yet.</div>
            )}
          </div>
        </div>

        {data.status !== 'Closed' && (
          <form className="reply-box" onSubmit={(e) => { e.preventDefault(); if(!reply.trim()) return; replyMutation.mutate(reply.trim()); }}>
            <textarea
              placeholder="Type your reply..."
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={4}
            />
            <div className="reply-actions">
              <button type="submit" className="btn btn-primary" disabled={replyMutation.isLoading || !reply.trim()}>
                {replyMutation.isLoading ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </form>
        )}

        {data.status === 'Closed' && (
          <div className="ticket-closed-note">This ticket is closed. You cannot reply.</div>
        )}
      </div>
    </div>
  );
};

export default TicketDetail;
