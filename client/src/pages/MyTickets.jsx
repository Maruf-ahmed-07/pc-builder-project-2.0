import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './SupportTickets.css';

const MyTickets = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-tickets', page],
    queryFn: async () => {
      const res = await axios.get(`/api/contact/my-submissions?page=${page}&limit=10`);
      return res.data;
    },
    keepPreviousData: true
  });

  const tickets = data?.contacts || [];
  const pagination = data?.pagination;

  return (
    <div className="container">
      <div className="support-page">
        <div className="page-header">
          <h1>My Support Tickets</h1>
          <p>View your submitted tickets and check for admin replies.</p>
        </div>

        {isLoading && <div className="loading">Loading tickets...</div>}
        {isError && <div className="error">{error.response?.data?.message || 'Failed to load tickets.'}</div>}

        {!isLoading && !tickets.length && (
          <div className="empty-state">
            <h3>No tickets yet</h3>
            <p>You haven't created any support tickets. Need help?</p>
            <Link to="/contact" className="btn btn-primary">Create a Ticket</Link>
          </div>
        )}

        {!!tickets.length && (
          <div className="tickets-table-wrapper">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Category</th>
                  <th>Replies</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t._id}>
                    <td className="subject-cell">
                      <strong>{t.subject}</strong>
                    </td>
                    <td><span className={`status-badge status-${t.status.replace(/\s+/g,'-').toLowerCase()}`}>{t.status}</span></td>
                    <td><span className={`priority-badge priority-${t.priority?.toLowerCase()}`}>{t.priority}</span></td>
                    <td>{t.category}</td>
                    <td>{t.responses?.length || 0}</td>
                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/support/tickets/${t._id}`} className="btn btn-sm btn-outline-primary">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination && pagination.totalPages > 1 && (
              <div className="pagination">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
                <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;
