import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>PC Builder</h3>
            <p>Your ultimate destination for building custom PCs with the best components and expert guidance.</p>
            <div className="social-links">
              <a href="https://facebook.com" aria-label="Facebook" target="_blank" rel="noopener noreferrer">📘</a>
              <a href="https://twitter.com" aria-label="Twitter" target="_blank" rel="noopener noreferrer">🐦</a>
              <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noopener noreferrer">📷</a>
              <a href="https://youtube.com" aria-label="YouTube" target="_blank" rel="noopener noreferrer">📺</a>
            </div>
          </div>

          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/products">Products</Link></li>
              <li><Link to="/pc-builder">PC Builder</Link></li>
              <li><Link to="/community">Community</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Categories</h4>
            <ul>
              <li><Link to="/products?category=CPU">Processors</Link></li>
              <li><Link to="/products?category=GPU">Graphics Cards</Link></li>
              <li><Link to="/products?category=Motherboard">Motherboards</Link></li>
              <li><Link to="/products?category=RAM">Memory</Link></li>
              <li><Link to="/products?category=Storage">Storage</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li><Link to="/contact">Help Center</Link></li>
              <li><Link to="/contact">Shipping Info</Link></li>
              <li><Link to="/contact">Returns</Link></li>
              <li><Link to="/contact">Warranty</Link></li>
              <li><Link to="/contact">FAQ</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Newsletter</h4>
            <p>Subscribe to get updates on new products and exclusive deals.</p>
            <div className="newsletter-form">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="form-control"
              />
              <button className="btn btn-primary">Subscribe</button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p>&copy; 2024 PC Builder. All rights reserved.</p>
            <div className="footer-bottom-links">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
              <Link to="/sitemap">Sitemap</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
