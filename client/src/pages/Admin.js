import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './AdminPanel.css';

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

  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    discountPrice: '',
    category: 'CPU',
    brand: '',
    model: '',
    stock: '',
    specifications: {},
    features: [],
    isActive: true
  });

  // Redirect if not admin
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

  // Fetch dashboard statistics
  const { data: dashboardData } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/dashboard');
      return response.data;
    },
    enabled: user?.role === 'admin' && activeTab === 'dashboard'
  });

  // Fetch orders
  const { data: ordersData } = useQuery({
    queryKey: ['admin-orders', currentPage, filterStatus],
    queryFn: async () => {
      const response = await axios.get(`/api/admin/orders?page=${currentPage}&status=${filterStatus}&limit=10`);
      return response.data;
    },
    enabled: user?.role === 'admin' && activeTab === 'orders'
  });

  // Fetch users
  const { data: usersData } = useQuery({
    queryKey: ['admin-users', currentPage, searchTerm],
    queryFn: async () => {
      const response = await axios.get(`/api/admin/users?page=${currentPage}&search=${searchTerm}&limit=10`);
      return response.data;
    },
    enabled: user?.role === 'admin' && activeTab === 'users'
  });

  // Fetch products
  const { data: productsData } = useQuery({
    queryKey: ['admin-products', currentPage, searchTerm],
    queryFn: async () => {
      const response = await axios.get(`/api/admin/products?page=${currentPage}&search=${searchTerm}&limit=10`);
      return response.data;
    },
    enabled: user?.role === 'admin' && activeTab === 'products'
  });

  // Fetch builds
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

  // Fetch tickets/contacts
  const { data: ticketsData } = useQuery({
    queryKey: ['admin-tickets', currentPage, filterStatus],
    queryFn: async () => {
      const response = await axios.get(`/api/admin/contacts?page=${currentPage}&status=${filterStatus}&limit=10`);
      return response.data;
    },
    enabled: user?.role === 'admin' && activeTab === 'tickets'
  });

  // Update order status mutation
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

  // Toggle user status mutation
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

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData) => {
      const response = await axios.post('/api/admin/products', productData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Product created successfully!');
      queryClient.invalidateQueries(['admin-products']);
      setShowCreateModal(false);
      setProductForm({
        name: '',
        description: '',
        price: '',
        discountPrice: '',
        category: 'CPU',
        brand: '',
        model: '',
        stock: '',
        specifications: {},
        features: [],
        isActive: true
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create product');
    }
  });

  // Update product mutation
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

  // Delete product mutation
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

  // Toggle build featured status
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

  // Reply to ticket mutation
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

  // Update ticket status mutation
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

  const handleCreateProduct = (e) => {
    e.preventDefault();
    const data = {
      ...productForm,
      price: parseFloat(productForm.price),
      discountPrice: productForm.discountPrice ? parseFloat(productForm.discountPrice) : undefined,
      stock: parseInt(productForm.stock)
    };
    createProductMutation.mutate(data);
  };

  const renderDashboard = () => {
    if (!dashboardData) return <div>Loading...</div>;
    
    const { stats, recentOrders, revenueChart, topCategories } = dashboardData;

    return (
      <div className="admin-dashboard">
        <h2>Dashboard Overview</h2>
        
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Users</h3>
            <p className="stat-number">{stats.totalUsers}</p>
          </div>
          <div className="stat-card">
            <h3>Total Products</h3>
            <p className="stat-number">{stats.totalProducts}</p>
          </div>
          <div className="stat-card">
            <h3>Total Orders</h3>
            <p className="stat-number">{stats.totalOrders}</p>
          </div>
          <div className="stat-card">
            <h3>Pending Orders</h3>
            <p className="stat-number">{stats.pendingOrders}</p>
          </div>
          <div className="stat-card">
            <h3>Monthly Revenue</h3>
            <p className="stat-number">${stats.monthlyRevenue?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="stat-card">
            <h3>Open Contacts</h3>
            <p className="stat-number">{stats.openContacts}</p>
          </div>
        </div>

        {/* Revenue Chart */}
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

        {/* Recent Orders */}
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

        {/* Top Categories */}
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
            {ticketsData?.contacts?.map(ticket => (
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
            ))}
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
      </div>

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Product</h3>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleCreateProduct} className="product-form">
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Product Name"
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  required
                />
                <input
                  type="text"
                  placeholder="Brand"
                  value={productForm.brand}
                  onChange={(e) => setProductForm({...productForm, brand: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                  required
                >
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
                <input
                  type="text"
                  placeholder="Model"
                  value={productForm.model}
                  onChange={(e) => setProductForm({...productForm, model: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  value={productForm.price}
                  onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Discount Price (optional)"
                  value={productForm.discountPrice}
                  onChange={(e) => setProductForm({...productForm, discountPrice: e.target.value})}
                />
              </div>
              <input
                type="number"
                placeholder="Stock Quantity"
                value={productForm.stock}
                onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                required
              />
              <textarea
                placeholder="Product Description"
                value={productForm.description}
                onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                rows="4"
                required
              />
              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline">
                  Cancel
                </button>
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
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Product</h3>
              <button onClick={() => setSelectedItem(null)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const data = {
                name: formData.get('name'),
                brand: formData.get('brand'),
                category: formData.get('category'),
                model: formData.get('model'),
                price: parseFloat(formData.get('price')),
                discountPrice: formData.get('discountPrice') ? parseFloat(formData.get('discountPrice')) : undefined,
                stock: parseInt(formData.get('stock')),
                description: formData.get('description'),
                isActive: formData.get('isActive') === 'on'
              };
              updateProductMutation.mutate({ productId: selectedItem._id, data });
            }} className="product-form">
              <div className="form-row">
                <input
                  type="text"
                  name="name"
                  defaultValue={selectedItem.name}
                  placeholder="Product Name"
                  required
                />
                <input
                  type="text"
                  name="brand"
                  defaultValue={selectedItem.brand}
                  placeholder="Brand"
                  required
                />
              </div>
              <div className="form-row">
                <select name="category" defaultValue={selectedItem.category} required>
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
                <input
                  type="text"
                  name="model"
                  defaultValue={selectedItem.model}
                  placeholder="Model"
                  required
                />
              </div>
              <div className="form-row">
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  defaultValue={selectedItem.price}
                  placeholder="Price"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  name="discountPrice"
                  defaultValue={selectedItem.discountPrice}
                  placeholder="Discount Price (optional)"
                />
              </div>
              <input
                type="number"
                name="stock"
                defaultValue={selectedItem.stock}
                placeholder="Stock Quantity"
                required
              />
              <textarea
                name="description"
                defaultValue={selectedItem.description}
                placeholder="Product Description"
                rows="4"
                required
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={selectedItem.isActive}
                />
                Active Product
              </label>
              <div className="form-actions">
                <button type="button" onClick={() => setSelectedItem(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={updateProductMutation.isLoading}>
                  {updateProductMutation.isLoading ? 'Updating...' : 'Update Product'}
                </button>
              </div>
            </form>
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
