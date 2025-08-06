import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: ''
  });

  // Fetch product details
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await axios.get(`/api/products/${id}`);
      return response.data.product;
    }
  });

  // Fetch related products
  const { data: relatedProducts } = useQuery({
    queryKey: ['related-products', product?.category],
    queryFn: async () => {
      if (!product?.category) return [];
      const response = await axios.get(`/api/products?category=${product.category}&limit=4`);
      return response.data.products.filter(p => p._id !== id);
    },
    enabled: !!product?.category
  });

  // Add review mutation
  const addReviewMutation = useMutation({
    mutationFn: async (reviewData) => {
      const response = await axios.post(`/api/products/${id}/reviews`, reviewData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Review added successfully!');
      setReviewData({ rating: 5, comment: '' });
      queryClient.invalidateQueries(['product', id]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add review');
    }
  });

  const handleAddToCart = async () => {
    if (!user) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }

    if (product.stock === 0) {
      toast.error('Product is out of stock');
      return;
    }

    try {
      await addToCart(product._id, quantity);
      toast.success('Item added to cart!');
    } catch (error) {
      toast.error('Failed to add item to cart');
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      toast.error('Please login to purchase');
      navigate('/login');
      return;
    }

    if (product.stock === 0) {
      toast.error('Product is out of stock');
      return;
    }

    try {
      await addToCart(product._id, quantity);
      navigate('/checkout');
    } catch (error) {
      toast.error('Failed to add item to cart');
    }
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please login to write a review');
      navigate('/login');
      return;
    }

    if (!reviewData.comment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    addReviewMutation.mutate(reviewData);
  };

  const renderStars = (rating, interactive = false, onRatingChange = null) => {
    return (
      <div className={`stars ${interactive ? 'interactive' : ''}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= rating ? 'star filled' : 'star'}
            onClick={interactive ? () => onRatingChange(star) : undefined}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const getCategorySpecs = () => {
    if (!product?.detailedSpecs) return {};
    
    const categoryMap = {
      'CPU': 'cpu',
      'GPU': 'gpu',
      'Motherboard': 'motherboard',
      'RAM': 'ram',
      'Storage': 'storage',
      'Power Supply': 'powerSupply',
      'Case': 'case',
      'Cooling': 'cooling',
      'Monitor': 'monitor',
      'Keyboard': 'keyboard',
      'Mouse': 'mouse',
      'Headset': 'headset',
      'Speakers': 'speakers',
      'Webcam': 'webcam'
    };
    
    const categoryKey = categoryMap[product.category];
    return categoryKey ? (product.detailedSpecs[categoryKey] || {}) : {};
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

  if (error || !product) {
    return (
      <div className="container">
        <div className="error-message">
          <h2>Product Not Found</h2>
          <p>The product you're looking for doesn't exist or has been removed.</p>
          <button onClick={() => navigate('/products')} className="btn btn-primary">
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  const categorySpecs = getCategorySpecs();
  const hasDetailedSpecs = Object.keys(categorySpecs).length > 0;

  return (
    <div className="container">
      <div className="product-detail">
        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <span onClick={() => navigate('/')}>Home</span>
          <span onClick={() => navigate('/products')}>Products</span>
          <span onClick={() => navigate(`/products?category=${product.category}`)}>
            {product.category}
          </span>
          <span className="active">{product.name}</span>
        </nav>

        <div className="product-detail-content">
          {/* Product Images */}
          <div className="product-images">
            <div className="main-image">
              <img 
                src={product.images?.[selectedImage]?.url || product.images?.[selectedImage] || '/placeholder-product.jpg'} 
                alt={product.name}
                onError={(e) => {
                  e.target.src = '/placeholder-product.jpg';
                }}
              />
              {product.stock === 0 && (
                <div className="out-of-stock-overlay">
                  <span>Out of Stock</span>
                </div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="thumbnail-images">
                {product.images.map((image, index) => (
                  <img
                    key={index}
                    src={typeof image === 'string' ? image : image.url}
                    alt={`${product.name} ${index + 1}`}
                    className={selectedImage === index ? 'active' : ''}
                    onClick={() => setSelectedImage(index)}
                    onError={(e) => {
                      e.target.src = '/placeholder-product.jpg';
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="product-info">
            <h1 className="product-title">{product.name}</h1>
            
            <div className="product-meta">
              <span className="brand">Brand: <strong>{product.brand}</strong></span>
              <span className="category">Category: <strong>{product.category}</strong></span>
              <span className="model">Model: <strong>{product.model || 'N/A'}</strong></span>
            </div>

            <div className="product-rating-summary">
              {renderStars(Math.round(product.ratings?.average || 0))}
              <span className="rating-text">
                ({product.ratings?.average?.toFixed(1) || '0.0'}) • {product.ratings?.count || 0} reviews
              </span>
            </div>

            <div className="product-price">
              {product.originalPrice && product.originalPrice > product.price ? (
                <>
                  <span className="current-price">${product.price.toFixed(2)}</span>
                  <span className="original-price">${product.originalPrice.toFixed(2)}</span>
                  <span className="discount-badge">
                    {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                  </span>
                </>
              ) : (
                <span className="current-price">${product.price.toFixed(2)}</span>
              )}
            </div>

            <div className="product-availability">
              {product.stock > 0 ? (
                <span className="in-stock">✓ In Stock ({product.stock} available)</span>
              ) : (
                <span className="out-of-stock">✗ Out of Stock</span>
              )}
            </div>

            {/* Add to Cart Section */}
            <div className="product-actions">
              <div className="quantity-selector">
                <label>Quantity:</label>
                <div className="quantity-controls">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
                    min="1"
                    max={product.stock}
                  />
                  <button 
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="action-buttons">
                <button 
                  className="btn btn-primary add-to-cart"
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                >
                  Add to Cart
                </button>
                <button 
                  className="btn btn-secondary buy-now"
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                >
                  Buy Now
                </button>
              </div>
            </div>

            {/* Warranty & Features */}
            {(product.warranty || product.features) && (
              <div className="product-highlights">
                {product.warranty && (
                  <div className="warranty-info">
                    <h4>Warranty</h4>
                    <p>{product.warranty.duration} {product.warranty.type || 'years'} warranty</p>
                  </div>
                )}
                {product.features && product.features.length > 0 && (
                  <div className="key-features">
                    <h4>Key Features</h4>
                    <ul>
                      {product.features.slice(0, 3).map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="product-tabs">
          <div className="tab-navigation">
            <button 
              className={activeTab === 'overview' ? 'active' : ''}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={activeTab === 'specifications' ? 'active' : ''}
              onClick={() => setActiveTab('specifications')}
            >
              Specifications
            </button>
            <button 
              className={activeTab === 'reviews' ? 'active' : ''}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews ({product.ratings?.count || 0})
            </button>
          </div>

          <div className="tab-content">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="tab-pane overview-pane">
                <div className="product-description">
                  <h3>Description</h3>
                  <p>{product.description}</p>
                </div>

                {product.features && product.features.length > 0 && (
                  <div className="product-features">
                    <h3>Features</h3>
                    <ul>
                      {product.features.map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {product.tags && product.tags.length > 0 && (
                  <div className="product-tags">
                    <h3>Tags</h3>
                    <div className="tags-list">
                      {product.tags.map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Specifications Tab */}
            {activeTab === 'specifications' && (
              <div className="tab-pane specifications-pane">
                {hasDetailedSpecs ? (
                  <div className="detailed-specifications">
                    <h3>Detailed Specifications</h3>
                    <div className="specs-grid">
                      {Object.entries(categorySpecs).map(([key, value]) => {
                        if (!value) return null;
                        return (
                          <div key={key} className="spec-item">
                            <span className="spec-label">
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                            </span>
                            <span className="spec-value">{value}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : product.specifications && Object.keys(product.specifications).length > 0 ? (
                  <div className="basic-specifications">
                    <h3>Specifications</h3>
                    <div className="specs-grid">
                      {Object.entries(product.specifications).map(([key, value]) => (
                        <div key={key} className="spec-item">
                          <span className="spec-label">{key}:</span>
                          <span className="spec-value">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="no-specifications">
                    <p>No detailed specifications available for this product.</p>
                  </div>
                )}

                {product.compatibility && (
                  <div className="compatibility-info">
                    <h3>Compatibility</h3>
                    <div className="compatibility-grid">
                      {product.compatibility.socket && (
                        <div className="compatibility-item">
                          <span className="label">Socket:</span>
                          <span className="value">{product.compatibility.socket}</span>
                        </div>
                      )}
                      {product.compatibility.formFactor && (
                        <div className="compatibility-item">
                          <span className="label">Form Factor:</span>
                          <span className="value">{product.compatibility.formFactor}</span>
                        </div>
                      )}
                      {product.compatibility.memoryType && (
                        <div className="compatibility-item">
                          <span className="label">Memory Type:</span>
                          <span className="value">{product.compatibility.memoryType}</span>
                        </div>
                      )}
                      {product.compatibility.powerRequirement && (
                        <div className="compatibility-item">
                          <span className="label">Power Requirement:</span>
                          <span className="value">{product.compatibility.powerRequirement}W</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="tab-pane reviews-pane">
                <div className="reviews-summary">
                  <div className="rating-overview">
                    <div className="average-rating">
                      <span className="rating-number">{product.ratings?.average?.toFixed(1) || '0.0'}</span>
                      <div className="stars-large">
                        {renderStars(Math.round(product.ratings?.average || 0))}
                      </div>
                      <span className="total-reviews">{product.ratings?.count || 0} reviews</span>
                    </div>
                  </div>
                </div>

                {/* Add Review Form */}
                {user && (
                  <div className="add-review">
                    <h4>Write a Review</h4>
                    <form onSubmit={handleSubmitReview}>
                      <div className="rating-input">
                        <label>Your Rating:</label>
                        {renderStars(reviewData.rating, true, (rating) => 
                          setReviewData({...reviewData, rating})
                        )}
                      </div>
                      <div className="comment-input">
                        <label>Your Review:</label>
                        <textarea
                          value={reviewData.comment}
                          onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                          placeholder="Share your thoughts about this product..."
                          maxLength={500}
                          required
                        />
                        <small>{500 - reviewData.comment.length} characters remaining</small>
                      </div>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={addReviewMutation.isLoading}
                      >
                        {addReviewMutation.isLoading ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Reviews List */}
                <div className="reviews-list">
                  {product.reviews && product.reviews.length > 0 ? (
                    product.reviews.map((review, index) => (
                      <div key={index} className="review-item">
                        <div className="review-header">
                          <div className="reviewer-info">
                            <span className="reviewer-name">
                              {review.user?.name || review.user?.email || 'Anonymous'}
                            </span>
                            <span className="review-date">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="review-rating">
                            {renderStars(review.rating)}
                          </div>
                        </div>
                        <div className="review-comment">
                          <p>{review.comment}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-reviews">
                      <p>No reviews yet. Be the first to review this product!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div className="related-products">
            <h2>Related Products</h2>
            <div className="products-grid">
              {relatedProducts.map(relatedProduct => (
                <div key={relatedProduct._id} className="product-card">
                  <img 
                    src={relatedProduct.images?.[0]?.url || relatedProduct.images?.[0] || '/placeholder-product.jpg'} 
                    alt={relatedProduct.name}
                    onClick={() => navigate(`/products/${relatedProduct._id}`)}
                    onError={(e) => {
                      e.target.src = '/placeholder-product.jpg';
                    }}
                  />
                  <div className="product-card-content">
                    <h3>{relatedProduct.name}</h3>
                    <p className="brand">{relatedProduct.brand}</p>
                    <div className="rating">
                      {renderStars(Math.round(relatedProduct.ratings?.average || 0))}
                      <span>({relatedProduct.ratings?.count || 0})</span>
                    </div>
                    <div className="price">
                      {relatedProduct.originalPrice && relatedProduct.originalPrice > relatedProduct.price ? (
                        <>
                          <span className="current">${relatedProduct.price.toFixed(2)}</span>
                          <span className="original">${relatedProduct.originalPrice.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="current">${relatedProduct.price.toFixed(2)}</span>
                      )}
                    </div>
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate(`/products/${relatedProduct._id}`)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
