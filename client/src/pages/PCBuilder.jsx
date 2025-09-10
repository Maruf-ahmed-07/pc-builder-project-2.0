import React, { useState, useEffect, useCallback } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import './PCBuilder.css';

const PCBuilder = () => {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  
  // Removed global search (per-category search only now)
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
  // Benchmark state
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [benchmarkError, setBenchmarkError] = useState('');
  const [compatLoading, setCompatLoading] = useState(false);
  const [compatResult, setCompatResult] = useState(null); // { isCompatible, issues:[], warnings:[] }

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

  const fetchAllComponents = useCallback(async () => {
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
  }, [componentCategories]);

  useEffect(() => {
    fetchAllComponents();
  }, [fetchAllComponents]);

  // Filter components based on search terms and filters
  const filterComponents = (category) => {
    // Ensure componentData[category] exists and is an array
    const categoryData = componentData[category];
    if (!categoryData || !Array.isArray(categoryData)) {
      return [];
    }
    
    let components = [...categoryData];
    

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

  // (Global search removed)

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
    toast.success(`${component.name} selected`);
  };

  // Remove a selected component
  const removeComponent = (category) => {
    setCurrentBuild(prev => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  };

  // Update build summary
  const getTotalPrice = () => {
    return Object.values(currentBuild).reduce((total, component) => {
      return total + (component?.price || 0);
    }, 0);
  };

  // Helper parsers for compatibility logic
  const parseNumber = (val) => {
    if (val == null) return null;
    if (typeof val === 'number') return val;
    const m = ('' + val).match(/([0-9]+(?:\.[0-9]+)?)/);
    return m ? parseFloat(m[1]) : null;
  };
  const parseCapacityGB = (val) => {
    if (!val) return null;
    const s = ('' + val).toLowerCase();
    let m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*tb/); if (m) return parseFloat(m[1]) * 1024;
    m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*gb/); if (m) return parseFloat(m[1]);
    m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*mb/); if (m) return parseFloat(m[1]) / 1024;
    return parseNumber(s);
  };
  const extractSocket = (p) => {
    if (!p) return null;
    const spec = p.specifications || {};
    const ds = p.detailedSpecs || {};
    const cpu = ds.cpu || {}; const mb = ds.motherboard || {};
    return spec.socket || cpu.socket || mb.socket || null;
  };
  const extractMemoryType = (p) => {
    if (!p) return null;
    const spec = p.specifications || {};
    const raw = spec.memoryType || spec.memory || '';
    if (/ddr5/i.test(raw) || /ddr5/i.test(p.name)) return 'DDR5';
    if (/ddr4/i.test(raw) || /ddr4/i.test(p.name)) return 'DDR4';
    if (/ddr3/i.test(raw) || /ddr3/i.test(p.name)) return 'DDR3';
    return raw || null;
  };
  const extractMaxMemory = (p) => {
    if (!p) return null;
    const spec = p.specifications || {};
    return parseCapacityGB(spec.maxMemory || spec.memorySupport || spec.memory_capacity);
  };
  const extractRamCapacity = (p) => {
    if (!p) return null;
    const spec = p.specifications || {};
    return parseCapacityGB(spec.totalCapacity || spec.capacity || spec.memorySize || spec.memory);
  };
  const computeFrontEndCompatibility = () => {
    const issues = [];
    const warnings = [];
    const cpu = currentBuild['CPU'];
    const motherboard = currentBuild['Motherboard'];
    const ram = currentBuild['RAM'];
    if (cpu && motherboard) {
      const cpuSocket = extractSocket(cpu);
      const mbSocket = extractSocket(motherboard);
      if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
        issues.push(`CPU socket (${cpuSocket}) does not match motherboard socket (${mbSocket})`);
      }
    }
    if (ram && motherboard) {
      const ramType = extractMemoryType(ram);
      const mbType = extractMemoryType(motherboard);
      if (ramType && mbType && ramType !== mbType) {
        issues.push(`RAM type (${ramType}) differs from motherboard type (${mbType})`);
      }
      const ramCap = extractRamCapacity(ram);
      const mbMax = extractMaxMemory(motherboard);
      if (ramCap && mbMax && ramCap > mbMax) {
        issues.push(`RAM capacity (${ramCap}GB) exceeds motherboard max (${mbMax}GB)`);
      }
    }
    // Simple warning: missing key components
    if (!cpu) warnings.push('CPU not selected');
    if (!motherboard) warnings.push('Motherboard not selected');
    if (!ram) warnings.push('RAM not selected');
    return {
      isCompatible: issues.length === 0 && Object.keys(currentBuild).length > 0,
      issues,
      warnings
    };
  };

  const runCompatibilityCheck = async () => {
    // Combine frontend heuristic with backend endpoint (if desired later). For now run frontend only.
    setCompatLoading(true);
    try {
      const local = computeFrontEndCompatibility();
      setCompatResult(local);
    } finally {
      setCompatLoading(false);
    }
  };

  // Add build to cart
  const addBuildToCart = () => {
    const selectedComponents = Object.values(currentBuild);
    selectedComponents.forEach(component => {
      addToCart(component, 1, { silent: true });
    });
    toast.success(`${selectedComponents.length} components added to cart!`);
  };

  // Clear current build
  const clearBuild = () => {
    setCurrentBuild({});
  // previously cleared benchmark state (removed)
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

  const compatibility = compatResult || { isCompatible: false, issues: [], warnings: [], message: 'Run compatibility check' };
  // categoriesToShow removed (unused)

  const computeBenchmark = async () => {
    if (Object.keys(currentBuild).length === 0) {
      toast.error('Select components first');
      return;
    }
    setBenchmarkLoading(true);
    setBenchmarkError('');
    setBenchmarkResult(null);
    try {
      const compMap = {};
      const keyMap = { CPU: 'cpu', GPU: 'gpu', Motherboard: 'motherboard', RAM: 'ram', Storage: 'storage' };
      Object.entries(currentBuild).forEach(([k, v]) => {
        const mapped = keyMap[k];
        if (mapped && v?._id) compMap[mapped] = { product: v._id };
      });
      if (Object.keys(compMap).length === 0) {
        toast.error('No benchmark-relevant components (CPU/GPU/RAM/Storage/Motherboard) selected');
        setBenchmarkLoading(false);
        return;
      }
      const res = await axios.post('/api/benchmark/score', { components: compMap });
      if (res.data.success) {
        setBenchmarkResult(res.data);
      } else {
        setBenchmarkError(res.data.message || 'Failed to compute score');
      }
    } catch (e) {
      console.error('Benchmark error', e);
      setBenchmarkError(e.response?.data?.message || 'Error computing benchmark');
    }
    setBenchmarkLoading(false);
  };

  return (
  <div className="pc-builder-page pcb-new">
      {/* Hero Section */}
      <section className="builder-hero">
        <div className="container">
          <h1>Custom PC Builder</h1>
          <p>Select each component to build your perfect gaming or workstation PC.</p>
        </div>
      </section>

      {/* Top Filters (global search removed) */}
      <div className="search-filters">
        <div className="container">
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
          <div className="builder-layout enhanced-layout">
            {/* Components Section */}
            <div className="components-section component-browser" aria-label="Component selection area">
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
                          <div id={`cat-${category}`} key={category} className={`component-category ${isCollapsed ? 'collapsed' : ''}`}>
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
                                        className={`component-option card-tile ${selectedComponent?._id === component._id ? 'selected' : ''}`}
                                        onClick={() => selectComponent(category, component)}
                                      >
                                        <div className="tile-head">
                                          <h4 className="option-name clamp-2">{component.name}</h4>
                                          <span className="option-price">৳{(component.price || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="tile-meta">
                                          <span className="brand-tag">{component.brand}</span>
                                          {component.specifications && (
                                            <div className="spec-tags">
                                              {Object.entries(component.specifications).slice(0, 3).map(([key, value]) => (
                                                value && <span className="spec-pill" key={key}>{key}: {String(value).toString().slice(0,30)}</span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <div className="tile-footer">
                                          {component.stock > 0 ? (
                                            <span className="stock-ok">In Stock • {component.stock}</span>
                                          ) : (
                                            <span className="stock-bad">Out of Stock</span>
                                          )}
                                          {selectedComponent?._id === component._id && <span className="selected-badge">Selected</span>}
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
                          <div id={`cat-${category}`} key={category} className={`component-category ${isCollapsed ? 'collapsed' : ''}`}>
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
                                        className={`component-option card-tile ${selectedComponent?._id === component._id ? 'selected' : ''}`}
                                        onClick={() => selectComponent(category, component)}
                                      >
                                        <div className="tile-head">
                                          <h4 className="option-name clamp-2">{component.name}</h4>
                                          <span className="option-price">৳{(component.price || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="tile-meta">
                                          <span className="brand-tag">{component.brand}</span>
                                          {component.specifications && (
                                            <div className="spec-tags">
                                              {Object.entries(component.specifications).slice(0, 3).map(([key, value]) => (
                                                value && <span className="spec-pill" key={key}>{key}: {String(value).toString().slice(0,30)}</span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <div className="tile-footer">
                                          {component.stock > 0 ? (
                                            <span className="stock-ok">In Stock • {component.stock}</span>
                                          ) : (
                                            <span className="stock-bad">Out of Stock</span>
                                          )}
                                          {selectedComponent?._id === component._id && <span className="selected-badge">Selected</span>}
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
            <div className="build-summary build-summary-panel" aria-label="Current build summary">
              <div className="summary-header">Your Build</div>
              
              <div className="build-items build-items-list">
                {Object.entries(componentCategories).map(([category, info]) => {
                  const component = currentBuild[category];
                  return (
                    <div key={category} className={`build-item row-line ${component ? 'has-component' : 'empty'}`}>
                      <div className="item-left">
                        <a href={`#cat-${category}`} className="item-category-link">{info.icon || ''}</a>
                      </div>
                      <div className="item-mid">
                        <div className="item-category-label">{info.name}</div>
                        {component ? <div className="item-name clamp-1" title={component.name}>{component.name}</div> : <div className="item-name not-selected">Not selected</div>}
                      </div>
                      <div className="item-right">
                        {component && <div className="item-price">৳{(component.price || 0).toLocaleString()}</div>}
                        {component && <button className="remove-mini" onClick={() => removeComponent(category)} aria-label={`Remove ${info.name}`}>✕</button>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={`compatibility-check ${compatibility.isCompatible ? 'compatible' : 'incompatible'}`} style={{marginBottom:'8px'}}>
                {compatibility.isCompatible ? '✅ Compatible' : '⚠️ Compatibility issues/warnings'}
              </div>
              <div style={{marginBottom:'10px'}}>
                <button className="btn btn-outline" onClick={runCompatibilityCheck} disabled={compatLoading || Object.keys(currentBuild).length===0}>
                  {compatLoading ? 'Checking...' : 'Check Compatibility 🔍'}
                </button>
              </div>
              {compatResult && (
                <div className="compat-details" style={{background:'#1c2430', padding:'8px 10px', borderRadius:'6px', fontSize:'0.75rem'}}>
                  {compatResult.issues.length === 0 && <div style={{color:'#4caf50'}}>No critical issues detected.</div>}
                  {compatResult.issues.length > 0 && (
                    <div style={{marginBottom:'6px'}}>
                      <strong>Issues:</strong>
                      <ul style={{margin:'4px 0 0 16px'}}>
                        {compatResult.issues.map(i => <li key={i} style={{color:'#ff5252'}}>{i}</li>)}
                      </ul>
                    </div>
                  )}
                  {compatResult.warnings.length > 0 && (
                    <div>
                      <strong>Warnings:</strong>
                      <ul style={{margin:'4px 0 0 16px'}}>
                        {compatResult.warnings.map(w => <li key={w} style={{color:'#ffc107'}}>{w}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

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

              {/* Benchmark moved below buttons */}
              <div className="benchmark-panel" style={{marginTop:'12px'}}>
                <button className="btn btn-warning" style={{width:'100%', marginBottom:'8px'}} onClick={computeBenchmark} disabled={benchmarkLoading || Object.keys(currentBuild).length===0}>
                  {benchmarkLoading ? 'Scoring...' : 'Compute Benchmark ⚙️'}
                </button>
                {benchmarkError && (
                  <div className="benchmark-error" style={{color:'#c00', marginTop:'4px', fontSize:'0.75rem'}}>{benchmarkError}</div>
                )}
                {benchmarkResult && (
                  <div className="benchmark-result" style={{marginTop:'6px', background:'#101820', padding:'10px', borderRadius:'6px'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <strong style={{fontSize:'0.9rem'}}>Benchmark Score</strong>
                      <span style={{fontSize:'1rem'}}>💯 {benchmarkResult.totalScore}</span>
                    </div>
                    <div style={{marginTop:'6px', fontSize:'0.65rem', opacity:0.8}}>Composite: {(benchmarkResult.normalizedComposite*100).toFixed(1)}%</div>
                    <div className="benchmark-breakdown" style={{marginTop:'6px', fontSize:'0.65rem', lineHeight:1.4}}>
                      {Object.entries(benchmarkResult.breakdown).map(([part, data]) => (
                        <div key={part} style={{display:'flex', justifyContent:'space-between'}}>
                          <span style={{textTransform:'capitalize'}}>{part}:</span>
                          <span>{(data.score*100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                    {benchmarkResult.notes && benchmarkResult.notes.length>0 && (
                      <ul style={{marginTop:'6px', paddingLeft:'16px', fontSize:'0.55rem', opacity:0.7}}>
                        {benchmarkResult.notes.map(n => <li key={n}>{n}</li>)}
                      </ul>
                    )}
                  </div>
                )}
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
