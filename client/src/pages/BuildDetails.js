import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
//for module 2
import { useCart } from '../contexts/CartContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import './BuildDetails.css';

const BuildDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, addBuildToCart, loadCart } = useCart();
  const [build, setBuild] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentPage, setCommentPage] = useState(1);
  const [commentTotalPages, setCommentTotalPages] = useState(1);
  const [newComment, setNewComment] = useState('');
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [expandedComponents, setExpandedComponents] = useState({});
  const [commentSort, setCommentSort] = useState('newest'); // newest | oldest | longest
  const [expandedComments, setExpandedComments] = useState({}); // commentId => bool
  const [lastAddedId, setLastAddedId] = useState(null);

  useEffect(() => {
    fetchBuildDetails();
  // initial comments load
  fetchComments(1);
  }, [id]);

  const fetchBuildDetails = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/community/builds/${id}`);
      setBuild(response.data.build);
      setIsLiked(response.data.build.isLiked || false);
      setLikesCount(response.data.build.likes || 0);
    } catch (error) {
      console.error('Error fetching build details:', error);
      if (error.response?.status === 404) {
        toast.error('Build not found');
        navigate('/community');
      } else {
        toast.error('Failed to load build details');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Please login to like builds');
      return;
    }

    try {
      await axios.post(`/api/community/builds/${id}/like`);
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
      toast.success(isLiked ? 'Build unliked' : 'Build liked!');
    } catch (error) {
      console.error('Error liking build:', error);
      toast.error('Failed to like build');
    }
  };

  const fetchComments = async (page = 1) => {
    try {
      let res;
      try {
        res = await axios.get(`/api/community/builds/${id}/comments?page=${page}&limit=15`);
      } catch (err) {
        if (err.response?.status === 404) {
          // Try alias
            try {
              res = await axios.get(`/api/community/builds/${id}/comment?page=${page}&limit=15`);
            } catch (aliasErr) {
              throw aliasErr;
            }
        } else {
          throw err;
        }
      }
      setComments(res.data.comments || []);
      setCommentPage(res.data.pagination.currentPage);
      setCommentTotalPages(res.data.pagination.totalPages);
    } catch (e) {
      console.error('Error loading comments', e);
      if (e.response?.status === 404) {
        toast.error('Comments route not found. Please refresh after server restart.');
      }
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!user) { toast.error('Login to comment'); return; }
    if (!newComment.trim()) return;
    try {
      setIsCommentSubmitting(true);
      let res;
      try {
        res = await axios.post(`/api/community/builds/${id}/comments`, { comment: newComment.trim() });
      } catch (err) {
        if (err.response?.status === 404) {
          // fallback to alias singular route
          res = await axios.post(`/api/community/builds/${id}/comment`, { comment: newComment.trim() });
        } else {
          throw err;
        }
      }
      setNewComment('');
      // Prepend new comment
  setComments(prev => [res.data.comment, ...prev]);
  setLastAddedId(res.data.comment._id);
      toast.success('Comment added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add comment');
      if (err.response?.status === 404) {
        console.error('Comment POST 404 URL attempted (plural then singular)', `/api/community/builds/${id}/comments`);
      }
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const addAllToCart = async () => {
    if (!build?.components) {
      toast.error('No components found to add to cart');
      return;
    }

    // Try server-side add build endpoint first (preferred)
    if (typeof addBuildToCart === 'function') {
      const res = await addBuildToCart(build._id);
      if (res && res.success) {
        // If server returned the updated cart, we're done.
        if (res.cart) return;
        // Server accepted the request but did not return cart data. Force a reload.
        try {
          await loadCart();
          return;
        } catch (e) {
          // fallthrough to client-side add if reload fails
        }
      }
      // fallthrough to client-side add if server endpoint failed
    }

    // Fallback: add individual components by product id
    const components = Object.values(build.components);
    let addedCount = 0;
    for (const component of components) {
      const productId = component?.product?._id || component?._id;
      if (productId) {
        // await each add so server cart stays consistent
        await addToCart(productId, 1, { silent: true });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      toast.success(`${addedCount} components from "${build.name}" added to cart!`);
    } else {
      toast.error('No components found to add to cart');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const toggleComponent = (category) => {
    setExpandedComponents(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied');
    } catch (e) {
      toast.error('Copy failed');
    }
  };

  const componentEntries = Object.entries(build?.components || {});
  const componentCount = componentEntries.length;

  // Essential category presence checklist
  const essentialCategories = ['CPU','Motherboard','RAM','Storage','PSU','Case'];
  const hasGPU = !!componentEntries.find(([k]) => k.toLowerCase().includes('gpu') || k.toLowerCase().includes('graphics'));
  const checklist = essentialCategories.map(cat => ({
    label: cat,
    present: !!componentEntries.find(([k]) => k.toLowerCase() === cat.toLowerCase())
  }));
  checklist.push({ label: 'GPU', present: hasGPU });

  // Cost breakdown by major categories (grouping unknown into Other)
  const priceFor = (comp) => (comp?.price || comp?.product?.price || 0);
  const categoryTotals = {};
  componentEntries.forEach(([category, comp]) => {
    const key = category; // keep original key names
    categoryTotals[key] = (categoryTotals[key] || 0) + priceFor(comp);
  });
  const totalCost = (typeof build?.totalPrice === 'number')
    ? build.totalPrice
    : Object.values(categoryTotals).reduce((a,b)=>a+b,0);
  const breakdown = Object.entries(categoryTotals)
    .sort((a,b)=>b[1]-a[1])
    .map(([cat, val]) => ({ cat, val, pct: totalCost ? (val/totalCost*100) : 0 }));

  const toggleCommentExpand = (id) => {
    setExpandedComments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sortComments = (list) => {
    const arr = [...list];
    switch (commentSort) {
      case 'oldest':
        return arr.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'longest':
        return arr.sort((a,b) => (b.comment?.length || 0) - (a.comment?.length || 0));
      case 'newest':
      default:
        return arr.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  };

  const displayedComments = sortComments(comments);

  if (isLoading) {
    return (
      <div className="build-details-page">
        <div className="container">
          <div className="loading-spinner">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!build) {
    return (
      <div className="build-details-page">
        <div className="container">
          <div className="error-state">
            <h2>Build Not Found</h2>
            <p>The build you're looking for doesn't exist or has been removed.</p>
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('/community')}
            >
              Back to Community
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="build-details-page">
      <div className="container">
        <div className="build-hero">
          <div className="hero-top">
            <button className="btn btn-secondary btn-back" onClick={() => navigate('/community')}>← Back</button>
            <div className="build-badges">
              {build.featured && <span className="badge featured-badge">Featured</span>}
              {build.purpose && <span className="badge purpose-badge">{build.purpose}</span>}
            </div>
          </div>
          <h1 className="hero-title">{build.name || 'Untitled Build'}</h1>
          {build.description && <p className="hero-description">{build.description}</p>}
          <div className="hero-insights">
            <div className="build-checklist">
              <div className="insight-title">Completeness</div>
              <ul>
                {checklist.map(item => (
                  <li key={item.label} className={item.present ? 'ok' : 'missing'}>
                    <span className="status-icon" aria-hidden="true">{item.present ? '✔' : '✖'}</span>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="cost-breakdown">
              <div className="insight-title">Cost Breakdown</div>
              <div className="cost-list">
                {breakdown.slice(0,6).map(row => (
                  <div key={row.cat} className="cost-row">
                    <div className="cost-row-top">
                      <span className="cost-cat">{row.cat}</span>
                      <span className="cost-val">{formatPrice(row.val)} <em>{row.pct.toFixed(1)}%</em></span>
                    </div>
                    <div className="cost-bar"><div className="cost-bar-fill" style={{width: `${row.pct}%`}} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="key-metrics">
              <div className="metric-block">
                <span className="metric-label">Total Cost</span>
                <span className="metric-value">{formatPrice(totalCost)}</span>
              </div>
              <div className="metric-block">
                <span className="metric-label">Components</span>
                <span className="metric-value">{componentCount}</span>
              </div>
              <div className="metric-block">
                <span className="metric-label">Likes</span>
                <span className="metric-value">{likesCount}</span>
              </div>
              <div className="metric-block">
                <span className="metric-label">Created</span>
                <span className="metric-value small">{formatDate(build.createdAt)}</span>
              </div>
            </div>
          </div>
            <div className="hero-actions">
            <button className={`btn btn-like hero-like ${isLiked ? 'liked' : ''}`} onClick={handleLike}>{isLiked ? '💖 Liked' : '❤️ Like'} ({likesCount})</button>
            <button className="btn btn-primary" onClick={addAllToCart}>Add All to Cart</button>
            <button className="btn btn-outline" onClick={handleShare}>Share</button>
          </div>
        </div>

        <div className="build-layout">
          <div className="build-main">
            <div className="panel creator-panel">
              <div className="creator-avatar large">{build.user?.name?.charAt(0).toUpperCase() || 'U'}</div>
              <div className="creator-details">
                <h3>{build.user?.name || 'Anonymous'}</h3>
                <p className="creator-desc">{build.description || 'No description provided.'}</p>
              </div>
            </div>

            <div className="panel components-panel">
              <div className="panel-header">
                <h2>Components</h2>
                <span className="panel-sub">{componentCount} items</span>
              </div>
              <div className="components-grid">
                {componentEntries.map(([category, component]) => {
                  const specs = component?.specifications || component?.product?.specifications || {};
                  const specKeys = Object.keys(specs || {});
                  const isExpanded = expandedComponents[category];
                  return (
                    <div key={category} className={`component-card modern ${isExpanded ? 'expanded' : ''}`}>
                      <div className="component-header">
                        <h3>{category}</h3>
                        <div className="component-header-actions">
                          <span className="component-price">{formatPrice(component?.price || component?.product?.price)}</span>
                          {specKeys.length > 0 && (
                            <button type="button" className="toggle-specs" onClick={() => toggleComponent(category)}>
                              {isExpanded ? '− Hide' : '+ Specs'}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="component-details">
                        <h4 className="component-name">{component?.product?.name || component?.name || 'Unknown Component'}</h4>
                        {(component?.brand || component?.product?.brand) && (
                          <p className="component-brand">{component?.brand || component?.product?.brand}</p>
                        )}
                        {specKeys.length > 0 && isExpanded && (
                          <div className="component-specs">
                            <div className="specs-list">
                              {Object.entries(specs).map(([key, value]) => (
                                <div key={key} className="spec-item">
                                  <span className="spec-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                                  <span className="spec-value">{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="component-footer">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={async () => {
                            const productId = component?.product?._id || component?._id;
                            if (!productId) {
                              toast.error('Cannot add this item to cart');
                              return;
                            }
                            await addToCart(productId, 1, { silent: false });
                          }}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="panel comments-panel" id="comments">
              <div className="panel-header comments-header">
                <h2>Comments</h2>
                <div className="comments-controls">
                  <select className="comment-sort" value={commentSort} onChange={e => setCommentSort(e.target.value)}>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="longest">Longest</option>
                  </select>
                </div>
              </div>
              <div className="comment-form-wrapper enhanced">
                {user ? (
                  build.user && user._id === build.user._id ? (
                    <div className="owner-comment-notice">You cannot comment on your own build.</div>
                  ) : (
                  <form onSubmit={handleSubmitComment} className="comment-form fancy">
                    <textarea
                      placeholder="Share your thoughts about this build..."
                      value={newComment}
                      maxLength={500}
                      onChange={(e) => setNewComment(e.target.value)}
                      required
                    />
                    <div className="comment-form-actions">
                      <span className="remaining">{500 - newComment.length} chars</span>
                      <button className="btn btn-primary" disabled={isCommentSubmitting || !newComment.trim()}>
                        {isCommentSubmitting ? 'Posting…' : 'Post'}
                      </button>
                    </div>
                  </form>
                  )
                ) : (
                  <div className="login-prompt subtle">
                    <div className="lp-icon" aria-hidden="true">🔐</div>
                    <div className="lp-text">
                      <strong>Join the discussion</strong>
                      <span>Login to add a comment.</span>
                    </div>
                    <button className="btn btn-primary lp-action" onClick={() => navigate('/login')}>Login</button>
                  </div>
                )}
              </div>
              <div className="comments-list enhanced">
                {displayedComments.length === 0 ? (
                  <div className="no-comments pretty">No comments yet.</div>
                ) : (
                  displayedComments.map(c => {
                    const long = (c.comment || '').length > 260;
                    const expanded = expandedComments[c._id];
                    const show = expanded || !long;
                    const text = show ? c.comment : c.comment.slice(0, 260) + '…';
                    return (
                      <div key={c._id} className={`comment-item pretty ${c._id === lastAddedId ? 'just-added' : ''}`}>
                        <div className="comment-avatar ring">{(c.user?.name || 'U').charAt(0).toUpperCase()}</div>
                        <div className="comment-body">
                          <div className="comment-meta">
                            <span className="comment-author">{c.user?.name || 'User'}</span>
                            <span className="comment-date" title={new Date(c.createdAt).toLocaleString()}> {new Date(c.createdAt).toLocaleDateString()} </span>
                            {long && (
                              <button type="button" className="comment-expand" onClick={() => toggleCommentExpand(c._id)}>
                                {expanded ? 'Collapse' : 'Read more'}
                              </button>
                            )}
                          </div>
                          <p className="comment-text selectable">{text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {commentTotalPages > 1 && (
                <div className="comments-pagination refined">
                  <button className="btn btn-sm btn-outline" disabled={commentPage===1} onClick={() => fetchComments(commentPage-1)}>Prev</button>
                  <span className="cp-info">Page {commentPage} / {commentTotalPages}</span>
                  <button className="btn btn-sm btn-outline" disabled={commentPage===commentTotalPages} onClick={() => fetchComments(commentPage+1)}>Next</button>
                </div>
              )}
            </div>
          </div>
          <aside className="build-sidebar">
            <div className="sidebar-card summary-card">
              <h3>Summary</h3>
              <ul className="summary-list">
                <li><span>Components</span><strong>{componentCount}</strong></li>
                <li><span>Total Cost</span><strong>{formatPrice(build.totalPrice)}</strong></li>
                <li><span>Likes</span><strong>{likesCount}</strong></li>
                <li><span>Created</span><strong>{new Date(build.createdAt).toLocaleDateString()}</strong></li>
              </ul>
              <div className="summary-actions">
                <button className={`btn btn-like block ${isLiked ? 'liked' : ''}`} onClick={handleLike}>{isLiked ? '💖 Unlike' : '❤️ Like'} ({likesCount})</button>
                <button className="btn btn-primary block" onClick={addAllToCart}>Add All to Cart</button>
                <button className="btn btn-outline block" onClick={handleShare}>Share</button>
              </div>
            </div>
            <div className="sidebar-card tips-card">
              <h4>Tip</h4>
              <p>Expand component specs to compare details. You can add individual components directly to your cart.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BuildDetails;
