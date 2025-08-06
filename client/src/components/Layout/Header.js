import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import './Header.css';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            <h1>PC Builder</h1>
          </Link>

          <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
            <Link to="/" onClick={() => setIsMenuOpen(false)}>Home</Link>
            <Link to="/products" onClick={() => setIsMenuOpen(false)}>Products</Link>
            <Link to="/pc-builder" onClick={() => setIsMenuOpen(false)}>PC Builder</Link>
            <Link to="/community" onClick={() => setIsMenuOpen(false)}>Community</Link>
            <Link to="/contact" onClick={() => setIsMenuOpen(false)}>Contact</Link>
          </nav>

          <div className="header-actions">
            {isAuthenticated ? (
              <>
                <Link to="/cart" className="cart-link">
                  🛒
                  {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
                </Link>
                
                <div className="user-menu">
                  <button className="user-toggle">
                    👤 {user?.name}
                  </button>
                  <div className="user-dropdown">
                    <Link to="/profile">Profile</Link>
                    <Link to="/orders">My Orders</Link>
                    {user?.role === 'admin' && <Link to="/admin">Admin Panel</Link>}
                    <button onClick={handleLogout} className="logout-btn">Logout</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="auth-links">
                <Link to="/login" className="btn btn-outline-primary">Login</Link>
                <Link to="/register" className="btn btn-primary">Sign Up</Link>
              </div>
            )}

            <button className="mobile-menu-toggle" onClick={toggleMenu}>
              ☰
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
