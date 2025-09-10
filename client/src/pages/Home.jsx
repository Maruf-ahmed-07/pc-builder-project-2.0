import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useCart } from '../contexts/CartContext';
import './Home.css';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const { addToCart } = useCart();

  const { data: productsData, isLoading: productsLoading, isError: productsError } = useQuery({
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

      <section className="featured-products enhanced">
        <div className="container">
          <div className="section-header fancy">
            <div className="sh-left">
              <h2>Featured Products</h2>
              <p className="subtitle">Hand‑picked components trending this week</p>
            </div>
            <div className="sh-actions">
              <Link to="/products" className="btn btn-outline-primary">View All</Link>
            </div>
          </div>

          {productsError && (
            <div className="products-error">Failed to load products. <Link to="/products">Browse all</Link></div>
          )}

          {productsLoading && (
            <div className="products-skeleton">
              {Array.from({ length: 6 }).map((_,i)=>(
                <div key={i} className="skeleton-card">
                  <div className="sk-image" />
                  <div className="sk-lines">
                    <span className="sk-line w80" />
                    <span className="sk-line w60" />
                    <span className="sk-line w40" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!productsLoading && featuredProducts.length > 0 && (
            <>
              {/* Spotlight first product */}
              <div className="spotlight-wrapper">
                {featuredProducts[0] && (
                  <div className="spotlight-card">
                    <div className="spotlight-media">
                      {featuredProducts[0].images?.[0]?.url ? (
                        <img src={featuredProducts[0].images[0].url} alt={featuredProducts[0].name} />
                      ) : <div className="no-image big">📦</div>}
                      {featuredProducts[0].originalPrice && featuredProducts[0].originalPrice > featuredProducts[0].price && (
                        <span className="discount-badge big">-{Math.round(((featuredProducts[0].originalPrice - featuredProducts[0].price)/featuredProducts[0].originalPrice)*100)}%</span>
                      )}
                    </div>
                    <div className="spotlight-info">
                      <h3 className="spotlight-title">{featuredProducts[0].name}</h3>
                      <p className="spotlight-brand">{featuredProducts[0].brand}</p>
                      <div className="spotlight-prices">
                        <span className="price">${featuredProducts[0].price}</span>
                        {featuredProducts[0].originalPrice && featuredProducts[0].originalPrice > featuredProducts[0].price && (
                          <span className="original-price">${featuredProducts[0].originalPrice}</span>
                        )}
                      </div>
                      <div className="spotlight-actions">
                                <Link to={`/products/${featuredProducts[0]._id}`} className="btn btn-primary">View Details</Link>
                                <button className="btn btn-outline-primary" onClick={() => addToCart(featuredProducts[0]._id, 1, { silent: true })}>Quick Add</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="products-grid fancy-grid">
                {featuredProducts.slice(1).map((product) => {
                  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
                  const discountPct = hasDiscount ? Math.round(((product.originalPrice - product.price)/product.originalPrice)*100) : 0;
                  return (
                    <div key={product._id} className="product-card fancy">
                      <div className="card-inner">
                        <Link to={`/products/${product._id}`} className="cover-link" aria-label={`View ${product.name}`} />
                        <div className="product-image">
                          {product.images && product.images[0] ? (
                            <img src={product.images[0].url} alt={product.name} />
                          ) : (
                            <div className="no-image">📦</div>
                          )}
                          {hasDiscount && <span className="discount-badge">-{discountPct}%</span>}
                        </div>
                        <div className="product-info">
                          <h4 className="product-name" title={product.name}>{product.name}</h4>
                          <p className="product-brand">{product.brand}</p>
                          <div className="product-price">
                            <span className="price">${product.price}</span>
                            {hasDiscount && (
                              <span className="original-price">${product.originalPrice}</span>
                            )}
                          </div>
                          <div className="product-rating mini">
                            <span className="stars">⭐⭐⭐⭐⭐</span>
                            <span className="rating-text">{product.ratings?.count || 0}</span>
                          </div>
                        </div>
                        <div className="hover-actions">
                          <Link to={`/products/${product._id}`} className="ha-btn view">View</Link>
                          <button className="ha-btn add" onClick={(e) => { e.stopPropagation(); e.preventDefault(); addToCart(product._id, 1, { silent: true }); }}>Add</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {!productsLoading && featuredProducts.length === 0 && !productsError && (
            <div className="empty-state">No featured products available right now.</div>
          )}
        </div>
      </section>

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
