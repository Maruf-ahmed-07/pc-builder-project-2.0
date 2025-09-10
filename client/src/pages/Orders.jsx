import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Orders.css';

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');

  // Redirect if not logged in
  React.useEffect(() => {
    if (!user) {
      toast.error('Please login to view your orders');
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch orders
  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', page, filter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      
      if (filter !== 'all') {
        params.append('status', filter);
      }
      
      const response = await axios.get(`/api/orders?${params}`);
      return response.data;
    },
    enabled: !!user
  });

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      const response = await axios.put(`/api/orders/${orderId}/cancel`, {
        reason: 'Cancelled by customer'
      });
      
      if (response.data.success) {
        toast.success('Order cancelled successfully');
        // Refetch orders
        window.location.reload();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'processing': return '#17a2b8';
      case 'shipped': return '#007bff';
      case 'delivered': return '#28a745';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (isLoading) {
    return (
      <div className="container">
        <div className="loading-spinner">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error-message">
          <h2>Error Loading Orders</h2>
          <p>Failed to load your orders. Please try again later.</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { orders = [], pagination } = data || {};

  return (
    <div className="container">
      <div className="orders-page">
        <div className="page-header">
          <h1>My Orders</h1>
          <p>Track and manage your orders</p>
        </div>

        {/* Filter Controls */}
        <div className="orders-filters">
          <div className="filter-group">
            <label>Filter by Status:</label>
            <select 
              value={filter} 
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon">📦</div>
            <h3>No Orders Found</h3>
            <p>You haven't placed any orders yet. Start shopping to see your orders here!</p>
            <button 
              onClick={() => navigate('/products')} 
              className="btn btn-primary"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <h3>Order #{order.orderNumber}</h3>
                    <div className="order-meta">
                      <span>Placed on {formatDate(order.createdAt)}</span>
                      <span className="separator">•</span>
                      <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="order-status">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    <div className="order-total">${order.total.toFixed(2)}</div>
                  </div>
                </div>

                <div className="order-items">
                  {order.items.slice(0, 3).map(item => (
                    <div key={item.product._id} className="order-item">
                      <img 
                        src={item.product.images?.[0]?.url || '/placeholder-product.jpg'} 
                        alt={item.product.name}
                        onError={(e) => {
                          e.target.src = '/placeholder-product.jpg';
                        }}
                      />
                      <div className="item-details">
                        <h4>{item.product.name}</h4>
                        <p>{item.product.brand}</p>
                        <span className="item-quantity">Qty: {item.quantity}</span>
                      </div>
                      <div className="item-price">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="more-items">
                      +{order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                <div className="order-actions">
                  <button 
                    onClick={() => navigate(`/orders/${order._id}`)}
                    className="btn btn-outline-primary"
                  >
                    View Details
                  </button>
                  
                  {order.trackingNumber && (
                    <button 
                      onClick={() => {
                        // Open tracking in new tab (mock URL)
                        window.open(`https://tracking.example.com/${order.trackingNumber}`, '_blank');
                      }}
                      className="btn btn-outline-secondary"
                    >
                      Track Package
                    </button>
                  )}
                  
                  {(order.status === 'pending' || order.status === 'processing') && (
                    <button 
                      onClick={() => handleCancelOrder(order._id)}
                      className="btn btn-outline-danger"
                    >
                      Cancel Order
                    </button>
                  )}
                  
                  {order.status === 'delivered' && (
                    <button 
                      onClick={() => navigate(`/products/${order.items[0].product._id}`)}
                      className="btn btn-outline-success"
                    >
                      Order Again
                    </button>
                  )}
                </div>

                {order.estimatedDelivery && order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div className="delivery-info">
                    <span>📅 Estimated delivery: {formatDate(order.estimatedDelivery)}</span>
                  </div>
                )}

                {order.deliveredAt && (
                  <div className="delivery-info delivered">
                    <span>✅ Delivered on {formatDate(order.deliveredAt)}</span>
                  </div>
                )}

                {order.status === 'cancelled' && (
                  <div className="cancellation-info">
                    <span>❌ Cancelled on {formatDate(order.cancelledAt)}</span>
                    {order.cancellationReason && (
                      <span className="reason">Reason: {order.cancellationReason}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="btn btn-outline-primary"
            >
              Previous
            </button>
            
            <div className="page-info">
              Page {pagination.page} of {pagination.pages}
            </div>
            
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.pages}
              className="btn btn-outline-primary"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
