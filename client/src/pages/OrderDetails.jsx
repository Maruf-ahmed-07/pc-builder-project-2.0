import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import './OrderDetails.css';

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOrderDetails();
  }, [orderId, isAuthenticated, navigate]);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/orders/${orderId}`);
      setOrder(response.data.order);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to load order details');
      navigate('/orders');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#fbbf24',
      processing: '#3b82f6',
      shipped: '#8b5cf6',
      delivered: '#10b981',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const canCancelOrder = (status) => {
    return ['pending', 'processing'].includes(status);
  };

  const canDownloadInvoice = (status) => {
    return status !== 'cancelled';
  };

  const handleCancelOrder = async () => {
    if (!cancellationReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    try {
      await axios.patch(`/api/orders/${orderId}/cancel`, {
        reason: cancellationReason.trim()
      });
      
      toast.success('Order cancelled successfully');
      setShowCancelModal(false);
      fetchOrderDetails(); // Refresh order data
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    }
  };

  const downloadInvoice = async () => {
    if (!canDownloadInvoice(order.status)) {
      toast.error('Invoice not available for cancelled orders');
      return;
    }

    try {
      setIsDownloading(true);
      const response = await axios.get(`/api/orders/${orderId}/invoice`, {
        responseType: 'blob'
      });

      // Create a blob URL and download the file
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container">
        <div className="loading-spinner">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container">
        <div className="error-message">
          <h2>Order Not Found</h2>
          <p>The order you're looking for doesn't exist or you don't have permission to view it.</p>
          <button className="btn btn-primary" onClick={() => navigate('/orders')}>
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="order-details-page">
        {/* Header */}
        <div className="order-header">
          <div className="header-left">
            <button className="back-btn" onClick={() => navigate('/orders')}>
              ← Back to Orders
            </button>
            <div className="order-title">
              <h1>Order #{order.orderNumber}</h1>
              <p className="order-date">
                Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          <div className="header-right">
            <div className="order-status" style={{ backgroundColor: getStatusColor(order.status) }}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </div>
          </div>
        </div>

        {/* Order Actions */}
        <div className="order-actions">
          {canDownloadInvoice(order.status) && (
            <button 
              className="btn btn-primary"
              onClick={downloadInvoice}
              disabled={isDownloading}
            >
              {isDownloading ? 'Downloading...' : 'Download Invoice'}
            </button>
          )}
          {canCancelOrder(order.status) && (
            <button 
              className="btn btn-danger"
              onClick={() => setShowCancelModal(true)}
            >
              Cancel Order
            </button>
          )}
        </div>

        {/* Order Content */}
        <div className="order-content">
          {/* Order Items */}
          <div className="order-section">
            <h2>Order Items</h2>
            <div className="order-items">
              {order.items.map(item => (
                <div key={item.product._id} className="order-item">
                  <div className="item-image">
                    <img 
                      src={item.product.images?.[0]?.url || '/placeholder-product.jpg'} 
                      alt={item.product.name}
                      onError={(e) => {
                        e.target.src = '/placeholder-product.jpg';
                      }}
                    />
                  </div>
                  <div className="item-details">
                    <h3>{item.product.name}</h3>
                    <p className="item-brand">{item.product.brand}</p>
                    <p className="item-category">{item.product.category}</p>
                    <div className="item-quantity">Quantity: {item.quantity}</div>
                  </div>
                  <div className="item-pricing">
                    <div className="item-price">${item.price.toFixed(2)} each</div>
                    <div className="item-total">${(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="order-details-grid">
            {/* Shipping Information */}
            <div className="order-section">
              <h2>Shipping Address</h2>
              <div className="address-card">
                <p><strong>{order.shippingAddress.fullName}</strong></p>
                <p>{order.shippingAddress.address}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                <p>{order.shippingAddress.country}</p>
                <p><strong>Phone:</strong> {order.shippingAddress.phone}</p>
              </div>
            </div>

            {/* Billing Information */}
            <div className="order-section">
              <h2>Billing Address</h2>
              <div className="address-card">
                <p><strong>{order.billingAddress.fullName}</strong></p>
                <p>{order.billingAddress.address}</p>
                <p>{order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.zipCode}</p>
                <p>{order.billingAddress.country}</p>
                <p><strong>Phone:</strong> {order.billingAddress.phone}</p>
              </div>
            </div>

            {/* Payment Information */}
            <div className="order-section">
              <h2>Payment Information</h2>
              <div className="payment-card">
                <p><strong>Method:</strong> {order.paymentMethod.replace('_', ' ').toUpperCase()}</p>
                {order.paymentDetails?.cardNumber && (
                  <p><strong>Card:</strong> ****{order.paymentDetails.cardNumber}</p>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="order-section">
              <h2>Order Summary</h2>
              <div className="summary-card">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping:</span>
                  <span>{order.shipping === 0 ? 'Free' : `$${order.shipping.toFixed(2)}`}</span>
                </div>
                <div className="summary-row">
                  <span>Tax:</span>
                  <span>${order.tax.toFixed(2)}</span>
                </div>
                <div className="summary-row total">
                  <span><strong>Total:</strong></span>
                  <span><strong>${order.total.toFixed(2)}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Tracking Information */}
          {order.trackingNumber && (
            <div className="order-section">
              <h2>Tracking Information</h2>
              <div className="tracking-card">
                <p><strong>Tracking Number:</strong> {order.trackingNumber}</p>
                {order.estimatedDelivery && (
                  <p><strong>Estimated Delivery:</strong> {new Date(order.estimatedDelivery).toLocaleDateString()}</p>
                )}
                {order.deliveredAt && (
                  <p><strong>Delivered On:</strong> {new Date(order.deliveredAt).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          )}

          {/* Order Notes */}
          {order.notes && (
            <div className="order-section">
              <h2>Order Notes</h2>
              <div className="notes-card">
                <p>{order.notes}</p>
              </div>
            </div>
          )}

          {/* Cancellation Information */}
          {order.status === 'cancelled' && (
            <div className="order-section">
              <h2>Cancellation Information</h2>
              <div className="cancellation-card">
                <p><strong>Cancelled On:</strong> {new Date(order.cancelledAt).toLocaleDateString()}</p>
                {order.cancellationReason && (
                  <p><strong>Reason:</strong> {order.cancellationReason}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cancel Order Modal */}
        {showCancelModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Cancel Order</h3>
                <button className="modal-close" onClick={() => setShowCancelModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to cancel this order? This action cannot be undone.</p>
                <div className="form-group">
                  <label htmlFor="cancellationReason">Reason for cancellation *</label>
                  <textarea
                    id="cancellationReason"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Please provide a reason for cancelling this order..."
                    rows={3}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowCancelModal(false)}>
                  Keep Order
                </button>
                <button className="btn btn-danger" onClick={handleCancelOrder}>
                  Cancel Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetails;
