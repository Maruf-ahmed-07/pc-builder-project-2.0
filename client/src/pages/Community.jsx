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
  
  // Removed inactive tab state (was unused and caused lint error in CI)
  const [currentPage, setCurrentPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [followingOnly, setFollowingOnly] = useState(false);
  const [sortMode, setSortMode] = useState('recent');
  // Removed separate featured section; using single grid with optional featured-only toggle

  const { data: buildsData, isLoading } = useQuery({
    // activeTab removed from key (no UI to switch tabs currently)
    queryKey: ['community-builds', currentPage, filterCategory, searchTerm, followingOnly, sortMode, featuredOnly],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 12,
        category: filterCategory,
        search: searchTerm,
        sort: sortMode === 'popular' ? 'popular' : sortMode === 'newest' ? 'newest' : sortMode === 'price_low' ? 'price_low' : sortMode === 'price_high' ? 'price_high' : 'newest',
        followingOnly: followingOnly ? 'true' : 'false',
        featuredOnly: featuredOnly ? 'true' : 'false'
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

  const getComponent = (componentsObj, key) => {
    if (!componentsObj) return null;
    const target = key.toLowerCase();
    // Loop once to find a case-insensitive match (covers TitleCase like 'Motherboard')
    for (const k in componentsObj) {
      if (k.toLowerCase() === target) return componentsObj[k];
    }
    return null;
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
        <div className="community-filters enhanced-filters">
          <div className="filter-row top">
            <div className="input-wrapper search">
              <input
                type="text"
                placeholder="Search builds, creators or components..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="search-input fancy"
              />
            </div>
            <div className="segmented sort-group" role="group">
              {['newest','popular','price_low','price_high'].map(key => (
                <button key={key} className={`seg-btn ${sortMode===key ? 'active': ''}`} onClick={() => { setSortMode(key); setCurrentPage(1); }}>
                  {key === 'newest' && 'Newest'}
                  {key === 'popular' && 'Popular'}
                  {key === 'price_low' && 'Price ↑'}
                  {key === 'price_high' && 'Price ↓'}
                </button>
              ))}
            </div>
            <div className="toggle-following" style={{display:'flex', gap:'1rem'}}>
              <label className={`follow-toggle ${followingOnly ? 'on': ''}`}> 
                <input type="checkbox" checked={followingOnly} onChange={(e)=> { setFollowingOnly(e.target.checked); setCurrentPage(1); }} />
                <span className="indicator" />
                <span className="label-text">Following</span>
              </label>
              <label className={`follow-toggle ${featuredOnly ? 'on': ''}`}> 
                <input type="checkbox" checked={featuredOnly} onChange={(e)=> { setFeaturedOnly(e.target.checked); setCurrentPage(1); }} />
                <span className="indicator" />
                <span className="label-text">Featured</span>
              </label>
            </div>
          </div>
          <div className="filter-row bottom">
            <div className="category-chips">
              {['all','gaming','workstation','budget','streaming','mining'].map(cat => (
                <button key={cat} className={`cat-chip ${filterCategory===cat ? 'active': ''}`} onClick={() => { setFilterCategory(cat); setCurrentPage(1); }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Builds Grid */}
        {isLoading ? (
          <div className="builds-grid skeleton-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="build-card skeleton-card">
                <div className="sk-header" />
                <div className="sk-line short" />
                <div className="sk-line" />
                <div className="sk-components">
                  <div className="sk-chip" />
                  <div className="sk-chip" />
                  <div className="sk-chip" />
                </div>
                <div className="sk-footer" />
              </div>
            ))}
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
                <div className="builds-grid refined-grid">
                  {buildsData.builds.filter(build => build && build._id).map(build => {
                    const likeCount = typeof build.likes === 'number' ? build.likes : (Array.isArray(build.likes) ? build.likes.length : 0);
                    return (
                      <div key={build._id} className={`build-card minimal-card ${build.featured ? 'featured' : ''}`}>
                        <div className="card-accent" />
                        <div className="build-card-header" onClick={() => navigate(`/community/builds/${build._id}`)}>
                          <div className="title-block">
                            <h3 className="build-name">{build.name || 'Untitled Build'} {build.featured && <span className="featured-badge" title="Featured Build">★</span>}</h3>
                            <div className="meta-row">
                              <span className="purpose-chip" style={{ '--pc-color': getPurposeColor(build.purpose) }}>{build.purpose || 'General'}</span>
                              <span className="price-chip">{formatPrice(build.totalPrice || 0)}</span>
                            </div>
                          </div>
                          <div className="stat-pills">
                            <button 
                              className={`pill like-pill ${build.isLiked ? 'active' : ''}`}
                              onClick={(e) => { e.stopPropagation(); handleLikeBuild(build._id); }}
                              disabled={likeBuildMutation.isLoading}
                              title={build.isLiked ? 'Unlike' : 'Like this build'}
                            >❤️ <span>{likeCount}</span></button>
                            <button
                              className="pill comment-pill"
                              onClick={(e) => { e.stopPropagation(); navigate(`/community/builds/${build._id}#comments`); }}
                              title="View comments"
                            >💬 <span>{build.commentCount || 0}</span></button>
                          </div>
                        </div>
                        <div className="build-card-body">
                          <p className="description-line">{build.description || 'No description provided.'}</p>
                          {/* Flat Desk PC View with Hover Overlay */}
                          {build.components && (
                            <div className="pc-desk" aria-label="PC setup preview">
                              <div className="desk-flat">
                                {getComponent(build.components,'monitor') && (
                                  <div 
                                    className="flat-monitor" 
                                    data-name={getComponent(build.components,'monitor')?.product?.name || getComponent(build.components,'monitor')?.name}
                                    aria-label={getComponent(build.components,'monitor')?.product?.name || getComponent(build.components,'monitor')?.name}
                                  >
                                    <div className="fm-screen" />
                                  </div>
                                )}
                                <div className="flat-case" title={getComponent(build.components,'case')?.product?.name || getComponent(build.components,'case')?.name}>
                                  <div className="fc-header">
                                    <span className="power-led" />
                                    <span className="drive-led" />
                                  </div>
                                  <div className="fc-body">
                                    {['case','motherboard','cpu','gpu','ram','storage','powerSupply','cooling'].map(key => {
                                      const comp = getComponent(build.components,key);
                                      const short = key === 'motherboard' ? 'MB' : key === 'powerSupply' ? 'PSU' : key === 'storage' ? 'STO' : key === 'cooling' ? 'CL' : key.toUpperCase();
                                      const label = comp ? (comp.product?.name || comp.name) : 'Not added';
                                      return (
                                        <span key={key} className={`mini-badge ${key} ${comp ? '' : 'empty'}`} data-name={label}>{short}</span>
                                      );
                                    })}
                                  </div>
                                </div>
                                {getComponent(build.components,'keyboard') && (
                                  <div 
                                    className="flat-keyboard" 
                                    data-name={getComponent(build.components,'keyboard')?.product?.name || getComponent(build.components,'keyboard')?.name}
                                    aria-label={getComponent(build.components,'keyboard')?.product?.name || getComponent(build.components,'keyboard')?.name}
                                  >
                                    <span className="key-pattern" aria-hidden="true" />
                                  </div>
                                )}
                                {getComponent(build.components,'mouse') && (
                                  <div 
                                    className="flat-mouse" 
                                    data-name={getComponent(build.components,'mouse')?.product?.name || getComponent(build.components,'mouse')?.name}
                                    aria-label={getComponent(build.components,'mouse')?.product?.name || getComponent(build.components,'mouse')?.name}
                                  >
                                    <span className="scroll-wheel" aria-hidden="true" />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="core-specs" aria-label="Core specifications">
                            {['cpu','gpu','motherboard'].map((k) => {
                              const comp = getComponent(build.components,k);
                              const fullName = comp?.product?.name || comp?.name || 'Not added';
                              const shortName = fullName.length > 34 ? fullName.slice(0,34)+'…' : fullName;
                              const label = k === 'motherboard' ? 'MB' : k.toUpperCase();
                              return (
                                <div key={k} className={`core-spec-item ${!comp ? 'missing' : ''}`} data-full={fullName} title={fullName}>
                                  <span className={`core-icon ${k}`}></span>
                                  <span className="core-label">{label}</span>
                                  <span className="core-value">{shortName}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="build-card-footer">
                          <div className="owner-block">
                            <div className="avatar-sm">{build.user?.name?.charAt(0).toUpperCase() || 'U'}</div>
                            <div className="owner-meta">
                              <span className="owner-name">{build.user?.name || 'Anonymous'}</span>
                              <span className="date-stamp">{formatDate(build.createdAt) || 'Unknown date'}</span>
                            </div>
                          </div>
                          <div className="footer-buttons">
                            {user && user.id !== build.user?._id && build.user?._id && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleFollowUser(build.user._id); }}
                                className={`ghost-btn ${build.isFollowingUser ? 'active' : ''}`}
                                disabled={followUserMutation.isLoading}
                              >{build.isFollowingUser ? 'Following' : 'Follow'}</button>
                            )}
                            <button 
                              onClick={() => navigate(`/community/builds/${build._id}`)}
                              className="primary-btn"
                            >Details</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
