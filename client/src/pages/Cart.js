import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Cart.css';

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart, addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleQuantityChange = async (productId, newQuantity) => {
    try {
      if (newQuantity < 1) {
        // if quantity is decreased below 1, remove the item from cart
        await handleRemoveItem(productId);
        return;
      }

      await updateQuantity(productId, newQuantity);
    } catch (error) {
      toast.error('Failed to update quantity');
    }
  };

  const handleRemoveItem = async (productId) => {
    try {
      await removeFromCart(productId);
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      try {
        await clearCart();
        toast.success('Cart cleared');
      } catch (error) {
        toast.error('Failed to clear cart');
      }
    }
  };

  const handleCheckout = () => {
    if (!user) {
      toast.error('Please login to checkout');
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }
    navigate('/checkout');
  };

  const subtotal = getCartTotal();
  const shipping = subtotal > 100 ? 0 : 10;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <div className="empty-cart">
            <div className="empty-cart-icon">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Looks like you haven't added any items to your cart yet.</p>
            <div className="empty-cart-actions">
              <Link to="/products" className="btn btn-primary btn-lg">
                Continue Shopping
              </Link>
              <Link to="/pc-builder" className="btn btn-outline-primary btn-lg">
                Start Building PC
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <div className="page-header">
          <h1>Shopping Cart</h1>
          <div className="cart-actions">
            <button onClick={handleClearCart} className="btn btn-outline-danger">
              Clear Cart
            </button>
            <Link to="/products" className="btn btn-outline-primary">
              Continue Shopping
            </Link>
          </div>
        </div>

        <div className="cart-layout">
          {/* Cart Items */}
          <div className="cart-items">
            <div className="cart-header">
              <h3>Items in Cart ({cartItems.length})</h3>
            </div>

            <div className="cart-list">
              {cartItems.map((item) => (
                <div key={item.product._id} className="cart-item">
                  <div className="item-image">
                    <Link to={`/products/${item.product._id}`}>
                      {item.product.images && item.product.images[0] ? (
                        <img 
                          src={item.product.images[0].url} 
                          alt={item.product.name} 
                        />
                      ) : (
                        <div className="no-image">📦</div>
                      )}
                    </Link>
                  </div>

                  <div className="item-details">
                    <Link 
                      to={`/products/${item.product._id}`}
                      className="item-name"
                    >
                      {item.product.name}
                    </Link>
                    <p className="item-brand">{item.product.brand}</p>
                    <p className="item-category">{item.product.category}</p>
                    
                    {item.product.stock < 5 && (
                      <div className="stock-warning">
                        Only {item.product.stock} left in stock
                      </div>
                    )}
                  </div>

                  <div className="item-quantity">
                    <label>Quantity</label>
                    <div className="quantity-controls">
                      <button
                        onClick={() => handleQuantityChange(item.product._id, item.quantity - 1)}
                        className="quantity-btn"
                        title={item.quantity <= 1 ? 'Click to remove item' : 'Decrease quantity'}
                      >
                        -
                      </button>
                      <span className="quantity-value">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.product._id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="quantity-btn"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="item-price">
                    <div className="unit-price">${item.product.price}</div>
                    <div className="total-price">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </div>
                  </div>

                  <div className="item-actions">
                    <button
                      onClick={() => handleRemoveItem(item.product._id)}
                      className="remove-btn"
                      title="Remove from cart"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart Summary */}
          <div className="cart-summary">
            <div className="summary-card">
              <h3>Order Summary</h3>
              
              <div className="summary-row">
                <span>Subtotal ({cartItems.length} items)</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              
              <div className="summary-row">
                <span>Shipping</span>
                <span>
                  {shipping === 0 ? (
                    <span className="free-shipping">FREE</span>
                  ) : (
                    `$${shipping.toFixed(2)}`
                  )}
                </span>
              </div>
              
              <div className="summary-row">
                <span>Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              
              <div className="summary-divider"></div>
              
              <div className="summary-row total">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>

              {shipping > 0 && (
                <div className="shipping-notice">
                  Add ${(100 - subtotal).toFixed(2)} more for FREE shipping
                </div>
              )}

              <button
                onClick={handleCheckout}
                className="btn btn-primary btn-block btn-lg checkout-btn"
              >
                Proceed to Checkout
              </button>

              <div className="payment-methods">
                <p>We accept:</p>
                <div className="payment-icons">
                  <span>💳</span>
                  <span>🏦</span>
                  <span>📱</span>
                </div>
              </div>
            </div>

            {/* Promo Code */}
            <div className="promo-card">
              <h4>Have a promo code?</h4>
              <div className="promo-input">
                <input
                  type="text"
                  placeholder="Enter promo code"
                  className="form-control"
                />
                <button className="btn btn-outline-primary">Apply</button>
              </div>
            </div>

            {/* Related Products */}
            <RelatedProductsCard addToCart={addToCart} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;

// Related products card shown on cart page
function RelatedProductsCard({ addToCart }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['recommended-products'],
    queryFn: async () => {
      // Simple recommendation: fetch featured or bestselling products
      const res = await axios.get('/api/products/featured/list?limit=6');
      return res.data.products || [];
    }
  });

  const products = data || [];

  const handleAdd = async (product) => {
    try {
      // suppress generic cart toast and show product-specific toast
      await addToCart(product._id, 1, { silent: true });
      // show product toast
      toast.success(`${product.name} added to cart!`);
    } catch (e) {
      toast.error('Failed to add item');
    }
  };

  return (
    <div className="related-card">
      <h4>You might also like</h4>
      <div className="related-items refined">
        {isLoading && <div>Loading recommendations…</div>}
        {isError && <div>Failed to load recommendations</div>}
        {!isLoading && !isError && products.map(p => (
          <div key={p._id} className="related-item">
            <div className="related-image">
              {p.images && p.images[0] ? <img src={p.images[0].url} alt={p.name} /> : <div className="no-image">📦</div>}
            </div>
            <div className="related-info">
              <p className="r-name">{p.name}</p>
              <span className="r-price">${p.price.toFixed(2)}</span>
            </div>
            <button className="related-add" onClick={() => handleAdd(p)} title={`Add ${p.name} to cart`}>
              ➕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
