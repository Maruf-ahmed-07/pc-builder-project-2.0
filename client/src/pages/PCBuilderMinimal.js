import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import './PCBuilderNew.css';

const PCBuilder = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  
  // Minimalist state management
  const [currentStep, setCurrentStep] = useState(0);
  const [build, setBuild] = useState({});
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBuildSummary, setShowBuildSummary] = useState(false);

  // Component steps with modern icons
  const buildSteps = [
    { key: 'cpu', name: 'Processor', icon: '⚡', category: 'CPU', emoji: '🧠' },
    { key: 'gpu', name: 'Graphics', icon: '🎮', category: 'Graphics Card', emoji: '🎨' },
    { key: 'motherboard', name: 'Motherboard', icon: '🔌', category: 'Motherboard', emoji: '🏗️' },
    { key: 'memory', name: 'Memory', icon: '💾', category: 'Memory', emoji: '🚀' },
    { key: 'storage', name: 'Storage', icon: '💿', category: 'Storage', emoji: '📚' },
    { key: 'psu', name: 'Power', icon: '⚡', category: 'Power Supply', emoji: '🔋' },
    { key: 'case', name: 'Case', icon: '📦', category: 'Case', emoji: '🏠' }
  ];

  const currentComponent = buildSteps[currentStep];

  // Fetch products for current step
  useEffect(() => {
    if (currentComponent) {
      fetchProducts(currentComponent.category);
    }
  }, [currentStep]);

  const fetchProducts = async (category) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`/api/products?category=${category}&limit=20`);
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
    setIsLoading(false);
  };

  const selectComponent = (product) => {
    setBuild(prev => ({
      ...prev,
      [currentComponent.key]: product
    }));
    
    toast.success(`${product.name} selected! 🎉`);
    
    // Auto-advance to next step
    if (currentStep < buildSteps.length - 1) {
      setTimeout(() => setCurrentStep(prev => prev + 1), 800);
    } else {
      setTimeout(() => setShowBuildSummary(true), 800);
    }
  };

  const goToStep = (stepIndex) => {
    setCurrentStep(stepIndex);
    setShowBuildSummary(false);
  };

  const getTotalPrice = () => {
    return Object.values(build).reduce((total, component) => {
      return total + (component?.discountPrice || component?.price || 0);
    }, 0);
  };

  const getPerformanceScore = () => {
    let score = 0;
    if (build.cpu) score += 30;
    if (build.gpu) score += 40;
    if (build.memory) score += 15;
    if (build.storage) score += 10;
    if (build.motherboard) score += 5;
    return Math.min(score + Math.random() * 20, 100);
  };

  const addBuildToCart = () => {
    const selectedComponents = Object.values(build).filter(Boolean);
    selectedComponents.forEach(component => {
      addToCart(component);
    });
    toast.success(`${selectedComponents.length} components added to cart! 🛒`);
  };

  if (showBuildSummary) {
    const selectedCount = Object.values(build).filter(Boolean).length;
    const performanceScore = getPerformanceScore();
    
    return (
      <div className="pc-builder-minimal">
        <div className="build-summary-container">
          <div className="summary-header">
            <h2>🎉 Your Build is Ready!</h2>
            <p>Here's what you've created</p>
          </div>

          <div className="build-stats">
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-value">${getTotalPrice().toFixed(2)}</div>
              <div className="stat-label">Total Price</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-value">{performanceScore.toFixed(0)}</div>
              <div className="stat-label">Performance Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔧</div>
              <div className="stat-value">{selectedCount}</div>
              <div className="stat-label">Components</div>
            </div>
          </div>

          <div className="build-components">
            {buildSteps.map((step, index) => {
              const component = build[step.key];
              return (
                <div 
                  key={step.key} 
                  className={`component-summary ${component ? 'selected' : 'empty'}`}
                  onClick={() => goToStep(index)}
                >
                  <div className="component-icon">{step.emoji}</div>
                  <div className="component-info">
                    <h4>{step.name}</h4>
                    {component ? (
                      <>
                        <p>{component.name}</p>
                        <span className="price">${(component.discountPrice || component.price).toFixed(2)}</span>
                      </>
                    ) : (
                      <p className="not-selected">Not selected</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="summary-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => setShowBuildSummary(false)}
            >
              Continue Building
            </button>
            <button 
              className="btn btn-primary"
              onClick={addBuildToCart}
              disabled={Object.keys(build).length === 0}
            >
              Add to Cart 🛒
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pc-builder-minimal">
      {/* Progress Header */}
      <div className="progress-header">
        <h1>Build Your Dream PC</h1>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentStep + 1) / buildSteps.length) * 100}%` }}
          ></div>
        </div>
        <p>Step {currentStep + 1} of {buildSteps.length}</p>
      </div>

      {/* Step Navigation */}
      <div className="step-navigation">
        {buildSteps.map((step, index) => (
          <div 
            key={step.key}
            className={`step-indicator ${index === currentStep ? 'active' : ''} ${build[step.key] ? 'completed' : ''}`}
            onClick={() => goToStep(index)}
          >
            <div className="step-icon">{step.emoji}</div>
            <span className="step-name">{step.name}</span>
            {build[step.key] && <div className="check-mark">✓</div>}
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      <div className="step-content">
        <div className="step-header">
          <h2>{currentComponent.emoji} Choose your {currentComponent.name}</h2>
          <p>Select the perfect {currentComponent.name.toLowerCase()} for your build</p>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <div className="loader"></div>
            <p>Loading {currentComponent.name} options...</p>
          </div>
        ) : (
          <div className="products-grid">
            {products.map(product => (
              <div 
                key={product._id} 
                className="product-card"
                onClick={() => selectComponent(product)}
              >
                <div className="product-image">
                  {product.images && product.images[0] ? (
                    <img src={product.images[0]} alt={product.name} />
                  ) : (
                    <div className="placeholder-image">{currentComponent.emoji}</div>
                  )}
                </div>
                
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="brand">{product.brand}</p>
                  
                  <div className="price-section">
                    {product.discountPrice ? (
                      <>
                        <span className="current-price">${product.discountPrice.toFixed(2)}</span>
                        <span className="original-price">${product.price.toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="current-price">${product.price.toFixed(2)}</span>
                    )}
                  </div>
                  
                  <div className="product-specs">
                    {product.specs && Object.entries(product.specs).slice(0, 2).map(([key, value]) => (
                      <span key={key} className="spec">{key}: {value}</span>
                    ))}
                  </div>
                </div>
                
                <div className="select-overlay">
                  <span>Select This</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {products.length === 0 && !isLoading && (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No products found</h3>
            <p>We couldn't find any {currentComponent.name.toLowerCase()} products.</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button 
          className="btn btn-outline"
          onClick={() => currentStep > 0 && setCurrentStep(prev => prev - 1)}
          disabled={currentStep === 0}
        >
          ← Previous
        </button>
        
        <button 
          className="btn btn-outline"
          onClick={() => setShowBuildSummary(true)}
          disabled={Object.keys(build).length === 0}
        >
          View Build Summary
        </button>
        
        <button 
          className="btn btn-outline"
          onClick={() => currentStep < buildSteps.length - 1 && setCurrentStep(prev => prev + 1)}
          disabled={currentStep === buildSteps.length - 1}
        >
          Skip →
        </button>
      </div>
    </div>
  );
};

export default PCBuilder;
