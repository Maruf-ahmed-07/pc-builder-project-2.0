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
  const [showAllFeatures, setShowAllFeatures] = useState(false);
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
      <div className="product-detail minimal">
        {/* Breadcrumb */}
        <nav className="breadcrumb minimal-breadcrumb">
          <span onClick={() => navigate('/')}>Home</span>
          <span onClick={() => navigate('/products')}>Products</span>
          <span onClick={() => navigate(`/products?category=${product.category}`)}>{product.category}</span>
          <span className="active" aria-current="page">{product.name}</span>
        </nav>

        <div className="product-hero-grid">
          {/* Gallery */}
          <div className="product-gallery">
            <div className="gallery-main">
              <img
                src={product.images?.[selectedImage]?.url || product.images?.[selectedImage] || '/placeholder-product.jpg'}
                alt={product.name}
                onError={(e) => { e.target.src = '/placeholder-product.jpg'; }}
              />
              {product.stock === 0 && (
                <div className="out-of-stock-overlay">
                  <span>Out of Stock</span>
                </div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="gallery-thumbs">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    className={`thumb ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                    aria-label={`Show image ${index + 1}`}
                  >
                    <img
                      src={typeof image === 'string' ? image : image.url}
                      alt={`${product.name} ${index + 1}`}
                      onError={(e) => { e.target.src = '/placeholder-product.jpg'; }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Summary / Info Card */}
          <div className="info-card">
            <h1 className="product-title clamp-2">{product.name}</h1>
            <div className="meta-pills">
              <span className="pill brand" title="Brand">{product.brand}</span>
              <span className="pill category" title="Category">{product.category}</span>
              {product.model && <span className="pill model" title="Model">{product.model}</span>}
            </div>

            <div className="rating-line">
              {renderStars(Math.round(product.ratings?.average || 0))}
              <span className="rating-text">{product.ratings?.average?.toFixed(1) || '0.0'} · {product.ratings?.count || 0} reviews</span>
            </div>

            <div className="price-block">
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="original-price">${product.originalPrice.toFixed(2)}</span>
              )}
              <span className="current-price">${product.price.toFixed(2)}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="discount-tag">-{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%</span>
              )}
            </div>

            <div className="availability-line">
              {product.stock > 0 ? (
                <span className="in-stock">In stock · {product.stock}</span>
              ) : (
                <span className="out-of-stock">Out of stock</span>
              )}
            </div>

            <div className="purchase-panel">
              <div className="qty-inline">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >-</button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={product.stock}
                  aria-label="Quantity"
                />
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                  aria-label="Increase quantity"
                >+</button>
              </div>
              <div className="cta-buttons">
                <button
                  className="btn primary solid"
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                >Add to Cart</button>
                <button
                  className="btn ghost secondary"
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                >Buy Now</button>
              </div>
            </div>

            {(product.warranty || (product.features && product.features.length)) && (
              <div className="quick-highlights">
                {product.warranty && (
                  <div className="mini-block">
                    <span className="label">Warranty</span>
                    <span className="value">{product.warranty.duration} {product.warranty.type || 'yrs'}</span>
                  </div>
                )}
                {product.features && product.features.length > 0 && (
                  <div className="mini-block">
                    <span className="label">Key Features</span>
                    <div className="feature-tags">
                      {(showAllFeatures ? product.features : product.features.slice(0,5)).map((f,i) => (
                        <span key={i} className="feat-tag">{f}</span>
                      ))}
                      {product.features.length > 5 && (
                        <button
                          type="button"
                          className="toggle-features"
                          onClick={() => setShowAllFeatures(s => !s)}
                        >{showAllFeatures ? 'Show less' : `+${product.features.length-5}`}</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="product-tabs minimal-tabs">
          <div className="tab-chip-group">
            <button className={`tab-chip ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
            <button className={`tab-chip ${activeTab === 'specifications' ? 'active' : ''}`} onClick={() => setActiveTab('specifications')}>Specifications</button>
            <button className={`tab-chip ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>Reviews ({product.ratings?.count || 0})</button>
          </div>
          <div className="tab-panels">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="tab-panel overview-panel">
                {product.description && (
                  <section className="desc-block">
                    <h3>Description</h3>
                    <p>{product.description}</p>
                  </section>
                )}
                {product.features && product.features.length > 0 && (
                  <section className="feat-block">
                    <h3>All Features</h3>
                    <ul className="clean-list">
                      {product.features.map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </section>
                )}
                {product.tags && product.tags.length > 0 && (
                  <section className="tags-block">
                    <h3>Tags</h3>
                    <div className="tags-inline">
                      {product.tags.map((tag, index) => (
                        <span key={index} className="tag-pill">{tag}</span>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* Specifications Tab */}
            {activeTab === 'specifications' && (
              <div className="tab-panel specs-panel">
                {hasDetailedSpecs ? (
                  <section className="spec-section">
                    <h3>Detailed Specifications</h3>
                    <div className="spec-table">
                      {Object.entries(categorySpecs).map(([key, value]) => {
                        if (!value) return null;
                        return (
                          <div key={key} className="spec-row">
                            <span className="k">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                            <span className="v">{value}</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : product.specifications && Object.keys(product.specifications).length > 0 ? (
                  <section className="spec-section">
                    <h3>Specifications</h3>
                    <div className="spec-table">
                      {Object.entries(product.specifications).map(([key, value]) => (
                        <div key={key} className="spec-row">
                          <span className="k">{key}</span>
                          <span className="v">{value}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : (
                  <div className="no-spec small">
                    <p>No detailed specifications available.</p>
                  </div>
                )}
                {product.compatibility && (
                  <section className="spec-section compatibility">
                    <h3>Compatibility</h3>
                    <div className="compat-list">
                      {product.compatibility.socket && (
                        <div className="compat-item"><span className="k">Socket</span><span className="v">{product.compatibility.socket}</span></div>
                      )}
                      {product.compatibility.formFactor && (
                        <div className="compat-item"><span className="k">Form Factor</span><span className="v">{product.compatibility.formFactor}</span></div>
                      )}
                      {product.compatibility.memoryType && (
                        <div className="compat-item"><span className="k">Memory Type</span><span className="v">{product.compatibility.memoryType}</span></div>
                      )}
                      {product.compatibility.powerRequirement && (
                        <div className="compat-item"><span className="k">Power</span><span className="v">{product.compatibility.powerRequirement}W</span></div>
                      )}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="tab-panel reviews-panel">
                <div className="reviews-header">
                  <div className="avg-box">
                    <span className="num">{product.ratings?.average?.toFixed(1) || '0.0'}</span>
                    <div className="stars-wrap">{renderStars(Math.round(product.ratings?.average || 0))}</div>
                    <span className="count">{product.ratings?.count || 0} reviews</span>
                  </div>
                </div>
                {user && (
                  <div className="review-form-card">
                    <h4>Write a review</h4>
                    <form onSubmit={handleSubmitReview}>
                      <div className="row rating-select">
                        <label>Rating</label>
                        {renderStars(reviewData.rating, true, (rating) => setReviewData({ ...reviewData, rating }))}
                      </div>
                      <div className="row textarea-row">
                        <label>Your review</label>
                        <textarea
                          value={reviewData.comment}
                          onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                          placeholder="Share your experience..."
                          maxLength={500}
                          required
                        />
                        <small>{500 - reviewData.comment.length} chars left</small>
                      </div>
                      <button type="submit" className="btn primary small" disabled={addReviewMutation.isLoading}>
                        {addReviewMutation.isLoading ? 'Submitting...' : 'Submit'}
                      </button>
                    </form>
                  </div>
                )}
                <div className="reviews-stream">
                  {product.reviews && product.reviews.length > 0 ? (
                    product.reviews.map((review, index) => (
                      <div key={index} className="r-item">
                        <div className="r-head">
                          <div className="who">
                            <span className="nm">{review.user?.name || review.user?.email || 'Anonymous'}</span>
                            <span className="dt">{new Date(review.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="stars-mini">{renderStars(review.rating)}</div>
                        </div>
                        {review.comment && <p className="txt">{review.comment}</p>}
                      </div>
                    ))
                  ) : (
                    <div className="no-reviews subtle">No reviews yet.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div className="related-products minimal-related">
            <h2 className="section-heading">Related Products</h2>
            <div className="related-grid">
              {relatedProducts.map(relatedProduct => (
                <div key={relatedProduct._id} className="rel-card" onClick={() => navigate(`/products/${relatedProduct._id}`)}>
                  <div className="img-wrap">
                    <img
                      src={relatedProduct.images?.[0]?.url || relatedProduct.images?.[0] || '/placeholder-product.jpg'}
                      alt={relatedProduct.name}
                      onError={(e) => { e.target.src = '/placeholder-product.jpg'; }}
                    />
                  </div>
                  <div className="rel-body">
                    <h3 className="t clamp-2">{relatedProduct.name}</h3>
                    <div className="rel-meta">
                      <span className="brand mini">{relatedProduct.brand}</span>
                      <span className="r">{renderStars(Math.round(relatedProduct.ratings?.average || 0))} <em>({relatedProduct.ratings?.count || 0})</em></span>
                    </div>
                    <div className="rel-price">
                      <span className="cur">${relatedProduct.price.toFixed(2)}</span>
                      {relatedProduct.originalPrice && relatedProduct.originalPrice > relatedProduct.price && (
                        <span className="orig">${relatedProduct.originalPrice.toFixed(2)}</span>
                      )}
                    </div>
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
