import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA'
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Redirect if not logged in
  React.useEffect(() => {
    if (!user) {
      toast.error('Please login to view your profile');
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch user profile
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await axios.get('/api/auth/profile');
      return response.data.user;
    },
    enabled: !!user,
    onSuccess: (data) => {
      setProfileData(prev => ({
        ...prev,
        ...data,
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zipCode || '',
        country: data.country || 'USA'
      }));
    }
  });

  // Fetch user builds
  const { data: userBuilds } = useQuery({
    queryKey: ['user-builds'],
    queryFn: async () => {
      const response = await axios.get('/api/builds/my-builds');
      return response.data.builds;
    },
    enabled: !!user
  });

  // Fetch user orders
  const { data: userOrders } = useQuery({
    queryKey: ['user-orders-profile'],
    queryFn: async () => {
      const response = await axios.get('/api/orders?limit=5');
      return response.data.orders;
    },
    enabled: !!user
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const response = await axios.put('/api/auth/profile', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      queryClient.invalidateQueries(['user-profile']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const response = await axios.put('/api/auth/change-password', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to change password');
    }
  });

  // Delete build mutation
  const deleteBuildMutation = useMutation({
    mutationFn: async (buildId) => {
      const response = await axios.delete(`/api/builds/${buildId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Build deleted successfully!');
      queryClient.invalidateQueries(['user-builds']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete build');
    }
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  const handleDeleteBuild = (buildId, buildName) => {
    if (window.confirm(`Are you sure you want to delete "${buildName}"?`)) {
      deleteBuildMutation.mutate(buildId);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container">
      <div className="profile-page">
        <div className="profile-header">
          <div className="user-info">
            <div className="user-avatar">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="user-details">
              <h1>{user.name}</h1>
              <p>{user.email}</p>
              <span className="member-since">
                Member since {formatDate(user.createdAt || new Date())}
              </span>
            </div>
          </div>
          
          <div className="profile-stats">
            <div className="stat">
              <span className="number">{userBuilds?.length || 0}</span>
              <span className="label">Builds</span>
            </div>
            <div className="stat">
              <span className="number">{userOrders?.length || 0}</span>
              <span className="label">Orders</span>
            </div>
          </div>
        </div>

        <div className="profile-content">
          <div className="profile-tabs">
            <button 
              className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile Info
            </button>
            <button 
              className={`tab ${activeTab === 'builds' ? 'active' : ''}`}
              onClick={() => setActiveTab('builds')}
            >
              My Builds
            </button>
            <button 
              className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              Recent Orders
            </button>
            <button 
              className={`tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              Security
            </button>
          </div>

          <div className="tab-content">
            {/* Profile Info Tab */}
            {activeTab === 'profile' && (
              <div className="profile-info-tab">
                <div className="section-header">
                  <h2>Profile Information</h2>
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className="btn btn-outline-primary"
                  >
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </button>
                </div>

                <form onSubmit={handleProfileSubmit} className="profile-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                        disabled={!isEditing}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        disabled={!isEditing}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Enter phone number"
                      />
                    </div>
                    
                    <div className="form-group full-width">
                      <label>Address</label>
                      <input
                        type="text"
                        value={profileData.address}
                        onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Enter street address"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>City</label>
                      <input
                        type="text"
                        value={profileData.city}
                        onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Enter city"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>State</label>
                      <input
                        type="text"
                        value={profileData.state}
                        onChange={(e) => setProfileData(prev => ({ ...prev, state: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Enter state"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>ZIP Code</label>
                      <input
                        type="text"
                        value={profileData.zipCode}
                        onChange={(e) => setProfileData(prev => ({ ...prev, zipCode: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Enter ZIP code"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Country</label>
                      <select
                        value={profileData.country}
                        onChange={(e) => setProfileData(prev => ({ ...prev, country: e.target.value }))}
                        disabled={!isEditing}
                      >
                        <option value="USA">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="UK">United Kingdom</option>
                      </select>
                    </div>
                  </div>
                  
                  {isEditing && (
                    <div className="form-actions">
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={updateProfileMutation.isLoading}
                      >
                        {updateProfileMutation.isLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Builds Tab */}
            {activeTab === 'builds' && (
              <div className="builds-tab">
                <div className="section-header">
                  <h2>My Builds</h2>
                  <button 
                    onClick={() => navigate('/pc-builder')}
                    className="btn btn-primary"
                  >
                    Create New Build
                  </button>
                </div>

                {userBuilds?.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🔧</div>
                    <h3>No Builds Yet</h3>
                    <p>Start building your dream PC configuration!</p>
                    <button 
                      onClick={() => navigate('/pc-builder')}
                      className="btn btn-primary"
                    >
                      Start Building
                    </button>
                  </div>
                ) : (
                  <div className="builds-grid">
                    {userBuilds?.map(build => (
                      <div key={build._id} className="build-card">
                        <div className="build-header">
                          <h3>{build.name}</h3>
                          <div className="build-actions">
                            <button 
                              onClick={() => navigate(`/builds/${build._id}`)}
                              className="btn btn-sm btn-outline-primary"
                            >
                              View
                            </button>
                            <button 
                              onClick={() => handleDeleteBuild(build._id, build.name)}
                              className="btn btn-sm btn-outline-danger"
                              disabled={deleteBuildMutation.isLoading}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        
                        <div className="build-info">
                          <div className="build-stat">
                            <span className="label">Total Price:</span>
                            <span className="value">${build.totalPrice?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="build-stat">
                            <span className="label">Components:</span>
                            <span className="value">{Object.values(build.components || {}).filter(Boolean).length}</span>
                          </div>
                          <div className="build-stat">
                            <span className="label">Created:</span>
                            <span className="value">{formatDate(build.createdAt)}</span>
                          </div>
                        </div>

                        {build.description && (
                          <p className="build-description">{build.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="orders-tab">
                <div className="section-header">
                  <h2>Recent Orders</h2>
                  <button 
                    onClick={() => navigate('/orders')}
                    className="btn btn-outline-primary"
                  >
                    View All Orders
                  </button>
                </div>

                {userOrders?.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📦</div>
                    <h3>No Orders Yet</h3>
                    <p>Start shopping to see your orders here!</p>
                    <button 
                      onClick={() => navigate('/products')}
                      className="btn btn-primary"
                    >
                      Browse Products
                    </button>
                  </div>
                ) : (
                  <div className="orders-list">
                    {userOrders?.map(order => (
                      <div key={order._id} className="order-card">
                        <div className="order-header">
                          <div className="order-info">
                            <h4>Order #{order.orderNumber}</h4>
                            <span className="order-date">{formatDate(order.createdAt)}</span>
                          </div>
                          <div className="order-status">
                            <span 
                              className="status-badge"
                              style={{ backgroundColor: getOrderStatusColor(order.status) }}
                            >
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                            <span className="order-total">${order.total.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        <div className="order-items">
                          {order.items.slice(0, 2).map(item => (
                            <div key={item.product._id} className="order-item">
                              <img 
                                src={item.product.images?.[0]?.url || '/placeholder-product.jpg'} 
                                alt={item.product.name}
                                onError={(e) => {
                                  e.target.src = '/placeholder-product.jpg';
                                }}
                              />
                              <span className="item-name">{item.product.name}</span>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <span className="more-items">+{order.items.length - 2} more</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="security-tab">
                <div className="section-header">
                  <h2>Security Settings</h2>
                </div>

                <div className="security-section">
                  <h3>Change Password</h3>
                  <form onSubmit={handlePasswordSubmit} className="password-form">
                    <div className="form-group">
                      <label>Current Password</label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>New Password</label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        required
                        minLength="6"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        required
                        minLength="6"
                      />
                    </div>
                    
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={changePasswordMutation.isLoading}
                    >
                      {changePasswordMutation.isLoading ? 'Changing...' : 'Change Password'}
                    </button>
                  </form>
                </div>

                <div className="security-section">
                  <h3>Account Actions</h3>
                  <div className="account-actions">
                    <button 
                      onClick={logout}
                      className="btn btn-outline-secondary"
                    >
                      Logout
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                          // Handle account deletion
                          toast.error('Account deletion feature coming soon');
                        }
                      }}
                      className="btn btn-outline-danger"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
