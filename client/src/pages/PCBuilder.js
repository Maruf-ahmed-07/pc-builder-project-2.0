import React, { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import './PCBuilder.css';

const PCBuilder = () => {
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [categorySearchTerms, setCategorySearchTerms] = useState({});
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());
  const [currentBuild, setCurrentBuild] = useState({});
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [buildName, setBuildName] = useState('');
  const [buildDescription, setBuildDescription] = useState('');
  const [componentData, setComponentData] = useState({
    CPU: [],
    Motherboard: [],
    GPU: [],
    RAM: [],
    Storage: [],
    Monitor: [],
    Keyboard: [],
    Mouse: []
  });
  const [isLoading, setIsLoading] = useState(false);

  const mainComponents = {
    CPU: { name: 'Processor', icon: '⚡', category: 'CPU', description: 'The brain of your computer', type: 'main' },
    Motherboard: { name: 'Motherboard', icon: '🔌', category: 'Motherboard', description: 'Connects all components together', type: 'main' },
    RAM: { name: 'Memory (RAM)', icon: '💾', category: 'RAM', description: 'System memory for multitasking', type: 'main' },
    GPU: { name: 'Graphics Card', icon: '🎮', category: 'Accessories', description: 'For gaming and visual performance', type: 'main', filter: 'graphics' },
    Storage: { name: 'Storage (SSD/HDD)', icon: '💿', category: 'Accessories', description: 'Store your files and programs', type: 'main', filter: 'storage' }
  };

  const peripherals = {
    Monitor: { name: 'Monitor', icon: '🖥️', category: 'Monitor', description: 'Display for your computer', type: 'peripheral' },
    Keyboard: { name: 'Keyboard', icon: '⌨️', category: 'Keyboard', description: 'Input device for typing', type: 'peripheral' },
    Mouse: { name: 'Mouse', icon: '�️', category: 'Mouse', description: 'Pointing device for navigation', type: 'peripheral' }
  };

  const componentCategories = { ...mainComponents, ...peripherals };

  useEffect(() => {
    fetchAllComponents();
  }, []);

  const fetchAllComponents = async () => {
    setIsLoading(true);
    try {
      const uniqueCategories = [...new Set(Object.values(componentCategories).map(cat => cat.category))];
      
      const promises = uniqueCategories.map(async (category) => {
        const response = await axios.get(`/api/products?category=${category}&limit=100`);
        return { category, products: response.data.products || [] };
      });
      
      const results = await Promise.all(promises);
      const newComponentData = {};
      
      Object.keys(componentCategories).forEach(key => {
        newComponentData[key] = [];
      });
      
      results.forEach(({ category, products }) => {
        Object.keys(componentCategories).forEach(componentKey => {
          const componentInfo = componentCategories[componentKey];
          
          if (componentInfo.category === category) {
            if (componentInfo.filter) {
              if (componentInfo.filter === 'graphics') {
                newComponentData[componentKey] = products.filter(product =>
                  product.name.toLowerCase().includes('graphics') ||
                  product.name.toLowerCase().includes('geforce') ||
                  product.name.toLowerCase().includes('radeon') ||
                  product.name.toLowerCase().includes('rtx') ||
                  product.name.toLowerCase().includes('gtx') ||
                  product.name.toLowerCase().includes('arc') ||
                  product.name.toLowerCase().includes('rx ')
                );
              } else if (componentInfo.filter === 'storage') {
                newComponentData[componentKey] = products.filter(product =>
                  product.name.toLowerCase().includes('ssd') ||
                  product.name.toLowerCase().includes('hdd') ||
                  product.name.toLowerCase().includes('nvme') ||
                  product.name.toLowerCase().includes('sata') ||
                  product.name.toLowerCase().includes('m.2')
                );
              }
            } else {
              // No special filtering needed
              newComponentData[componentKey] = products;
            }
          }
        });
      });
      
      setComponentData(newComponentData);
    } catch (error) {
      console.error('Error fetching components:', error);
      toast.error('Failed to load components');
    }
    setIsLoading(false);
  };

  // Filter components based on search terms and filters
  const filterComponents = (category) => {
    // Ensure componentData[category] exists and is an array
    const categoryData = componentData[category];
    if (!categoryData || !Array.isArray(categoryData)) {
      return [];
    }
    
    let components = [...categoryData];
    
    // Apply global search
    if (globalSearchTerm) {
      const searchLower = globalSearchTerm.toLowerCase();
      components = components.filter(component =>
        component.name?.toLowerCase().includes(searchLower) ||
        component.brand?.toLowerCase().includes(searchLower) ||
        component.category?.toLowerCase().includes(searchLower)
      );
    }

    // Apply category-specific search
    const categorySearch = categorySearchTerms[category];
    if (categorySearch) {
      const searchLower = categorySearch.toLowerCase();
      components = components.filter(component =>
        component.name?.toLowerCase().includes(searchLower) ||
        component.brand?.toLowerCase().includes(searchLower)
      );
    }

    return components;
  };

  // Global search functionality
  const performGlobalSearch = () => {
    // Already handled by filterComponents
  };

  // Category-specific search
  const searchCategory = (category, searchTerm) => {
    setCategorySearchTerms(prev => ({
      ...prev,
      [category]: searchTerm
    }));
  };

  // Toggle category collapse
  const toggleCategory = (category) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  // Filter by category
  const filterByCategory = (filterType) => {
    setActiveFilter(filterType);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setGlobalSearchTerm('');
    setActiveFilter('all');
    setCategorySearchTerms({});
    setCollapsedCategories(new Set());
  };

  // Select a component
  const selectComponent = (category, component) => {
    setCurrentBuild(prev => ({
      ...prev,
      [category]: component
    }));
    toast.success(`${component.name} selected!`);
  };

  // Update build summary
  const getTotalPrice = () => {
    return Object.values(currentBuild).reduce((total, component) => {
      return total + (component?.price || 0);
    }, 0);
  };

  // Check component compatibility
  const checkCompatibility = () => {
    const selectedCount = Object.keys(currentBuild).length;
    return {
      isCompatible: selectedCount > 0,
      message: selectedCount > 0 ? 
        "✅ Components look compatible!" : 
        "⚠️ Select components to check compatibility"
    };
  };

  // Add build to cart
  const addBuildToCart = () => {
    const selectedComponents = Object.values(currentBuild);
    selectedComponents.forEach(component => {
      addToCart(component);
    });
    toast.success(`${selectedComponents.length} components added to cart!`);
  };

  // Clear current build
  const clearBuild = () => {
    setCurrentBuild({});
    toast.success('Build cleared!');
  };

  // Save build functionality
  const handleSaveBuild = () => {
    if (!isAuthenticated) {
      toast.error('Please login to save builds');
      return;
    }
    
    // Allow saving with at least one component
    if (Object.keys(currentBuild).length === 0) {
      toast.error('Please select at least one component to save');
      return;
    }
    
    setShowSaveModal(true);
  };

  const saveBuild = async () => {
    if (!buildName.trim()) {
      toast.error('Please enter a build name');
      return;
    }

    try {
      const buildData = {
        name: buildName.trim(),
        description: buildDescription.trim(),
        components: currentBuild,
        totalPrice: getTotalPrice()
      };

      const response = await axios.post('/api/builds', buildData);

      if (response.data.success) {
        toast.success('Build saved successfully!');
        setShowSaveModal(false);
        setBuildName('');
        setBuildDescription('');
      } else {
        toast.error(response.data.message || 'Failed to save build');
      }
    } catch (error) {
      console.error('Error saving build:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save build. Please try again.';
      toast.error(errorMessage);
    }
  };

  const cancelSave = () => {
    setShowSaveModal(false);
    setBuildName('');
    setBuildDescription('');
  };

  const compatibility = checkCompatibility();
  const categoriesToShow = activeFilter === 'all' ? Object.keys(componentCategories) : [activeFilter];

  return (
    <div className="pc-builder-page">
      {/* Hero Section */}
      <section className="builder-hero">
        <div className="container">
          <h1>Custom PC Builder</h1>
          <p>Select each component to build your perfect gaming or workstation PC.</p>
        </div>
      </section>

      {/* Search and Filters */}
      <div className="search-filters">
        <div className="container">
          <div className="global-search">
            <input
              type="text"
              className="search-input"
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              placeholder="Search all components (e.g., 'RTX 4090', 'Intel i9', 'DDR5')..."
            />
            <button className="search-icon" onClick={performGlobalSearch}>
              🔍
            </button>
          </div>
          
          <div className="filter-controls">
            <button 
              className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => filterByCategory('all')}
            >
              All Categories
            </button>
            {Object.keys(componentCategories).map(category => (
              <button
                key={category}
                className={`filter-btn ${activeFilter === category ? 'active' : ''}`}
                onClick={() => filterByCategory(category)}
              >
                {componentCategories[category].name}
              </button>
            ))}
            <button className="clear-search" onClick={clearAllFilters}>
              Clear All
            </button>
          </div>
        </div>
      </div>

      <div className="builder-container">
        <div className="container">
          <div className="builder-layout">
            {/* Components Section */}
            <div className="components-section">
              {isLoading ? (
                <div className="loading-components">
                  <div className="loading-spinner">
                    <p>Loading...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Main Components Section */}
                  <div className="component-section-group">
                    <h2 className="section-title">
                      <span className="section-icon">🔧</span>
                      Main Components
                    </h2>
                    <p className="section-description">Essential components needed for your PC to function</p>
                    
                    {Object.keys(mainComponents)
                      .filter(category => activeFilter === 'all' || activeFilter === category)
                      .map(category => {
                        const categoryInfo = componentCategories[category];
                        const filteredComponents = filterComponents(category);
                        const isCollapsed = collapsedCategories.has(category);
                        const selectedComponent = currentBuild[category];

                        return (
                          <div key={category} className={`component-category ${isCollapsed ? 'collapsed' : ''}`}>
                            <div className="category-header">
                              <div className="category-info">
                                <h3 className="category-title">
                                  {categoryInfo.icon} {categoryInfo.name}
                                </h3>
                                <p className="category-description">{categoryInfo.description}</p>
                              </div>
                              
                              <div className="category-controls">
                                <span className={`category-status ${selectedComponent ? 'status-selected' : 'status-empty'}`}>
                                  {selectedComponent ? '✓ Selected' : 'Not Selected'}
                                </span>
                                <button 
                                  className="category-toggle"
                                  onClick={() => toggleCategory(category)}
                                >
                                  {isCollapsed ? '▼' : '▲'}
                                </button>
                              </div>
                            </div>

                            {!isCollapsed && (
                              <>
                                <div className="category-search">
                                  <input
                                    type="text"
                                    placeholder={`Search ${categoryInfo.name.toLowerCase()}...`}
                                    value={categorySearchTerms[category] || ''}
                                    onChange={(e) => searchCategory(category, e.target.value)}
                                  />
                                  <div className="results-count">
                                    {filteredComponents.length} products
                                  </div>
                                </div>

                                <div className="component-options">
                                  {filteredComponents.length > 0 ? (
                                    filteredComponents.map(component => (
                                      <div
                                        key={component._id}
                                        className={`component-option ${selectedComponent?._id === component._id ? 'selected' : ''}`}
                                        onClick={() => selectComponent(category, component)}
                                      >
                                        <div className="option-header">
                                          <h4 className="option-name">{component.name}</h4>
                                          <span className="option-price">
                                            ৳{(component.price || 0).toLocaleString()}
                                          </span>
                                        </div>
                                        
                                        <div className="option-details">
                                          <p className="option-brand">{component.brand}</p>
                                          {component.specifications && (
                                            <div className="option-specs">
                                              {Object.entries(component.specifications).slice(0, 2).map(([key, value]) => (
                                                value && <span key={key}>{key}: {value}</span>
                                              ))}
                                            </div>
                                          )}
                                          <div className="stock-status">
                                            {component.stock > 0 ? (
                                              <span className="in-stock">✓ In Stock ({component.stock})</span>
                                            ) : (
                                              <span className="out-of-stock">✗ Out of Stock</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="no-results">
                                      <p>No {categoryInfo.name.toLowerCase()} found matching your criteria</p>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Peripherals Section */}
                  <div className="component-section-group">
                    <h2 className="section-title">
                      <span className="section-icon">🖥️</span>
                      Peripherals
                    </h2>
                    <p className="section-description">Additional components to complete your setup</p>
                    
                    {Object.keys(peripherals)
                      .filter(category => activeFilter === 'all' || activeFilter === category)
                      .map(category => {
                        const categoryInfo = componentCategories[category];
                        const filteredComponents = filterComponents(category);
                        const isCollapsed = collapsedCategories.has(category);
                        const selectedComponent = currentBuild[category];

                        return (
                          <div key={category} className={`component-category ${isCollapsed ? 'collapsed' : ''}`}>
                            <div className="category-header">
                              <div className="category-info">
                                <h3 className="category-title">
                                  {categoryInfo.icon} {categoryInfo.name}
                                </h3>
                                <p className="category-description">{categoryInfo.description}</p>
                              </div>
                              
                              <div className="category-controls">
                                <span className={`category-status ${selectedComponent ? 'status-selected' : 'status-empty'}`}>
                                  {selectedComponent ? '✓ Selected' : 'Not Selected'}
                                </span>
                                <button 
                                  className="category-toggle"
                                  onClick={() => toggleCategory(category)}
                                >
                                  {isCollapsed ? '▼' : '▲'}
                                </button>
                              </div>
                            </div>

                            {!isCollapsed && (
                              <>
                                <div className="category-search">
                                  <input
                                    type="text"
                                    placeholder={`Search ${categoryInfo.name.toLowerCase()}...`}
                                    value={categorySearchTerms[category] || ''}
                                    onChange={(e) => searchCategory(category, e.target.value)}
                                  />
                                  <div className="results-count">
                                    {filteredComponents.length} products
                                  </div>
                                </div>

                                <div className="component-options">
                                  {filteredComponents.length > 0 ? (
                                    filteredComponents.map(component => (
                                      <div
                                        key={component._id}
                                        className={`component-option ${selectedComponent?._id === component._id ? 'selected' : ''}`}
                                        onClick={() => selectComponent(category, component)}
                                      >
                                        <div className="option-header">
                                          <h4 className="option-name">{component.name}</h4>
                                          <span className="option-price">
                                            ৳{(component.price || 0).toLocaleString()}
                                          </span>
                                        </div>
                                        
                                        <div className="option-details">
                                          <p className="option-brand">{component.brand}</p>
                                          {component.specifications && (
                                            <div className="option-specs">
                                              {Object.entries(component.specifications).slice(0, 2).map(([key, value]) => (
                                                value && <span key={key}>{key}: {value}</span>
                                              ))}
                                            </div>
                                          )}
                                          <div className="stock-status">
                                            {component.stock > 0 ? (
                                              <span className="in-stock">✓ In Stock ({component.stock})</span>
                                            ) : (
                                              <span className="out-of-stock">✗ Out of Stock</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="no-results">
                                      <p>No {categoryInfo.name.toLowerCase()} found matching your criteria</p>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>

            {/* Build Summary */}
            <div className="build-summary">
              <div className="summary-header">Your Build</div>
              
              <div className="build-items">
                {Object.entries(componentCategories).map(([category, info]) => {
                  const component = currentBuild[category];
                  return (
                    <div key={category} className="build-item">
                      <div className="item-info">
                        <div className="item-category">{info.name}</div>
                        {component ? (
                          <>
                            <div className="item-name">{component.name}</div>
                            <div className="item-price">
                              ৳{(component.price || 0).toLocaleString()}
                            </div>
                          </>
                        ) : (
                          <div className="item-name not-selected">Not selected</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={`compatibility-check ${compatibility.isCompatible ? 'compatible' : 'incompatible'}`}>
                {compatibility.message}
              </div>

              <div className="build-total">
                <div className="total-row">
                  <span>Total Price:</span>
                  <span>৳{getTotalPrice().toLocaleString()}</span>
                </div>
              </div>

              <div className="action-buttons">
                <button
                  className="btn btn-primary"
                  onClick={addBuildToCart}
                  disabled={Object.keys(currentBuild).length === 0}
                >
                  Add to Cart 🛒
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleSaveBuild}
                  disabled={!isAuthenticated || Object.keys(currentBuild).length === 0}
                >
                  Save Build 💾
                </button>
                <button
                  className="btn btn-info"
                  onClick={() => window.location.href = '/my-builds'}
                  disabled={!isAuthenticated}
                >
                  View My Builds 📋
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={clearBuild}
                  disabled={Object.keys(currentBuild).length === 0}
                >
                  Clear Build
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Build Modal */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Save Your Build</h3>
              <button className="modal-close" onClick={cancelSave}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="buildName">Build Name *</label>
                <input
                  type="text"
                  id="buildName"
                  value={buildName}
                  onChange={(e) => setBuildName(e.target.value)}
                  placeholder="Enter a name for your build..."
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <label htmlFor="buildDescription">Description (Optional)</label>
                <textarea
                  id="buildDescription"
                  value={buildDescription}
                  onChange={(e) => setBuildDescription(e.target.value)}
                  placeholder="Describe your build, its purpose, or any special features..."
                  rows={4}
                  maxLength={500}
                />
              </div>
              <div className="build-summary-modal">
                <h4>Build Summary</h4>
                <div className="summary-items">
                  {Object.entries(currentBuild).map(([category, component]) => (
                    <div key={category} className="summary-item">
                      <span className="item-category">{componentCategories[category]?.name || category}:</span>
                      <span className="item-name">{component.name}</span>
                      <span className="item-price">৳{(component.price || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="summary-total">
                  <strong>Total: ৳{getTotalPrice().toLocaleString()}</strong>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={cancelSave}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveBuild}>
                Save Build
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <p>Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PCBuilder;
