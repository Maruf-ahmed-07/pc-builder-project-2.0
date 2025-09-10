import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import toast from 'react-hot-toast';
import './Wishlist.css';

const Wishlist = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const queryClient = useQueryClient();
  
  const [currentPage, setCurrentPage] = useState(1);

  // Redirect if not logged in
  React.useEffect(() => {
    if (!user) {
      toast.error('Please login to view your wishlist');
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch wishlist
  const { data: wishlistData, isLoading } = useQuery({
    queryKey: ['wishlist', currentPage],
    queryFn: async () => {
      const response = await axios.get(`/api/wishlist?page=${currentPage}&limit=12`);
      return response.data;
    },
    enabled: !!user
  });

  // Remove from wishlist mutation
  const removeFromWishlistMutation = useMutation({
    mutationFn: async (productId) => {
      const response = await axios.delete(`/api/wishlist/${productId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Removed from wishlist!');
      queryClient.invalidateQueries(['wishlist']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to remove from wishlist');
    }
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity = 1 }) => {
      const response = await axios.post('/api/cart', { productId, quantity });
      return response.data;
    },
    onSuccess: (data) => {
  // call context addToCart but suppress the generic toast since we show our own message
  addToCart(data.product, data.quantity, { silent: true });
  toast.success('Added to cart!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    }
  });

  const handleRemoveFromWishlist = (productId, productName) => {
    if (window.confirm(`Remove "${productName}" from your wishlist?`)) {
      removeFromWishlistMutation.mutate(productId);
    }
  };

  const handleAddToCart = (product) => {
    if (product.stock === 0) {
      toast.error('Product is out of stock');
      return;
    }
  addToCartMutation.mutate({ productId: product._id, quantity: 1 });
  };

  const handleMoveToCart = (product) => {
    if (product.stock === 0) {
      toast.error('Product is out of stock');
      return;
    }
    
    // Add to cart and remove from wishlist
    addToCartMutation.mutate(
      { productId: product._id, quantity: 1 },
      {
        onSuccess: () => {
          removeFromWishlistMutation.mutate(product._id);
        }
      }
    );
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (isLoading) {
    return (
      <div className="container">
        <div className="loading-spinner">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="wishlist-page">
        <div className="page-header">
          <h1>My Wishlist</h1>
          <p>Your saved items</p>
        </div>

        {!wishlistData?.items || wishlistData.items.length === 0 ? (
          <div className="empty-wishlist">
            <div className="empty-icon">💝</div>
            <h2>Your wishlist is empty</h2>
            <p>Start adding products you love to your wishlist!</p>
            <button 
              onClick={() => navigate('/products')}
              className="btn btn-primary"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <>
            <div className="wishlist-header">
              <div className="wishlist-stats">
                <span className="item-count">
                  {wishlistData.pagination.totalItems} item{wishlistData.pagination.totalItems !== 1 ? 's' : ''}
                </span>
                <div className="actions">
                  <button 
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear your entire wishlist?')) {
                        // Clear all wishlist items
                        wishlistData.items.forEach(item => {
                          removeFromWishlistMutation.mutate(item.product._id);
                        });
                      }
                    }}
                    className="btn btn-outline-danger"
                    disabled={removeFromWishlistMutation.isLoading}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            <div className="wishlist-grid">
              {wishlistData.items.map(item => (
                <div key={item._id} className="wishlist-card">
                  <div className="product-image">
                    <img 
                      src={item.product.images?.[0]?.url || '/placeholder-product.jpg'} 
                      alt={item.product.name}
                      onClick={() => navigate(`/products/${item.product._id}`)}
                      onError={(e) => {
                        e.target.src = '/placeholder-product.jpg';
                      }}
                    />
                    <button 
                      onClick={() => handleRemoveFromWishlist(item.product._id, item.product.name)}
                      className="remove-btn"
                      disabled={removeFromWishlistMutation.isLoading}
                    >
                      ×
                    </button>
                    {item.product.stock === 0 && (
                      <div className="out-of-stock-overlay">
                        <span>Out of Stock</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="product-info">
                    <h3 onClick={() => navigate(`/products/${item.product._id}`)}>
                      {item.product.name}
                    </h3>
                    <p className="brand">{item.product.brand}</p>
                    
                    <div className="price-section">
                      {item.product.originalPrice && item.product.originalPrice > item.product.price && (
                        <span className="original-price">
                          {formatPrice(item.product.originalPrice)}
                        </span>
                      )}
                      <span className="current-price">
                        {formatPrice(item.product.price)}
                      </span>
                      {item.product.originalPrice && item.product.originalPrice > item.product.price && (
                        <span className="discount">
                          {Math.round(((item.product.originalPrice - item.product.price) / item.product.originalPrice) * 100)}% OFF
                        </span>
                      )}
                    </div>

                    {item.product.rating && (
                      <div className="rating">
                        <div className="stars">
                          {[1, 2, 3, 4, 5].map(star => (
                            <span 
                              key={star}
                              className={`star ${star <= Math.round(item.product.rating.average) ? 'filled' : ''}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="rating-count">
                          ({item.product.rating.count})
                        </span>
                      </div>
                    )}

                    <div className="stock-info">
                      {item.product.stock > 0 ? (
                        <span className="in-stock">
                          {item.product.stock <= 10 ? `Only ${item.product.stock} left` : 'In Stock'}
                        </span>
                      ) : (
                        <span className="out-of-stock">Out of Stock</span>
                      )}
                    </div>

                    <div className="added-date">
                      Added on {new Date(item.addedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  
                  <div className="product-actions">
                    <button 
                      onClick={() => handleMoveToCart(item.product)}
                      className="btn btn-primary"
                      disabled={item.product.stock === 0 || addToCartMutation.isLoading}
                    >
                      {addToCartMutation.isLoading ? 'Adding...' : 'Move to Cart'}
                    </button>
                    <button 
                      onClick={() => handleAddToCart(item.product)}
                      className="btn btn-outline-primary"
                      disabled={item.product.stock === 0 || addToCartMutation.isLoading}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {wishlistData.pagination.totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn btn-outline-secondary"
                >
                  Previous
                </button>
                
                <div className="page-numbers">
                  {Array.from({ length: Math.min(5, wishlistData.pagination.totalPages) }, (_, i) => {
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, wishlistData.pagination.totalPages))}
                  disabled={currentPage === wishlistData.pagination.totalPages}
                  className="btn btn-outline-secondary"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
