import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './AdminPanel.css';
import AdminChatPanel from '../components/AdminChatPanel';

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  // Edit UI state
  const [editForm, setEditForm] = useState(null);
  const [editTab, setEditTab] = useState('general');
  const [imageRows, setImageRows] = useState([]);
  const [specRows, setSpecRows] = useState([]);

  // Create UI state
  const [createForm, setCreateForm] = useState({
    name: '',
    brand: '',
    category: 'CPU',
    model: '',
    price: '',
    discountPrice: '',
    stock: '',
    description: '',
    isActive: true,
    featured: false,
  });
  const [createTab, setCreateTab] = useState('general');
  const [createImageRows, setCreateImageRows] = useState([]);
  const [createSpecRows, setCreateSpecRows] = useState([]);

  // Spec helpers

  const objectToRows = (obj) => {
    if (!obj) return [];
    return Object.entries(obj).map(([key, value], idx) => ({ id: idx + 1 + '_' + key, key, value }));
  };
  const rowsToObject = (rows) => {
    const result = {};
    rows.forEach(r => {
      const k = (r.key || '').trim();
      if (k) result[k] = (r.value ?? '').toString();
    });
    return result;
  };

  // Init edit form when item selected
  React.useEffect(() => {
    if (selectedItem && selectedItem.name) {
      setEditForm({
        name: selectedItem.name || '',
        brand: selectedItem.brand || '',
        category: selectedItem.category || 'CPU',
        model: selectedItem.model || '',
        price: selectedItem.price ?? '',
        discountPrice: selectedItem.discountPrice ?? '',
        stock: selectedItem.stock ?? 0,
  description: selectedItem.description || '',
        isActive: !!selectedItem.isActive,
        featured: !!selectedItem.featured,
  specifications: selectedItem.specifications || {},
      });
      setImageRows((selectedItem.images || []).map((img, i) => ({ id: 'img_' + i, url: img.url || '', alt: img.alt || '' })));
      setSpecRows(objectToRows(selectedItem.specifications || {}));
      setEditTab('general');
    } else {
      setEditForm(null);
      setImageRows([]);
      setSpecRows([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem]);

  // Init create form when modal opens
  React.useEffect(() => {
    if (showCreateModal) {
      setCreateForm({
        name: '', brand: '', category: 'CPU', model: '', price: '', discountPrice: '', stock: '', description: '', isActive: true, featured: false,
      });
      setCreateImageRows([]);
      setCreateSpecRows([]);
      setCreateTab('general');
    }
  }, [showCreateModal]);

  // Only admins - redirect others
  React.useEffect(() => {
    if (!user) {
      toast.error('Please login to access admin panel');
      navigate('/login');
      return;
    }
    if (user.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
      return;
    }
  }, [user, navigate]);

  // Fetch dashboard data
  const { data: dashboardData } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/dashboard');
      return response.data;
    },
    enabled: user?.role === 'admin' && activeTab === 'dashboard'
  });

  // Fetch orders (paginated)
  const { data: ordersData } = useQuery({
    queryKey: ['admin-orders', currentPage, filterStatus],
    queryFn: async () => {
      const response = await axios.get(`/api/admin/orders?page=${currentPage}&status=${filterStatus}&limit=10`);
      return response.data;
    },
    enabled: user?.role === 'admin' && activeTab === 'orders'
  });

  // Fetch users (paginated)
  const { data: usersData } = useQuery({
    queryKey: ['admin-users', currentPage, searchTerm],
    queryFn: async () => {
      const response = await axios.get(`/api/admin/users?page=${currentPage}&search=${searchTerm}&limit=10`);
      return response.data;
    },
    enabled: user?.role === 'admin' && activeTab === 'users'
  });

  // Fetch products (paginated)
  const { data: productsData } = useQuery({
    queryKey: ['admin-products', currentPage, searchTerm],
    queryFn: async () => {
      const response = await axios.get(`/api/admin/products?page=${currentPage}&search=${searchTerm}&limit=10`);
      return response.data;
    },
    enabled: user?.role === 'admin' && activeTab === 'products'
  });

  // Fetch builds (paginated)
  const { data: buildsData } = useQuery({
    queryKey: ['admin-builds', currentPage],
    queryFn: async () => {
      const response = await axios.get(`/api/admin/builds?page=${currentPage}&limit=10`);
      return response.data;
    },
    enabled: user?.role === 'admin' && activeTab === 'builds'
  });

  // Fetch analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/analytics');
      return response.data.analytics;
    },
    enabled: user?.role === 'admin' && activeTab === 'analytics'
  });

  // Fetch inventory
  const { data: inventoryData } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/inventory');
      return response.data.inventory;
    },
    enabled: user?.role === 'admin' && activeTab === 'inventory'
  });

  // Fetch tickets (paginated)
  const { data: ticketsData } = useQuery({
    queryKey: ['admin-tickets', currentPage, filterStatus],
    queryFn: async () => {
  const statusQS = filterStatus === 'all' ? '' : `&status=${encodeURIComponent(filterStatus)}`;
  const response = await axios.get(`/api/admin/contacts?page=${currentPage}${statusQS}&limit=10`);
      return response.data;
    },
    enabled: user?.role === 'admin' && activeTab === 'tickets'
  });

  // Update order status
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }) => {
      const response = await axios.put(`/api/admin/orders/${orderId}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Order status updated successfully!');
      queryClient.invalidateQueries(['admin-orders']);
      queryClient.invalidateQueries(['admin-dashboard']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    }
  });

  // Toggle user status
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }) => {
      const response = await axios.put(`/api/admin/users/${userId}`, { isActive });
      return response.data;
    },
    onSuccess: () => {
      toast.success('User status updated successfully!');
      queryClient.invalidateQueries(['admin-users']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update user status');
    }
  });

  // Create product
  const createProductMutation = useMutation({
    mutationFn: async (productData) => {
      const response = await axios.post('/api/admin/products', productData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Product created successfully!');
      queryClient.invalidateQueries(['admin-products']);
      setShowCreateModal(false);
      setCreateForm({ name: '', brand: '', category: 'CPU', model: '', price: '', discountPrice: '', stock: '', description: '', isActive: true, featured: false });
      setCreateImageRows([]);
      setCreateSpecRows([]);
      setCreateTab('general');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create product');
    }
  });

  // Update product
  const updateProductMutation = useMutation({
    mutationFn: async ({ productId, data }) => {
      const response = await axios.put(`/api/admin/products/${productId}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Product updated successfully!');
      queryClient.invalidateQueries(['admin-products']);
      setSelectedItem(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update product');
    }
  });

  // Delete product
  const deleteProductMutation = useMutation({
    mutationFn: async (productId) => {
      const response = await axios.delete(`/api/admin/products/${productId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Product deleted successfully!');
      queryClient.invalidateQueries(['admin-products']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    }
  });

  // Toggle build featured
  const toggleBuildFeaturedMutation = useMutation({
    mutationFn: async (buildId) => {
      const response = await axios.put(`/api/admin/builds/${buildId}/featured`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Build featured status updated!');
      queryClient.invalidateQueries(['admin-builds']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update build');
    }
  });

  // Reply to ticket
  const replyToTicketMutation = useMutation({
    mutationFn: async ({ ticketId, message, isInternal = false }) => {
      const response = await axios.post(`/api/admin/contacts/${ticketId}/response`, { 
        message, 
        isInternal 
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Reply sent successfully!');
      queryClient.invalidateQueries(['admin-tickets']);
      setSelectedItem(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send reply');
    }
  });

  // Update ticket status
  const updateTicketStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status, assignedTo }) => {
      const response = await axios.put(`/api/admin/contacts/${ticketId}/status`, { 
        status, 
        assignedTo 
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Ticket status updated successfully!');
      queryClient.invalidateQueries(['admin-tickets']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update ticket status');
    }
  });

  // Legacy handler removed

  const renderDashboard = () => {
    if (!dashboardData) return <div>Loading...</div>;
    
    const { stats, recentOrders, revenueChart, topCategories } = dashboardData;

  // Build sparkline path
    const buildSparkline = (data = [], w = 140, h = 40) => {
      if (!data || data.length === 0) return null;
      const vals = data.map(d => d.revenue || 0);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const range = max - min || 1;
      const step = w / (vals.length - 1 || 1);
      const points = vals.map((v, i) => {
        const x = i * step;
        const y = h - ((v - min) / range) * h;
        return `${x},${y}`;
      }).join(' ');
      const pathD = vals.map((v, i) => {
        const x = i * step;
        const y = h - ((v - min) / range) * h;
        return (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
      }).join(' ');
      return { points, pathD, w, h };
    };

    const spark = buildSparkline(revenueChart || [], 160, 40);
    const revenueTotal = (revenueChart || []).reduce((s,d)=> s + (d.revenue||0), 0);
    const growthPercent = revenueChart && revenueChart.length >= 2 ? ((revenueChart[revenueChart.length-1].revenue - revenueChart[0].revenue) / (revenueChart[0].revenue || 1) * 100).toFixed(1) : '0.0';

    return (
      <div className="admin-dashboard">
        <h2>Dashboard Overview</h2>

        <div className="dashboard-hero">
          <div className="hero-card">
            <div className="hero-left">
              <div className="hero-title">Monthly Revenue</div>
              <div className="hero-value">${(stats.monthlyRevenue || 0).toLocaleString()}</div>
              <div className="hero-sub">Last 7 days: ${revenueTotal.toLocaleString()}</div>
              <div className={`trend-badge ${parseFloat(growthPercent) >= 0 ? 'up' : 'down'}`}>
                {parseFloat(growthPercent) >= 0 ? '▲' : '▼'} {Math.abs(growthPercent)}%
              </div>
            </div>
            <div className="hero-right">
              {spark && (
                <svg className="sparkline" width={spark.w} height={spark.h} viewBox={`0 0 ${spark.w} ${spark.h}`}>
                  <defs>
                    <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#7b61ff" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#7b61ff" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <path d={spark.pathD} fill="none" stroke="#5a3ce6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points={spark.points} fill="url(#g1)" stroke="none" />
                </svg>
              )}
              <div className="hero-actions">
                <button className="btn btn-sm btn-primary" onClick={()=> setActiveTab('products')}>Manage Products</button>
                <button className="btn btn-sm btn-outline" onClick={()=> setActiveTab('orders')}>View Orders</button>
              </div>
            </div>
          </div>
        </div>

  {/* Stats cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <h3>Total Users</h3>
            <p className="stat-number">{stats.totalUsers}</p>
            <div className="stat-note">Active users on platform</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🛒</div>
            <h3>Total Products</h3>
            <p className="stat-number">{stats.totalProducts}</p>
            <div className="stat-note">Available items</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <h3>Total Orders</h3>
            <p className="stat-number">{stats.totalOrders}</p>
            <div className="stat-note">Orders placed</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <h3>Pending Orders</h3>
            <p className="stat-number">{stats.pendingOrders}</p>
            <div className="stat-note">Awaiting fulfillment</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <h3>Monthly Revenue</h3>
            <p className="stat-number">${stats.monthlyRevenue?.toFixed(2) || '0.00'}</p>
            <div className="stat-note">Revenue this month</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📨</div>
            <h3>Open Contacts</h3>
            <p className="stat-number">{stats.openContacts}</p>
            <div className="stat-note">Support tickets</div>
          </div>
        </div>

  {/* Revenue chart */}
        {revenueChart && (
          <div className="chart-section">
            <h3>Daily Revenue Analytics (Last 7 Days)</h3>
            <div className="revenue-chart">
              {revenueChart.map((day, index) => (
                <div key={index} className="chart-bar">
                  <div 
                    className="bar" 
                    style={{ 
                      height: `${Math.max((day.revenue / Math.max(...revenueChart.map(d => d.revenue))) * 180, 30)}px` 
                    }}
                  ></div>
                  <span className="chart-label">
                    {new Date(day.date).toLocaleDateString('en-US', { 
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  <span className="chart-value">${day.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
            
            {/* Revenue Statistics Summary */}
            <div className="revenue-stats">
              <div className="revenue-stat">
                <div className="revenue-stat-label">Total Revenue</div>
                <div className="revenue-stat-value">
                  ${revenueChart.reduce((sum, day) => sum + day.revenue, 0).toLocaleString()}
                </div>
              </div>
              <div className="revenue-stat">
                <div className="revenue-stat-label">Average Daily</div>
                <div className="revenue-stat-value">
                  ${(revenueChart.reduce((sum, day) => sum + day.revenue, 0) / revenueChart.length).toLocaleString()}
                </div>
              </div>
              <div className="revenue-stat">
                <div className="revenue-stat-label">Highest Day</div>
                <div className="revenue-stat-value">
                  ${Math.max(...revenueChart.map(d => d.revenue)).toLocaleString()}
                </div>
              </div>
              <div className="revenue-stat">
                <div className="revenue-stat-label">Growth Trend</div>
                <div className="revenue-stat-value">
                  {revenueChart.length >= 2 ? 
                    (((revenueChart[revenueChart.length - 1].revenue - revenueChart[0].revenue) / revenueChart[0].revenue) * 100).toFixed(1) + '%'
                    : '0%'
                  }
                </div>
              </div>
            </div>
          </div>
        )}

  {/* Recent orders */}
        <div className="recent-section">
          <h3>Recent Orders</h3>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders?.map(order => (
                  <tr key={order._id}>
                    <td>{order.orderNumber}</td>
                    <td>{order.user?.name}</td>
                    <td>${order.total?.toFixed(2)}</td>
                    <td>
                      <span className={`status-badge status-${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

  {/* Top categories */}
        {topCategories && (
          <div className="categories-section">
            <h3>Top Selling Categories</h3>
            <div className="categories-grid">
              {topCategories.map((category, index) => (
                <div key={index} className="category-card">
                  <h4>{category._id}</h4>
                  <p>{category.totalSold} units sold</p>
                  <p>${category.revenue.toFixed(2)} revenue</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOrders = () => (
    <div className="admin-section">
      <div className="section-header">
        <h2>Orders Management</h2>
        <div className="filters">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
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
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ordersData?.orders?.map(order => (
              <tr key={order._id}>
                <td>{order.orderNumber}</td>
                <td>
                  <div>
                    <div>{order.user?.name}</div>
                    <small>{order.user?.email}</small>
                  </div>
                </td>
                <td>{order.items?.length} items</td>
                <td>${order.total?.toFixed(2)}</td>
                <td>
                  <select
                    value={order.status}
                    onChange={(e) => updateOrderStatusMutation.mutate({
                      orderId: order._id,
                      status: e.target.value
                    })}
                    className="status-select"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td>
                  <button 
                    className="btn-sm btn-outline"
                    onClick={() => navigate(`/orders/${order._id}`)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {ordersData?.pagination && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="btn-sm"
          >
            Previous
          </button>
          <span>Page {currentPage} of {ordersData.pagination.totalPages}</span>
          <button
            disabled={currentPage === ordersData.pagination.totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="admin-section">
      <div className="section-header">
        <h2>Users Management</h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersData?.users?.map(user => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge role-${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${user.isActive ? 'status-active' : 'status-inactive'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    onClick={() => toggleUserStatusMutation.mutate({
                      userId: user._id,
                      isActive: !user.isActive
                    })}
                    className={`btn-sm ${user.isActive ? 'btn-danger' : 'btn-success'}`}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {usersData?.pagination && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="btn-sm"
          >
            Previous
          </button>
          <span>Page {currentPage} of {usersData.pagination.totalPages}</span>
          <button
            disabled={currentPage === usersData.pagination.totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  const renderProducts = () => (
    <div className="admin-section">
  <div className="section-header">
        <h2>Products Management</h2>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button 
    onClick={() => setShowCreateModal(true)}
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
              <th>Name</th>
              <th>Brand</th>
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
                <td>{product.name}</td>
                <td>{product.brand}</td>
                <td>{product.category}</td>
                <td>
                  <div>
                    ${product.price}
                    {product.discountPrice && (
                      <div className="discount-price">${product.discountPrice}</div>
                    )}
                  </div>
                </td>
                <td>
                  <span className={product.stock < 10 ? 'low-stock' : ''}>
                    {product.stock}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${product.isActive ? 'status-active' : 'status-inactive'}`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      onClick={() => setSelectedItem(product)}
                      className="btn-sm btn-outline"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this product?')) {
                          deleteProductMutation.mutate(product._id);
                        }
                      }}
                      className="btn-sm btn-danger"
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

      {/* Pagination */}
      {productsData?.pagination && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="btn-sm"
          >
            Previous
          </button>
          <span>Page {currentPage} of {productsData.pagination.totalPages}</span>
          <button
            disabled={currentPage === productsData.pagination.totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  const renderBuilds = () => (
    <div className="admin-section">
      <div className="section-header">
        <h2>Community Builds</h2>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>User</th>
              <th>Views</th>
              <th>Likes</th>
              <th>Public</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {buildsData?.builds?.map(build => (
              <tr key={build._id}>
                <td>{build.name}</td>
                <td>{build.user?.name}</td>
                <td>{build.views || 0}</td>
                <td>{build.likes?.length || 0}</td>
                <td>
                  <span className={`status-badge ${build.isPublic ? 'status-active' : 'status-inactive'}`}>
                    {build.isPublic ? 'Public' : 'Private'}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${build.featured ? 'status-featured' : 'status-normal'}`}>
                    {build.featured ? 'Featured' : 'Normal'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      onClick={() => toggleBuildFeaturedMutation.mutate(build._id)}
                      className={`btn-sm ${build.featured ? 'btn-outline' : 'btn-primary'}`}
                    >
                      {build.featured ? 'Unfeature' : 'Feature'}
                    </button>
                    <button 
                      onClick={() => navigate(`/community/builds/${build._id}`)}
                      className="btn-sm btn-outline"
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
    </div>
  );

  const renderInventory = () => {
    if (!inventoryData) return <div>Loading...</div>;

    return (
      <div className="admin-section">
        <h2>Inventory Management</h2>
        
        <div className="inventory-summary">
          <div className="summary-card alert">
            <h3>Low Stock Alert</h3>
            <p>{inventoryData.summary.lowStockCount} products need restocking</p>
          </div>
          <div className="summary-card warning">
            <h3>Out of Stock</h3>
            <p>{inventoryData.summary.outOfStockCount} products unavailable</p>
          </div>
          <div className="summary-card info">
            <h3>Total Products</h3>
            <p>{inventoryData.summary.totalProducts} active products</p>
          </div>
        </div>

        {/* Low Stock Products */}
        {inventoryData.lowStock?.length > 0 && (
          <div className="inventory-section">
            <h3>Low Stock Products (Less than 10)</h3>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Brand</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryData.lowStock.map(product => (
                    <tr key={product._id}>
                      <td>{product.name}</td>
                      <td>{product.brand}</td>
                      <td>{product.category}</td>
                      <td className="low-stock">{product.stock}</td>
                      <td>${product.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Category Inventory */}
        <div className="inventory-section">
          <h3>Category Overview</h3>
          <div className="categories-grid">
            {inventoryData.categoryInventory?.map(category => (
              <div key={category._id} className="category-inventory-card">
                <h4>{category._id}</h4>
                <div className="category-stats">
                  <p><strong>{category.totalProducts}</strong> products</p>
                  <p><strong>{category.totalStock}</strong> total stock</p>
                  <p><strong>${category.totalValue.toFixed(2)}</strong> inventory value</p>
                  {category.lowStockCount > 0 && (
                    <p className="alert"><strong>{category.lowStockCount}</strong> low stock</p>
                  )}
                  {category.outOfStockCount > 0 && (
                    <p className="warning"><strong>{category.outOfStockCount}</strong> out of stock</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    if (!analyticsData) return <div>Loading...</div>;

    return (
      <div className="admin-section">
        <h2>Analytics & Reports</h2>
        
        {/* Product Performance */}
        <div className="analytics-section">
          <h3>Top Performing Products</h3>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th>Units Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.productPerformance?.map(product => (
                  <tr key={product._id}>
                    <td>{product.name}</td>
                    <td>{product.brand}</td>
                    <td>{product.category}</td>
                    <td>{product.totalSold}</td>
                    <td>${product.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Activity */}
        <div className="analytics-section">
          <h3>Most Active Users</h3>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Builds Created</th>
                  <th>Public Builds</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.userActivity?.map(activity => (
                  <tr key={activity._id}>
                    <td>{activity.userName}</td>
                    <td>{activity.userEmail}</td>
                    <td>{activity.buildsCreated}</td>
                    <td>{activity.publicBuilds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderTickets = () => (
    <div className="admin-section">
      <div className="section-header">
        <h2>Support Tickets</h2>
        <div className="filters">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>From</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ticketsData?.contacts?.length ? (
              ticketsData.contacts.map(ticket => (
                <tr key={ticket._id}>
                  <td>
                    <div>
                      <strong>{ticket.subject}</strong>
                      {ticket.responses?.length > 0 && (
                        <small className="replies-count">
                          ({ticket.responses.length} replies)
                        </small>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>
                      <div>{ticket.name}</div>
                      <small>{ticket.email}</small>
                    </div>
                  </td>
                  <td>
                    <span className="category-badge">{ticket.category}</span>
                  </td>
                  <td>
                    <span className={`priority-badge priority-${ticket.priority?.toLowerCase()}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td>
                    <select
                      value={ticket.status}
                      onChange={(e) => updateTicketStatusMutation.mutate({
                        ticketId: ticket._id,
                        status: e.target.value
                      })}
                      className="status-select"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </td>
                  <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        onClick={() => setSelectedItem(ticket)}
                        className="btn-sm btn-primary"
                      >
                        View & Reply
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{textAlign:'center', padding:'24px 12px', color:'#64748b'}}>
                  {filterStatus === 'all' ? 'No support tickets found yet.' : `No tickets with status "${filterStatus}".`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {ticketsData?.pagination && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="btn-sm"
          >
            Previous
          </button>
          <span>Page {currentPage} of {ticketsData.pagination.totalPages}</span>
          <button
            disabled={currentPage === ticketsData.pagination.totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p>Manage your PC Builder website</p>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-nav">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => { setActiveTab('dashboard'); setCurrentPage(1); }}
        >
          Dashboard
        </button>
        <button 
          className={activeTab === 'orders' ? 'active' : ''}
          onClick={() => { setActiveTab('orders'); setCurrentPage(1); }}
        >
          Orders
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => { setActiveTab('users'); setCurrentPage(1); }}
        >
          Users
        </button>
        <button 
          className={activeTab === 'products' ? 'active' : ''}
          onClick={() => { setActiveTab('products'); setCurrentPage(1); }}
        >
          Products
        </button>
        <button 
          className={activeTab === 'builds' ? 'active' : ''}
          onClick={() => { setActiveTab('builds'); setCurrentPage(1); }}
        >
          Builds
        </button>
        <button 
          className={activeTab === 'tickets' ? 'active' : ''}
          onClick={() => { setActiveTab('tickets'); setCurrentPage(1); }}
        >
          Support Tickets
        </button>
        <button 
          className={activeTab === 'inventory' ? 'active' : ''}
          onClick={() => { setActiveTab('inventory'); setCurrentPage(1); }}
        >
          Inventory
        </button>
        <button 
          className={activeTab === 'analytics' ? 'active' : ''}
          onClick={() => { setActiveTab('analytics'); setCurrentPage(1); }}
        >
          Analytics
        </button>
        <button
          className={activeTab === 'livechat' ? 'active' : ''}
          onClick={() => { setActiveTab('livechat'); setCurrentPage(1); }}
        >
          Live Chat
        </button>
      </div>

      {/* Content */}
      <div className="admin-content">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'builds' && renderBuilds()}
        {activeTab === 'tickets' && renderTickets()}
        {activeTab === 'inventory' && renderInventory()}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'livechat' && (
          <div className="admin-section">
            <div className="section-header" style={{marginBottom:'1rem'}}>
              <h2>Customer Live Chat</h2>
              <p style={{color:'#64748b', margin:0}}>Real-time conversations with users</p>
            </div>
            <AdminChatPanel />
          </div>
        )}
      </div>

      {/* Create Product Modal (Advanced) */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal large-modal">
            <div className="modal-header">
              <h3>Create New Product</h3>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={(e)=>{
              e.preventDefault();
              const images = createImageRows
                .map(r => ({ url: (r.url || '').trim(), alt: (r.alt || '').trim() }))
                .filter(r => r.url);
              const specifications = rowsToObject(createSpecRows);
              const data = {
                name: createForm.name,
                brand: createForm.brand,
                category: createForm.category,
                model: createForm.model,
                price: parseFloat(createForm.price),
                discountPrice: createForm.discountPrice !== '' && createForm.discountPrice !== null && createForm.discountPrice !== undefined
                  ? parseFloat(createForm.discountPrice) : undefined,
                stock: parseInt(createForm.stock),
                description: createForm.description,
                isActive: !!createForm.isActive,
                featured: !!createForm.featured,
                images,
                specifications,
              };
              if (data.discountPrice === undefined || Number.isNaN(data.discountPrice)) delete data.discountPrice;
              createProductMutation.mutate(data);
            }} className="product-form advanced">
              <div className="editor-layout">
                <aside className="editor-sidebar">
                  <div className="sidebar-title">Create Sections</div>
                  <button type="button" className={`tab vtab ${createTab === 'general' ? 'active' : ''}`} onClick={()=>setCreateTab('general')}>General</button>
                  <button type="button" className={`tab vtab ${createTab === 'images' ? 'active' : ''}`} onClick={()=>setCreateTab('images')}>Images</button>
                  <button type="button" className={`tab vtab ${createTab === 'specs' ? 'active' : ''}`} onClick={()=>setCreateTab('specs')}>Specifications</button>
                  <button type="button" className={`tab vtab ${createTab === 'description' ? 'active' : ''}`} onClick={()=>setCreateTab('description')}>Description</button>
                </aside>
                <section className="editor-content">
                  {createTab === 'general' && (
                    <div className="tab-panel">
                      <h4 className="section-title">Basic Information</h4>
                      <div className="form-row">
                        <input type="text" placeholder="Product Name" value={createForm.name} onChange={(e)=>setCreateForm({...createForm, name: e.target.value})} required />
                        <input type="text" placeholder="Brand" value={createForm.brand} onChange={(e)=>setCreateForm({...createForm, brand: e.target.value})} required />
                      </div>
                      <div className="form-row">
                        <select value={createForm.category} onChange={(e)=>setCreateForm({...createForm, category: e.target.value})} required>
                          <option value="CPU">CPU</option>
                          <option value="GPU">GPU</option>
                          <option value="Motherboard">Motherboard</option>
                          <option value="RAM">RAM</option>
                          <option value="Storage">Storage</option>
                          <option value="Power Supply">Power Supply</option>
                          <option value="Case">Case</option>
                          <option value="Cooling">Cooling</option>
                          <option value="Accessories">Accessories</option>
                        </select>
                        <input type="text" placeholder="Model" value={createForm.model} onChange={(e)=>setCreateForm({...createForm, model: e.target.value})} required />
                      </div>
                      <h4 className="section-title">Pricing & Stock</h4>
                      <div className="form-row">
                        <input type="number" step="0.01" placeholder="Price" value={createForm.price} onChange={(e)=>setCreateForm({...createForm, price: e.target.value})} required />
                        <input type="number" step="0.01" placeholder="Discount Price (optional)" value={createForm.discountPrice} onChange={(e)=>setCreateForm({...createForm, discountPrice: e.target.value})} />
                      </div>
                      <div className="form-row">
                        <input type="number" placeholder="Stock Quantity" value={createForm.stock} onChange={(e)=>setCreateForm({...createForm, stock: e.target.value})} required />
                        <div></div>
                      </div>
                      <div className="toggle-row">
                        <label className="checkbox-label">
                          <input type="checkbox" checked={!!createForm.isActive} onChange={(e)=>setCreateForm({...createForm, isActive: e.target.checked})} />
                          Active Product
                        </label>
                        <label className="checkbox-label">
                          <input type="checkbox" checked={!!createForm.featured} onChange={(e)=>setCreateForm({...createForm, featured: e.target.checked})} />
                          Featured
                        </label>
                      </div>
                    </div>
                  )}

                  {createTab === 'images' && (
                    <div className="tab-panel">
                      <h4 className="section-title">Product Images</h4>
                      <div className="image-list">
                        {createImageRows.map((row, idx) => (
                          <div className="image-row" key={row.id}>
                            <div className="thumb" title={row.url}>
                              {row.url ? <img src={row.url} alt={row.alt || 'preview'} onError={(e)=>{e.currentTarget.style.display='none';}} /> : <div className="placeholder">No Image</div>}
                            </div>
                            <div className="image-fields">
                              <input type="text" placeholder="Image URL" value={row.url} onChange={(e)=>{
                                const next = [...createImageRows]; next[idx] = { ...row, url: e.target.value }; setCreateImageRows(next);
                              }} />
                              <input type="text" placeholder="Alt text" value={row.alt} onChange={(e)=>{
                                const next = [...createImageRows]; next[idx] = { ...row, alt: e.target.value }; setCreateImageRows(next);
                              }} />
                            </div>
                            <div className="image-actions">
                              <button type="button" className="btn-sm btn-outline" onClick={()=>{
                                if (idx === 0) return; const next = [...createImageRows]; [next[idx-1], next[idx]] = [next[idx], next[idx-1]]; setCreateImageRows(next);
                              }}>Up</button>
                              <button type="button" className="btn-sm btn-outline" onClick={()=>{
                                if (idx === createImageRows.length - 1) return; const next = [...createImageRows]; [next[idx+1], next[idx]] = [next[idx], next[idx+1]]; setCreateImageRows(next);
                              }}>Down</button>
                              <button type="button" className="btn-sm btn-danger" onClick={()=>{
                                setCreateImageRows(createImageRows.filter((_, i) => i !== idx));
                              }}>Remove</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="form-actions left">
                        <button type="button" className="btn btn-primary" onClick={()=>{
                          setCreateImageRows([...createImageRows, { id: 'cimg_' + Date.now(), url: '', alt: '' }]);
                        }}>Add Image</button>
                      </div>
                    </div>
                  )}

                  {createTab === 'specs' && (
                    <div className="tab-panel">
                      <h4 className="section-title">Specifications (Key / Value)</h4>
                      <div className="kv-list">
                        {createSpecRows.map((row, idx) => (
                          <div className="kv-row" key={row.id}>
                            <input type="text" placeholder="Key (e.g., Interface)" value={row.key} onChange={(e)=>{
                              const next = [...createSpecRows]; next[idx] = { ...row, key: e.target.value }; setCreateSpecRows(next);
                            }} />
                            <input type="text" placeholder="Value (e.g., PCIe 4.0)" value={row.value} onChange={(e)=>{
                              const next = [...createSpecRows]; next[idx] = { ...row, value: e.target.value }; setCreateSpecRows(next);
                            }} />
                            <button type="button" className="btn-sm btn-danger" onClick={()=>{
                              setCreateSpecRows(createSpecRows.filter((_, i) => i !== idx));
                            }}>Remove</button>
                          </div>
                        ))}
                      </div>
                      <div className="form-actions left">
                        <button type="button" className="btn btn-primary" onClick={()=>{
                          setCreateSpecRows([...createSpecRows, { id: 'cspec_' + Date.now(), key: '', value: '' }]);
                        }}>Add Row</button>
                      </div>
                    </div>
                  )}

                  {createTab === 'description' && (
                    <div className="tab-panel">
                      <h4 className="section-title">Product Description</h4>
                      <textarea placeholder="Enter a clear, concise description..." rows="8" value={createForm.description}
                        onChange={(e)=>setCreateForm({...createForm, description: e.target.value})} required />
                    </div>
                  )}
                </section>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createProductMutation.isLoading}>
                  {createProductMutation.isLoading ? 'Creating...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {selectedItem && selectedItem.name && (
        <div className="modal-overlay">
          <div className="modal large-modal">
            <div className="modal-header">
              <h3>Edit Product</h3>
              <button onClick={() => setSelectedItem(null)} className="close-btn">&times;</button>
            </div>
            {editForm && (
              <form onSubmit={(e) => {
                e.preventDefault();
                // Build payload (no detailed specs)
                const images = imageRows
                  .map(r => ({ url: (r.url || '').trim(), alt: (r.alt || '').trim() }))
                  .filter(r => r.url);
                const specifications = rowsToObject(specRows);
                const data = {
                  name: editForm.name,
                  brand: editForm.brand,
                  category: editForm.category,
                  model: editForm.model,
                  price: parseFloat(editForm.price),
                  discountPrice: editForm.discountPrice !== '' && editForm.discountPrice !== null && editForm.discountPrice !== undefined
                    ? parseFloat(editForm.discountPrice)
                    : undefined,
                  stock: parseInt(editForm.stock),
                  description: editForm.description,
                  isActive: !!editForm.isActive,
                  featured: !!editForm.featured,
                  images,
                  specifications
                };
                // Remove discountPrice if NaN or empty
                if (data.discountPrice === undefined || Number.isNaN(data.discountPrice)) delete data.discountPrice;
                updateProductMutation.mutate({ productId: selectedItem._id, data });
              }} className="product-form advanced">
                <div className="editor-layout">
                  <aside className="editor-sidebar">
                    <div className="sidebar-title">Edit Sections</div>
                    <button type="button" className={`tab vtab ${editTab === 'general' ? 'active' : ''}`} onClick={() => setEditTab('general')}>General</button>
                    <button type="button" className={`tab vtab ${editTab === 'images' ? 'active' : ''}`} onClick={() => setEditTab('images')}>Images</button>
                    <button type="button" className={`tab vtab ${editTab === 'specs' ? 'active' : ''}`} onClick={() => setEditTab('specs')}>Specifications</button>
                    <button type="button" className={`tab vtab ${editTab === 'description' ? 'active' : ''}`} onClick={() => setEditTab('description')}>Description</button>
                  </aside>
                  <section className="editor-content">
                    {/* General */}
                    {editTab === 'general' && (
                      <div className="tab-panel">
                        <h4 className="section-title">Basic Information</h4>
                        <div className="form-row">
                          <input type="text" placeholder="Product Name" value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                          <input type="text" placeholder="Brand" value={editForm.brand}
                            onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })} required />
                        </div>
                        <div className="form-row">
                          <select value={editForm.category}
                            onChange={(e) => {
                              const newCategory = e.target.value;
                              setEditForm({ ...editForm, category: newCategory });
                            }} required>
                            <option value="CPU">CPU</option>
                            <option value="GPU">GPU</option>
                            <option value="Motherboard">Motherboard</option>
                            <option value="RAM">RAM</option>
                            <option value="Storage">Storage</option>
                            <option value="Power Supply">Power Supply</option>
                            <option value="Case">Case</option>
                            <option value="Cooling">Cooling</option>
                            <option value="Monitor">Monitor</option>
                            <option value="Keyboard">Keyboard</option>
                            <option value="Mouse">Mouse</option>
                            <option value="Headset">Headset</option>
                            <option value="Speakers">Speakers</option>
                            <option value="Webcam">Webcam</option>
                            <option value="Accessories">Accessories</option>
                          </select>
                          <input type="text" placeholder="Model" value={editForm.model}
                            onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} required />
                        </div>
                        <h4 className="section-title">Pricing & Stock</h4>
                        <div className="form-row">
                          <input type="number" step="0.01" placeholder="Price" value={editForm.price}
                            onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} required />
                          <input type="number" step="0.01" placeholder="Discount Price (optional)" value={editForm.discountPrice}
                            onChange={(e) => setEditForm({ ...editForm, discountPrice: e.target.value })} />
                        </div>
                        <div className="form-row">
                          <input type="number" placeholder="Stock Quantity" value={editForm.stock}
                            onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} required />
                          <div></div>
                        </div>
                        <div className="toggle-row">
                          <label className="checkbox-label">
                            <input type="checkbox" checked={!!editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />
                            Active Product
                          </label>
                          <label className="checkbox-label">
                            <input type="checkbox" checked={!!editForm.featured} onChange={(e) => setEditForm({ ...editForm, featured: e.target.checked })} />
                            Featured
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Images */}
                    {editTab === 'images' && (
                      <div className="tab-panel">
                        <h4 className="section-title">Product Images</h4>
                        <div className="image-list">
                          {imageRows.map((row, idx) => (
                            <div className="image-row" key={row.id}>
                              <div className="thumb" title={row.url}>
                                {row.url ? <img src={row.url} alt={row.alt || 'preview'} onError={(e)=>{e.currentTarget.style.display='none';}} /> : <div className="placeholder">No Image</div>}
                              </div>
                              <div className="image-fields">
                                <input type="text" placeholder="Image URL" value={row.url}
                                  onChange={(e)=>{
                                    const next = [...imageRows];
                                    next[idx] = { ...row, url: e.target.value };
                                    setImageRows(next);
                                  }} />
                                <input type="text" placeholder="Alt text" value={row.alt}
                                  onChange={(e)=>{
                                    const next = [...imageRows];
                                    next[idx] = { ...row, alt: e.target.value };
                                    setImageRows(next);
                                  }} />
                              </div>
                              <div className="image-actions">
                                <button type="button" className="btn-sm btn-outline" onClick={()=>{
                                  if (idx === 0) return;
                                  const next = [...imageRows];
                                  [next[idx-1], next[idx]] = [next[idx], next[idx-1]];
                                  setImageRows(next);
                                }}>Up</button>
                                <button type="button" className="btn-sm btn-outline" onClick={()=>{
                                  if (idx === imageRows.length - 1) return;
                                  const next = [...imageRows];
                                  [next[idx+1], next[idx]] = [next[idx], next[idx+1]];
                                  setImageRows(next);
                                }}>Down</button>
                                <button type="button" className="btn-sm btn-danger" onClick={()=>{
                                  setImageRows(imageRows.filter((_, i) => i !== idx));
                                }}>Remove</button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="form-actions left">
                          <button type="button" className="btn btn-primary" onClick={()=>{
                            setImageRows([...imageRows, { id: 'img_' + Date.now(), url: '', alt: '' }]);
                          }}>Add Image</button>
                        </div>
                      </div>
                    )}

                    {/* Specifications (key/value) */}
                    {editTab === 'specs' && (
                      <div className="tab-panel">
                        <h4 className="section-title">Specifications (Key / Value)</h4>
                        <div className="kv-list">
                          {specRows.map((row, idx) => (
                            <div className="kv-row" key={row.id}>
                              <input type="text" placeholder="Key (e.g., Interface)" value={row.key}
                                onChange={(e)=>{
                                  const next = [...specRows];
                                  next[idx] = { ...row, key: e.target.value };
                                  setSpecRows(next);
                                }} />
                              <input type="text" placeholder="Value (e.g., PCIe 4.0)" value={row.value}
                                onChange={(e)=>{
                                  const next = [...specRows];
                                  next[idx] = { ...row, value: e.target.value };
                                  setSpecRows(next);
                                }} />
                              <button type="button" className="btn-sm btn-danger" onClick={()=>{
                                setSpecRows(specRows.filter((_, i) => i !== idx));
                              }}>Remove</button>
                            </div>
                          ))}
                        </div>
                        <div className="form-actions left">
                          <button type="button" className="btn btn-primary" onClick={()=>{
                            setSpecRows([...specRows, { id: 'spec_' + Date.now(), key: '', value: '' }]);
                          }}>Add Row</button>
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {editTab === 'description' && (
                      <div className="tab-panel">
                        <h4 className="section-title">Product Description</h4>
                        <textarea placeholder="Enter a clear, concise description..." rows="8" value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} required />
                      </div>
                    )}
                  </section>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={() => setSelectedItem(null)} className="btn btn-outline">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={updateProductMutation.isLoading}>
                    {updateProductMutation.isLoading ? 'Updating...' : 'Update Product'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Ticket Details & Reply Modal */}
      {selectedItem && selectedItem.subject && (
        <div className="modal-overlay">
          <div className="modal large-modal">
            <div className="modal-header">
              <h3>Ticket: {selectedItem.subject}</h3>
              <button onClick={() => setSelectedItem(null)} className="close-btn">&times;</button>
            </div>
            <div className="ticket-details">
              {/* Ticket Info */}
              <div className="ticket-info">
                <div className="ticket-meta">
                  <div className="meta-item">
                    <strong>From:</strong> {selectedItem.name} ({selectedItem.email})
                  </div>
                  <div className="meta-item">
                    <strong>Category:</strong> {selectedItem.category}
                  </div>
                  <div className="meta-item">
                    <strong>Priority:</strong> 
                    <span className={`priority-badge priority-${selectedItem.priority?.toLowerCase()}`}>
                      {selectedItem.priority}
                    </span>
                  </div>
                  <div className="meta-item">
                    <strong>Status:</strong> 
                    <span className={`status-badge status-${selectedItem.status?.toLowerCase().replace(' ', '-')}`}>
                      {selectedItem.status}
                    </span>
                  </div>
                  <div className="meta-item">
                    <strong>Created:</strong> {new Date(selectedItem.createdAt).toLocaleString()}
                  </div>
                  {selectedItem.phone && (
                    <div className="meta-item">
                      <strong>Phone:</strong> {selectedItem.phone}
                    </div>
                  )}
                </div>
              </div>

              {/* Original Message */}
              <div className="message-thread">
                <div className="message original-message">
                  <div className="message-header">
                    <strong>{selectedItem.name}</strong>
                    <span className="message-time">
                      {new Date(selectedItem.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="message-content">
                    {selectedItem.message}
                  </div>
                </div>

                {/* Responses */}
                {selectedItem.responses?.map((response, index) => (
                  <div key={index} className={`message ${response.isInternal ? 'internal-message' : 'admin-message'}`}>
                    <div className="message-header">
                      <strong>
                        {response.respondedBy?.name || 'Admin'}
                        {response.isInternal && <span className="internal-badge">Internal</span>}
                      </strong>
                      <span className="message-time">
                        {new Date(response.respondedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="message-content">
                      {response.message}
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const message = formData.get('message');
                const isInternal = formData.get('isInternal') === 'on';
                
                if (message.trim()) {
                  replyToTicketMutation.mutate({
                    ticketId: selectedItem._id,
                    message: message.trim(),
                    isInternal
                  });
                  e.target.reset();
                }
              }} className="reply-form">
                <div className="form-group">
                  <label>Reply to ticket:</label>
                  <textarea
                    name="message"
                    placeholder="Type your reply here..."
                    rows="4"
                    required
                    className="reply-textarea"
                  />
                </div>
                <div className="form-options">
                  <label className="checkbox-label">
                    <input type="checkbox" name="isInternal" />
                    Internal note (not visible to customer)
                  </label>
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setSelectedItem(null)} className="btn btn-outline">
                    Close
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={replyToTicketMutation.isLoading}>
                    {replyToTicketMutation.isLoading ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
