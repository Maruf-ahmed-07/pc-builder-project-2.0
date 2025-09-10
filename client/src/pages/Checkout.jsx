import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Checkout.css';

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  
  const [shippingAddress, setShippingAddress] = useState({
    fullName: 'John Doe',
    address: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA',
    phone: '(555) 123-4567'
  });
  
  const [billingAddress, setBillingAddress] = useState({
    fullName: 'John Doe',
    address: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA',
    phone: '(555) 123-4567'
  });
  
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '4532 1234 5678 9012',
    expiryDate: '12/28',
    cvv: '123',
    nameOnCard: 'John Doe'
  });
  
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [orderNotes, setOrderNotes] = useState('');

  // Redirect if cart is empty or user not logged in
  useEffect(() => {
    if (!user) {
      toast.error('Please login to proceed with checkout');
      navigate('/login');
      return;
    }
    
    if (!cartItems || cartItems.length === 0) {
      toast.error('Your cart is empty');
      navigate('/cart');
      return;
    }
  }, [user, cartItems, navigate]);

  // Sync billing address with shipping if same as shipping is checked
  useEffect(() => {
    if (sameAsShipping) {
      setBillingAddress({ ...shippingAddress });
    }
  }, [sameAsShipping, shippingAddress]);

  const handleShippingChange = (field, value) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleBillingChange = (field, value) => {
    setBillingAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleCardChange = (field, value) => {
    setCardDetails(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    // Validation removed - allow checkout with any values
    return true;
  };

  const calculateTotals = () => {
    const subtotal = getCartTotal();
    const tax = subtotal * 0.08; // 8% tax
    const shipping = subtotal > 100 ? 0 : 9.99; // Free shipping over $100
    const total = subtotal + tax + shipping;
    
    return { subtotal, tax, shipping, total };
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const { subtotal, tax, shipping, total } = calculateTotals();
      
      const orderData = {
        items: cartItems.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.product.discountPrice || item.product.price
        })),
        shippingAddress,
        billingAddress: sameAsShipping ? shippingAddress : billingAddress,
        paymentMethod,
        paymentDetails: paymentMethod === 'credit_card' ? {
          ...cardDetails,
          cardNumber: '****' + cardDetails.cardNumber.slice(-4) // Mask card number
        } : {},
        subtotal,
        tax,
        shipping,
        total,
        notes: orderNotes
      };

      const response = await axios.post('/api/orders', orderData);
      
      if (response.data.success) {
        toast.success('Order placed successfully!');
        clearCart();
        setOrderPlaced(true);
        
        // Redirect to order confirmation page after 2 seconds
        setTimeout(() => {
          navigate(`/orders/${response.data.order._id}`);
        }, 2000);
      }
    } catch (error) {
      console.error('Order placement error:', error);
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax, shipping, total } = calculateTotals();

  if (orderPlaced) {
    return (
      <div className="container">
        <div className="order-success">
          <div className="success-icon">✅</div>
          <h1>Order Placed Successfully!</h1>
          <p>Thank you for your purchase. You will be redirected to your order details shortly.</p>
        </div>
      </div>
    );
  }

  if (!cartItems || cartItems.length === 0) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container">
      <div className="checkout-page">
        <h1>Checkout</h1>
        
        <div className="checkout-content">
          <div className="checkout-form">
            <form onSubmit={handlePlaceOrder}>
              {/* Shipping Address */}
              <section className="checkout-section">
                <h2>Shipping Address</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={shippingAddress.fullName}
                      onChange={(e) => handleShippingChange('fullName', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={shippingAddress.phone}
                      onChange={(e) => handleShippingChange('phone', e.target.value)}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Address</label>
                    <input
                      type="text"
                      value={shippingAddress.address}
                      onChange={(e) => handleShippingChange('address', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      value={shippingAddress.city}
                      onChange={(e) => handleShippingChange('city', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      value={shippingAddress.state}
                      onChange={(e) => handleShippingChange('state', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>ZIP Code</label>
                    <input
                      type="text"
                      value={shippingAddress.zipCode}
                      onChange={(e) => handleShippingChange('zipCode', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <select
                      value={shippingAddress.country}
                      onChange={(e) => handleShippingChange('country', e.target.value)}
                    >
                      <option value="USA">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="UK">United Kingdom</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Billing Address */}
              <section className="checkout-section">
                <h2>Billing Address</h2>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={sameAsShipping}
                      onChange={(e) => setSameAsShipping(e.target.checked)}
                    />
                    Same as shipping address
                  </label>
                </div>
                
                {!sameAsShipping && (
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        value={billingAddress.fullName}
                        onChange={(e) => handleBillingChange('fullName', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        value={billingAddress.phone}
                        onChange={(e) => handleBillingChange('phone', e.target.value)}
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Address</label>
                      <input
                        type="text"
                        value={billingAddress.address}
                        onChange={(e) => handleBillingChange('address', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>City</label>
                      <input
                        type="text"
                        value={billingAddress.city}
                        onChange={(e) => handleBillingChange('city', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>State</label>
                      <input
                        type="text"
                        value={billingAddress.state}
                        onChange={(e) => handleBillingChange('state', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>ZIP Code</label>
                      <input
                        type="text"
                        value={billingAddress.zipCode}
                        onChange={(e) => handleBillingChange('zipCode', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Country</label>
                      <select
                        value={billingAddress.country}
                        onChange={(e) => handleBillingChange('country', e.target.value)}
                      >
                        <option value="USA">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="UK">United Kingdom</option>
                      </select>
                    </div>
                  </div>
                )}
              </section>

              {/* Payment Method */}
              <section className="checkout-section">
                <h2>Payment Method</h2>
                <div className="payment-methods">
                  <label className="payment-option">
                    <input
                      type="radio"
                      value="credit_card"
                      checked={paymentMethod === 'credit_card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <span>Credit/Debit Card</span>
                  </label>
                  <label className="payment-option">
                    <input
                      type="radio"
                      value="paypal"
                      checked={paymentMethod === 'paypal'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <span>PayPal</span>
                  </label>
                  <label className="payment-option">
                    <input
                      type="radio"
                      value="cash_on_delivery"
                      checked={paymentMethod === 'cash_on_delivery'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <span>Cash on Delivery</span>
                  </label>
                </div>

                {paymentMethod === 'credit_card' && (
                  <div className="card-details">
                    <div className="form-grid">
                      <div className="form-group full-width">
                        <label>Name on Card</label>
                        <input
                          type="text"
                          value={cardDetails.nameOnCard}
                          onChange={(e) => handleCardChange('nameOnCard', e.target.value)}
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Card Number</label>
                        <input
                          type="text"
                          value={cardDetails.cardNumber}
                          onChange={(e) => {
                            // Format card number with spaces
                            const value = e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                            if (value.replace(/\s/g, '').length <= 16) {
                              handleCardChange('cardNumber', value);
                            }
                          }}
                          placeholder="1234 5678 9012 3456"
                        />
                      </div>
                      <div className="form-group">
                        <label>Expiry Date</label>
                        <input
                          type="text"
                          value={cardDetails.expiryDate}
                          onChange={(e) => {
                            // Format MM/YY
                            let value = e.target.value.replace(/\D/g, '');
                            if (value.length >= 2) {
                              value = value.slice(0, 2) + '/' + value.slice(2, 4);
                            }
                            handleCardChange('expiryDate', value);
                          }}
                          placeholder="MM/YY"
                          maxLength="5"
                        />
                      </div>
                      <div className="form-group">
                        <label>CVV</label>
                        <input
                          type="text"
                          value={cardDetails.cvv}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value.length <= 4) {
                              handleCardChange('cvv', value);
                            }
                          }}
                          placeholder="123"
                          maxLength="4"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Order Notes */}
              <section className="checkout-section">
                <h2>Order Notes (Optional)</h2>
                <div className="form-group">
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Any special instructions for your order..."
                    rows="3"
                  />
                </div>
              </section>

              <button type="submit" className="place-order-btn" disabled={loading}>
                {loading ? 'Processing...' : `Place Order - $${total.toFixed(2)}`}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="order-summary">
            <h2>Order Summary</h2>
            
            <div className="cart-items">
              {cartItems.map(item => (
                <div key={item.product._id} className="cart-item">
                  <img 
                    src={item.product.images?.[0]?.url || '/placeholder-product.jpg'} 
                    alt={item.product.name}
                    onError={(e) => {
                      e.target.src = '/placeholder-product.jpg';
                    }}
                  />
                  <div className="item-details">
                    <h4>{item.product.name}</h4>
                    <p className="item-brand">{item.product.brand}</p>
                    <p className="item-quantity">Qty: {item.quantity}</p>
                  </div>
                  <div className="item-price">
                    ${((item.product.discountPrice || item.product.price) * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="order-totals">
              <div className="total-row">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="total-row">
                <span>Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="total-row total">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {subtotal > 100 && (
              <div className="free-shipping-notice">
                🎉 You qualify for free shipping!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
