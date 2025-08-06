import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import './BuildDetails.css';

const BuildDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [build, setBuild] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    fetchBuildDetails();
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

  const addBuildToCart = () => {
    if (!build?.components) {
      toast.error('No components found to add to cart');
      return;
    }

    const components = Object.values(build.components);
    let addedCount = 0;
    
    components.forEach(component => {
      if (component?.product) {
        addToCart(component.product);
        addedCount++;
      } else if (component?._id) {
        addToCart(component);
        addedCount++;
      }
    });
    
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
        {/* Header */}
        <div className="build-header">
          <button 
            className="btn btn-secondary btn-back"
            onClick={() => navigate('/community')}
          >
            ← Back to Community
          </button>
          
          <div className="build-title-section">
            <h1>{build.name || 'Untitled Build'}</h1>
            <div className="build-meta">
              <span className="build-price">{formatPrice(build.totalPrice)}</span>
              <span className="build-date">Created {formatDate(build.createdAt)}</span>
            </div>
          </div>

          <div className="build-actions">
            <button 
              className={`btn btn-like ${isLiked ? 'liked' : ''}`}
              onClick={handleLike}
            >
              ❤️ {likesCount}
            </button>
            <button 
              className="btn btn-primary"
              onClick={addBuildToCart}
            >
              Add All to Cart
            </button>
          </div>
        </div>

        {/* Build Info */}
        <div className="build-content">
          <div className="build-info">
            {/* Creator Info */}
            <div className="creator-section">
              <div className="creator-avatar">
                {build.user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="creator-details">
                <h3>Created by {build.user?.name || 'Anonymous'}</h3>
                <p>{build.description || 'No description provided.'}</p>
              </div>
            </div>

            {/* Purpose & Specs */}
            {build.purpose && (
              <div className="build-purpose">
                <h3>Build Purpose</h3>
                <span className="purpose-tag">{build.purpose}</span>
              </div>
            )}
          </div>

          {/* Components */}
          <div className="components-section">
            <h2>Components</h2>
            <div className="components-grid">
              {Object.entries(build.components || {}).map(([category, component]) => (
                <div key={category} className="component-card">
                  <div className="component-header">
                    <h3>{category}</h3>
                    <span className="component-price">
                      {formatPrice(component?.price || component?.product?.price)}
                    </span>
                  </div>
                  <div className="component-details">
                    <h4 className="component-name">
                      {component?.product?.name || component?.name || 'Unknown Component'}
                    </h4>
                    {(component?.brand || component?.product?.brand) && (
                      <p className="component-brand">
                        {component?.brand || component?.product?.brand}
                      </p>
                    )}
                    {(component?.specifications || component?.product?.specifications) && 
                     Object.keys(component?.specifications || component?.product?.specifications || {}).length > 0 && (
                      <div className="component-specs">
                        <h5>Specifications:</h5>
                        <div className="specs-list">
                          {Object.entries(component?.specifications || component?.product?.specifications || {}).map(([key, value]) => (
                            <div key={key} className="spec-item">
                              <span className="spec-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                              <span className="spec-value">{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button 
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => addToCart(component?.product || component)}
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="build-total">
            <h2>Total Build Cost: {formatPrice(build.totalPrice)}</h2>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildDetails;
