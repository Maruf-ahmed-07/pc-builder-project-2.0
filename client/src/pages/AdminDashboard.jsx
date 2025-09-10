import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './AdminDashboard.css';
import AdminChatPanel from '../components/AdminChatPanel';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Only admins can access — redirect others.
  React.useEffect(() => {
    if (!user) {
      toast.error('Please login to access admin dashboard');
      navigate('/login');
      return;
    }
    if (user.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
      return;
    }
  }, [user, navigate]);

  // Fetch dashboard summary (counts & revenue).
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/dashboard');
      return response.data.stats;
    },
    enabled: user?.role === 'admin'
  });

  // Fetch orders (paginated, filtered).
  const { data: ordersData } = useQuery({
    queryKey: ['admin-orders', currentPage, filterStatus],
    queryFn: async () => {
      const response = await axios.get(`/api/admin/orders?page=${currentPage}&status=${filterStatus}&limit=10`);
      return response.data;
    },
    enabled: user?.role === 'admin' && activeTab === 'orders'
  });

  // Fetch users (paginated, searchable).
  const { data: usersData } = useQuery({
    queryKey: ['admin-users', currentPage, searchTerm],
    queryFn: async () => {
      const response = await axios.get(`/api/admin/users?page=${currentPage}&search=${searchTerm}&limit=10`);
      return response.data;
    },
    enabled: user?.role === 'admin' && activeTab === 'users'
  });

  // Fetch products (paginated, searchable).
  const { data: productsData } = useQuery({
    queryKey: ['admin-products', currentPage, searchTerm],
    queryFn: async () => {
      const response = await axios.get(`/api/admin/products?page=${currentPage}&search=${searchTerm}&limit=10`);
      return response.data;
    },
    enabled: user?.role === 'admin' && activeTab === 'products'
  });

  // Update order status; refresh data on success.
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }) => {
      const response = await axios.put(`/api/admin/orders/${orderId}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Order status updated successfully!');
      queryClient.invalidateQueries(['admin-orders']);
      queryClient.invalidateQueries(['admin-stats']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    }
  });

  // Toggle user active/inactive; refresh on success.
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }) => {
      const response = await axios.put(`/api/admin/users/${userId}/status`, { isActive });
      return response.data;
    },
    onSuccess: () => {
      toast.success('User status updated successfully!');
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['admin-stats']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update user status');
    }
  });

  // Delete a product; refresh on success.
  const deleteProductMutation = useMutation({
    mutationFn: async (productId) => {
      const response = await axios.delete(`/api/admin/products/${productId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Product deleted successfully!');
      queryClient.invalidateQueries(['admin-products']);
      queryClient.invalidateQueries(['admin-stats']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    }
  });

  // Call mutation to change order status.
  const handleUpdateOrderStatus = (orderId, status) => {
    updateOrderStatusMutation.mutate({ orderId, status });
  };

  // Confirm then toggle user's active state.
  const handleToggleUserStatus = (userId, currentStatus) => {
    if (window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) {
      toggleUserStatusMutation.mutate({ userId, isActive: !currentStatus });
    }
  };

  // Confirm then delete product.
  const handleDeleteProduct = (productId, productName) => {
    if (window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      deleteProductMutation.mutate(productId);
    }
  };

  // Format date/time for display.
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format number as USD currency.
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Pick a color for an order status badge.
  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'processing': return '#17a2b8';
      case 'shipped': return '#007bff';
      case 'delivered': return '#28a745';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // If not admin, render nothing (useEffect redirects).
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="container">
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h1>Admin Dashboard</h1>
          <p>Manage your e-commerce platform</p>
        </div>

  {/* Stats overview */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <h3>{stats.totalOrders || 0}</h3>
                <p>Total Orders</p>
                <span className="stat-change">
                  +{stats.ordersThisMonth || 0} this month
                </span>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>{stats.totalUsers || 0}</h3>
                <p>Total Users</p>
                <span className="stat-change">
                  +{stats.newUsersThisMonth || 0} this month
                </span>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🛍️</div>
              <div className="stat-content">
                <h3>{stats.totalProducts || 0}</h3>
                <p>Total Products</p>
                <span className="stat-change">
                  {stats.lowStockProducts || 0} low stock
                </span>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <h3>{formatCurrency(stats.totalRevenue || 0)}</h3>
                <p>Total Revenue</p>
                <span className="stat-change">
                  {formatCurrency(stats.revenueThisMonth || 0)} this month
                </span>
              </div>
            </div>
          </div>
        )}

  {/* Tabs */}
        <div className="admin-tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Orders
          </button>
          <button 
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button 
            className={`tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Products
          </button>
          <button
            className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            Live Chat
          </button>
        </div>

        <div className="tab-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="overview-grid">
                <div className="overview-card">
                  <h3>Recent Orders</h3>
                  <div className="quick-stats">
                    <div className="quick-stat">
                      <span className="label">Pending:</span>
                      <span className="value">{stats?.ordersByStatus?.pending || 0}</span>
                    </div>
                    <div className="quick-stat">
                      <span className="label">Processing:</span>
                      <span className="value">{stats?.ordersByStatus?.processing || 0}</span>
                    </div>
                    <div className="quick-stat">
                      <span className="label">Shipped:</span>
                      <span className="value">{stats?.ordersByStatus?.shipped || 0}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('orders')}
                    className="btn btn-outline-primary"
                  >
                    Manage Orders
                  </button>
                </div>

                <div className="overview-card">
                  <h3>User Activity</h3>
                  <div className="quick-stats">
                    <div className="quick-stat">
                      <span className="label">Active Users:</span>
                      <span className="value">{stats?.activeUsers || 0}</span>
                    </div>
                    <div className="quick-stat">
                      <span className="label">New This Week:</span>
                      <span className="value">{stats?.newUsersThisWeek || 0}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('users')}
                    className="btn btn-outline-primary"
                  >
                    Manage Users
                  </button>
                </div>

                <div className="overview-card">
                  <h3>Inventory Status</h3>
                  <div className="quick-stats">
                    <div className="quick-stat">
                      <span className="label">Low Stock:</span>
                      <span className="value text-warning">{stats?.lowStockProducts || 0}</span>
                    </div>
                    <div className="quick-stat">
                      <span className="label">Out of Stock:</span>
                      <span className="value text-danger">{stats?.outOfStockProducts || 0}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('products')}
                    className="btn btn-outline-primary"
                  >
                    Manage Products
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="orders-tab">
              <div className="tab-header">
                <h2>Order Management</h2>
                <div className="filters">
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
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

              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersData?.orders?.map(order => (
                      <tr key={order._id}>
                        <td>#{order.orderNumber}</td>
                        <td>
                          <div className="customer-info">
                            <span className="name">{order.user?.name}</span>
                            <span className="email">{order.user?.email}</span>
                          </div>
                        </td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>{formatCurrency(order.total)}</td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ backgroundColor: getOrderStatusColor(order.status) }}
                          >
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <select 
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                              disabled={updateOrderStatusMutation.isLoading}
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <button 
                              onClick={() => navigate(`/admin/orders/${order._id}`)}
                              className="btn btn-sm btn-outline-primary"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {ordersData?.pagination && (
                <div className="pagination">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="btn btn-outline-secondary"
                  >
                    Previous
                  </button>
                  <span className="page-info">
                    Page {currentPage} of {ordersData.pagination.totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, ordersData.pagination.totalPages))}
                    disabled={currentPage === ordersData.pagination.totalPages}
                    className="btn btn-outline-secondary"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="users-tab">
              <div className="tab-header">
                <h2>User Management</h2>
                <div className="search-filter">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData?.users?.map(user => (
                      <tr key={user._id}>
                        <td>
                          <div className="user-info">
                            <span className="name">{user.name}</span>
                            <span className="id">ID: {user._id.slice(-8)}</span>
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`role-badge ${user.role}`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>
                          <span className={`status-indicator ${user.isActive ? 'active' : 'inactive'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              onClick={() => handleToggleUserStatus(user._id, user.isActive)}
                              className={`btn btn-sm ${user.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                              disabled={toggleUserStatusMutation.isLoading}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {usersData?.pagination && (
                <div className="pagination">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="btn btn-outline-secondary"
                  >
                    Previous
                  </button>
                  <span className="page-info">
                    Page {currentPage} of {usersData.pagination.totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, usersData.pagination.totalPages))}
                    disabled={currentPage === usersData.pagination.totalPages}
                    className="btn btn-outline-secondary"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="products-tab">
              <div className="tab-header">
                <h2>Product Management</h2>
                <div className="header-actions">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button 
                    onClick={() => navigate('/admin/products/add')}
                    className="btn btn-primary"
                  >
                    Add Product
                  </button>
                </div>
              </div>

              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsData?.products?.map(product => (
                      <tr key={product._id}>
                        <td>
                          <div className="product-info">
                            <img 
                              src={product.images?.[0]?.url || '/placeholder-product.jpg'} 
                              alt={product.name}
                              className="product-thumbnail"
                              onError={(e) => {
                                e.target.src = '/placeholder-product.jpg';
                              }}
                            />
                            <div>
                              <span className="name">{product.name}</span>
                              <span className="brand">{product.brand}</span>
                            </div>
                          </div>
                        </td>
                        <td>{product.category}</td>
                        <td>{formatCurrency(product.price)}</td>
                        <td>
                          <span className={product.stock <= 10 ? 'text-warning' : product.stock === 0 ? 'text-danger' : ''}>
                            {product.stock}
                          </span>
                        </td>
                        <td>
                          <span className={`status-indicator ${product.stock > 0 ? 'active' : 'inactive'}`}>
                            {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              onClick={() => navigate(`/admin/products/edit/${product._id}`)}
                              className="btn btn-sm btn-outline-primary"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(product._id, product.name)}
                              className="btn btn-sm btn-outline-danger"
                              disabled={deleteProductMutation.isLoading}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {productsData?.pagination && (
                <div className="pagination">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="btn btn-outline-secondary"
                  >
                    Previous
                  </button>
                  <span className="page-info">
                    Page {currentPage} of {productsData.pagination.totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, productsData.pagination.totalPages))}
                    disabled={currentPage === productsData.pagination.totalPages}
                    className="btn btn-outline-secondary"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="chat-tab">
              <div className="tab-header" style={{marginBottom:'16px'}}>
                <h2>Customer Live Chat</h2>
                <p style={{color:'#64748b', margin:0}}>Respond to real-time customer inquiries</p>
              </div>
              <AdminChatPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
