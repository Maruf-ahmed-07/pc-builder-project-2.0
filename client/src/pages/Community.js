import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Community.css';

const Community = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('featured');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: buildsData, isLoading } = useQuery({
    queryKey: ['community-builds', activeTab, currentPage, filterCategory, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 12,
        category: filterCategory,
        search: searchTerm,
        sort: activeTab === 'featured' ? 'featured' : activeTab === 'popular' ? 'likes' : 'recent'
      });
      const response = await axios.get(`/api/community/builds?${params}`);
      return response.data;
    }
  });

  const likeBuildMutation = useMutation({
    mutationFn: async (buildId) => {
      const response = await axios.post(`/api/community/builds/${buildId}/like`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['community-builds']);
    },
    onError: (error) => {
      if (error.response?.status === 401) {
        toast.error('Please login to like builds');
      } else {
        toast.error(error.response?.data?.message || 'Failed to like build');
      }
    }
  });

  const followUserMutation = useMutation({
    mutationFn: async (userId) => {
      const response = await axios.post(`/api/users/${userId}/follow`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('User followed successfully!');
      queryClient.invalidateQueries(['community-builds']);
    },
    onError: (error) => {
      if (error.response?.status === 401) {
        toast.error('Please login to follow users');
      } else {
        toast.error(error.response?.data?.message || 'Failed to follow user');
      }
    }
  });

  const handleLikeBuild = (buildId) => {
    if (!user) {
      toast.error('Please login to like builds');
      return;
    }
    likeBuildMutation.mutate(buildId);
  };

  const handleFollowUser = (userId) => {
    if (!user) {
      toast.error('Please login to follow users');
      return;
    }
    followUserMutation.mutate(userId);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPurposeColor = (purpose) => {
    const colors = {
      gaming: '#28a745',
      workstation: '#007bff',
      budget: '#ffc107',
      streaming: '#dc3545',
      mining: '#6f42c1'
    };
    return colors[purpose] || '#6c757d';
  };

  return (
    <div className="community-page">
      <div className="container">
        <div className="page-header">
          <h1>PC Builder Community</h1>
          <p>Discover amazing PC builds from our community</p>
          {user && (
            <button 
              onClick={() => navigate('/pc-builder')}
              className="btn btn-primary"
            >
              Share Your Build
            </button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="community-filters">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search builds..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-section">
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              <option value="gaming">Gaming</option>
              <option value="workstation">Workstation</option>
              <option value="budget">Budget</option>
              <option value="streaming">Streaming</option>
              <option value="mining">Mining</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="community-tabs">
          <button 
            className={`tab ${activeTab === 'featured' ? 'active' : ''}`}
            onClick={() => setActiveTab('featured')}
          >
            Featured
          </button>
          <button 
            className={`tab ${activeTab === 'popular' ? 'active' : ''}`}
            onClick={() => setActiveTab('popular')}
          >
            Most Popular
          </button>
          <button 
            className={`tab ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            Recent
          </button>
        </div>

        {/* Builds Grid */}
        {isLoading ? (
          <div className="loading-spinner">
            <p>Loading...</p>
          </div>
        ) : (
          <>
            {!buildsData?.builds || buildsData.builds.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔧</div>
                <h3>No builds found</h3>
                <p>Be the first to share a build in this category!</p>
                {user && (
                  <button 
                    onClick={() => navigate('/pc-builder')}
                    className="btn btn-primary"
                  >
                    Create Build
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="builds-grid">
                  {buildsData.builds.filter(build => build && build._id).map(build => (
                    <div key={build._id} className="build-card">
                      <div className="build-header">
                        <div className="build-title">
                          <h3 onClick={() => navigate(`/community/builds/${build._id}`)}>
                            {build.name || 'Untitled Build'}
                          </h3>
                          <div className="build-meta">
                            <span 
                              className="purpose-tag"
                              style={{ backgroundColor: getPurposeColor(build.purpose) }}
                            >
                              {build.purpose || 'General'}
                            </span>
                            <span className="price">{formatPrice(build.totalPrice || 0)}</span>
                          </div>
                        </div>
                        
                        <div className="build-actions">
                          <button 
                            onClick={() => handleLikeBuild(build._id)}
                            className={`like-btn ${build.isLiked ? 'liked' : ''}`}
                            disabled={likeBuildMutation.isLoading}
                          >
                            ❤️ {typeof build.likes === 'number' ? build.likes : (Array.isArray(build.likes) ? build.likes.length : 0)}
                          </button>
                        </div>
                      </div>

                      <div className="build-description">
                        {build.description || 'No description provided.'}
                      </div>

                      <div className="build-components">
                        <h4>Key Components:</h4>
                        <div className="component-list">
                          {build.components?.cpu && (
                            <div className="component">
                              <span className="label">CPU:</span>
                              <span className="value">{build.components.cpu.product?.name || build.components.cpu.name || 'Unknown CPU'}</span>
                            </div>
                          )}
                          {build.components?.gpu && (
                            <div className="component">
                              <span className="label">GPU:</span>
                              <span className="value">{build.components.gpu.product?.name || build.components.gpu.name || 'Unknown GPU'}</span>
                            </div>
                          )}
                          {build.components?.motherboard && (
                            <div className="component">
                              <span className="label">Motherboard:</span>
                              <span className="value">{build.components.motherboard.product?.name || build.components.motherboard.name || 'Unknown Motherboard'}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="build-footer">
                        <div className="builder-info">
                          <div className="builder-avatar">
                            {build.user?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="builder-details">
                            <span className="builder-name">{build.user?.name || 'Anonymous'}</span>
                            <span className="build-date">{formatDate(build.createdAt) || 'Unknown date'}</span>
                          </div>
                        </div>
                        
                        <div className="footer-actions">
                          {user && user.id !== build.user?._id && build.user?._id && (
                            <button 
                              onClick={() => handleFollowUser(build.user._id)}
                              className="btn btn-sm btn-outline-primary"
                              disabled={followUserMutation.isLoading}
                            >
                              Follow
                            </button>
                          )}
                          <button 
                            onClick={() => navigate(`/community/builds/${build._id}`)}
                            className="btn btn-sm btn-primary"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {buildsData.pagination.totalPages > 1 && (
                  <div className="pagination">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="btn btn-outline-secondary"
                    >
                      Previous
                    </button>
                    
                    <div className="page-numbers">
                      {Array.from({ length: Math.min(5, buildsData.pagination.totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`btn ${currentPage === page ? 'btn-primary' : 'btn-outline-secondary'}`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, buildsData.pagination.totalPages))}
                      disabled={currentPage === buildsData.pagination.totalPages}
                      className="btn btn-outline-secondary"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Community;
