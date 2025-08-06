import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import './Home.css';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);

  // Fetch featured products
  const { data: productsData } = useQuery({
    queryKey: ['featuredProducts'],
    queryFn: async () => {
      const response = await axios.get('/api/products/featured/list?limit=8');
      return response.data;
    }
  });

  useEffect(() => {
    if (productsData?.products) {
      setFeaturedProducts(productsData.products);
    }
  }, [productsData]);

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1>Build Your Dream PC</h1>
              <p>
                Create the perfect custom PC with our expert PC builder tool. 
                Choose from thousands of compatible components and get real-time 
                compatibility checking and price calculations.
              </p>
              <div className="hero-actions">
                <Link to="/pc-builder" className="btn btn-primary btn-lg">
                  Start Building
                </Link>
                <Link to="/products" className="btn btn-outline-primary btn-lg">
                  Browse Parts
                </Link>
              </div>
            </div>
            <div className="hero-image">
              <div className="pc-showcase">
                <div className="pc-case">🖥️</div>
                <div className="components">
                  <div className="component cpu">🔧</div>
                  <div className="component gpu">🎮</div>
                  <div className="component ram">💾</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="text-center mb-5">Why Choose PC Builder?</h2>
          <div className="row">
            <div className="col-4">
              <div className="feature-card">
                <div className="feature-icon">🔧</div>
                <h3>Smart Compatibility</h3>
                <p>Our intelligent system ensures all your components work perfectly together, preventing costly mistakes.</p>
              </div>
            </div>
            <div className="col-4">
              <div className="feature-card">
                <div className="feature-icon">💰</div>
                <h3>Best Prices</h3>
                <p>Get competitive prices on all components with our price matching guarantee and exclusive deals.</p>
              </div>
            </div>
            <div className="col-4">
              <div className="feature-card">
                <div className="feature-icon">🚀</div>
                <h3>Expert Support</h3>
                <p>Get help from our PC building experts through live chat, guides, and comprehensive support.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="featured-products">
        <div className="container">
          <div className="section-header">
            <h2>Featured Products</h2>
            <Link to="/products" className="btn btn-outline-primary">View All Products</Link>
          </div>
          
          <div className="products-grid">
            {featuredProducts.map((product) => (
              <div key={product._id} className="product-card">
                <Link to={`/products/${product._id}`}>
                  <div className="product-image">
                    {product.images && product.images[0] ? (
                      <img src={product.images[0].url} alt={product.name} />
                    ) : (
                      <div className="no-image">📦</div>
                    )}
                  </div>
                  <div className="product-info">
                    <h4 className="product-name">{product.name}</h4>
                    <p className="product-brand">{product.brand}</p>
                    <div className="product-price">
                      <span className="price">${product.price}</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="original-price">${product.originalPrice}</span>
                      )}
                    </div>
                    <div className="product-rating">
                      <span className="stars">⭐⭐⭐⭐⭐</span>
                      <span className="rating-text">({product.ratings?.count || 0})</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Build Categories */}
      <section className="build-categories">
        <div className="container">
          <h2 className="text-center mb-5">Popular Build Types</h2>
          <div className="row">
            <div className="col-4">
              <div className="category-card">
                <div className="category-icon">🎮</div>
                <h3>Gaming PCs</h3>
                <p>High-performance gaming builds for 1080p, 1440p, and 4K gaming experiences.</p>
                <Link to="/pc-builder?purpose=Gaming" className="btn btn-primary">Build Gaming PC</Link>
              </div>
            </div>
            <div className="col-4">
              <div className="category-card">
                <div className="category-icon">💼</div>
                <h3>Workstations</h3>
                <p>Professional workstations for content creation, 3D rendering, and productivity tasks.</p>
                <Link to="/pc-builder?purpose=Workstation" className="btn btn-primary">Build Workstation</Link>
              </div>
            </div>
            <div className="col-4">
              <div className="category-card">
                <div className="category-icon">💰</div>
                <h3>Budget Builds</h3>
                <p>Affordable PC builds that deliver great performance without breaking the bank.</p>
                <Link to="/pc-builder?purpose=Budget" className="btn btn-primary">Build Budget PC</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Showcase */}
      <section className="community-showcase">
        <div className="container">
          <div className="section-header">
            <h2>Community Builds</h2>
            <Link to="/community" className="btn btn-outline-primary">View Community</Link>
          </div>
          
          <div className="community-content">
            <div className="community-stats">
              <div className="stat">
                <h3>10,000+</h3>
                <p>Builds Created</p>
              </div>
              <div className="stat">
                <h3>50,000+</h3>
                <p>Happy Builders</p>
              </div>
              <div className="stat">
                <h3>500+</h3>
                <p>Components</p>
              </div>
            </div>
            
            <div className="community-description">
              <h3>Join Our Community</h3>
              <p>
                Share your builds, get inspiration from others, and connect with fellow PC enthusiasts. 
                Our community is here to help you create the perfect PC for your needs.
              </p>
              <Link to="/community" className="btn btn-success">Explore Community</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="newsletter">
        <div className="container">
          <div className="newsletter-content">
            <h2>Stay Updated</h2>
            <p>Get the latest PC building tips, product reviews, and exclusive deals delivered to your inbox.</p>
            <div className="newsletter-form">
              <input 
                type="email" 
                placeholder="Enter your email address" 
                className="form-control"
              />
              <button className="btn btn-primary">Subscribe</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
