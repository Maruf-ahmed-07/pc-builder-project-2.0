import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useCart } from '../contexts/CartContext';
import { useCompare } from '../contexts/CompareContext';
import toast from 'react-hot-toast';
import './Products.css';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    search: searchParams.get('search') || '',
    sort: searchParams.get('sort') || 'newest'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { addToCart } = useCart();
  const { addToCompare, removeFromCompare, isCompared, compareItems, max } = useCompare();
  const limit = 24;

  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ['products', filters, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage,
        limit,
        ...filters
      });
      
      Object.keys(filters).forEach(key => {
        if (!filters[key]) {
          params.delete(key);
        }
      });

      const response = await axios.get(`/api/products?${params}`);
      return response.data;
    }
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axios.get('/api/products/categories');
      return response.data;
    }
  });

  const { data: brandsData } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const response = await axios.get('/api/products/brands');
      return response.data;
    }
  });
  useEffect(() => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.set(key, filters[key]);
      }
    });
    setSearchParams(params);
    setCurrentPage(1);
  }, [filters, setSearchParams]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      brand: '',
      minPrice: '',
      maxPrice: '',
      search: '',
      sort: 'newest'
    });
  };

  const removeFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: '' }));
  };

  const handleAddToCart = async (product) => {
    try {
      await addToCart(product._id, 1);
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  if (error) {
    return (
      <div className="error-container">
        <h2>Failed to load products</h2>
        <p>Please try again later.</p>
      </div>
    );
  }

  const products = productsData?.products || [];
  const totalProducts = productsData?.pagination?.totalProducts || 0;
  const totalPages = productsData?.pagination?.totalPages || 0;
  const hasNext = productsData?.pagination?.hasNext || false;
  const hasPrev = productsData?.pagination?.hasPrev || false;

  return (
    <div className="products-page">
      <div className="container">
        {/* Page Header */}
        <div className="page-header products-header-enhanced">
          <div className="header-text-group">
            <h1>PC Components & Parts</h1>
            <p>Find the perfect components for your build</p>
          </div>
          <div className="header-actions-inline">
            <label className="sort-inline-label" htmlFor="sortSelect">Sort</label>
            <select
              id="sortSelect"
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="form-control sort-inline-select"
            >
                <option value="newest">Newest First</option>
                <option value="name_asc">Name A-Z</option>
                <option value="name_desc">Name Z-A</option>
                <option value="price_asc">Price Low to High</option>
                <option value="price_desc">Price High to Low</option>
                <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        <div className="products-layout">
          {/* Mobile Filter Toggle */}
          <button 
            className="mobile-filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            🔍 Filters & Search
          </button>

          {/* Filters Sidebar */}
          <aside className={`filters-sidebar ${showFilters ? 'show' : ''}`}>
            <div className="filters-header minimal">
              <h3>Filters</h3>
              <div className="filters-header-actions">
                <span className="active-count">
                  {['category','brand','minPrice','maxPrice','search'].filter(k => filters[k]).length} active
                </span>
                <button onClick={clearFilters} className="btn btn-sm btn-outline clear-all-inline">Reset</button>
              </div>
            </div>

            {(filters.category || filters.brand || filters.search || filters.minPrice || filters.maxPrice) && (
              <div className="sidebar-active-chips">
                {filters.search && <button className="filter-chip" onClick={() => removeFilter('search')}>{filters.search} ✕</button>}
                {filters.category && <button className="filter-chip" onClick={() => removeFilter('category')}>{filters.category} ✕</button>}
                {filters.brand && <button className="filter-chip" onClick={() => removeFilter('brand')}>{filters.brand} ✕</button>}
                {filters.minPrice && <button className="filter-chip" onClick={() => removeFilter('minPrice')}>Min {filters.minPrice} ✕</button>}
                {filters.maxPrice && <button className="filter-chip" onClick={() => removeFilter('maxPrice')}>Max {filters.maxPrice} ✕</button>}
              </div>
            )}

            <div className="filters-body compact-grid">
              {/* Search */}
              <div className="filter-field span-2">
                <label className="ff-label" htmlFor="searchInput">Search</label>
                <div className="ff-control icon-left">
                  <span className="ff-icon">🔎</span>
                  <input
                    id="searchInput"
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Name or keyword"
                  />
                  {filters.search && <button className="inline-clear" onClick={() => removeFilter('search')} title="Clear">✕</button>}
                </div>
              </div>

              {/* Category */}
              <div className="filter-field">
                <label className="ff-label" htmlFor="categorySelect">Category</label>
                <div className="ff-control">
                  <select
                    id="categorySelect"
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                  >
                    <option value="">All</option>
                    {categoriesData?.categories?.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {filters.category && <button className="inline-clear" onClick={() => removeFilter('category')} title="Clear">✕</button>}
                </div>
              </div>

              {/* Brand */}
              <div className="filter-field">
                <label className="ff-label" htmlFor="brandSelect">Brand</label>
                <div className="ff-control">
                  <select
                    id="brandSelect"
                    value={filters.brand}
                    onChange={(e) => handleFilterChange('brand', e.target.value)}
                  >
                    <option value="">All</option>
                    {brandsData?.brands?.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                  {filters.brand && <button className="inline-clear" onClick={() => removeFilter('brand')} title="Clear">✕</button>}
                </div>
              </div>

              {/* Price Range (combined) */}
              <div className="filter-field span-2">
                <label className="ff-label" htmlFor="minPriceInput">Price Range</label>
                <div className="price-dual">
                  <div className="ff-control compact">
                    <input
                      id="minPriceInput"
                      type="number"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      placeholder="Min"
                      min="0"
                    />
                    {filters.minPrice && <button className="inline-clear" onClick={() => removeFilter('minPrice')} title="Clear">✕</button>}
                  </div>
                  <span className="range-sep">-</span>
                  <div className="ff-control compact">
                    <input
                      id="maxPriceInput"
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      placeholder="Max"
                      min="0"
                    />
                    {filters.maxPrice && <button className="inline-clear" onClick={() => removeFilter('maxPrice')} title="Clear">✕</button>}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Products Content */}
          <main className="products-content">
            {/* Results Header */}
            <div className="results-header compact">
              <div className="results-info">
                <span>
                  {isLoading ? 'Loading products...' : `Showing ${products.length} of ${totalProducts}`}
                </span>
              </div>
              {(filters.category || filters.brand || filters.search || filters.minPrice || filters.maxPrice) && (
                <div className="active-filters">
                  {filters.search && (
                    <button className="filter-chip" onClick={() => removeFilter('search')}>Search: {filters.search} ✕</button>
                  )}
                  {filters.category && (
                    <button className="filter-chip" onClick={() => removeFilter('category')}>Category: {filters.category} ✕</button>
                  )}
                  {filters.brand && (
                    <button className="filter-chip" onClick={() => removeFilter('brand')}>Brand: {filters.brand} ✕</button>
                  )}
                  {filters.minPrice && (
                    <button className="filter-chip" onClick={() => removeFilter('minPrice')}>Min: {filters.minPrice} ✕</button>
                  )}
                  {filters.maxPrice && (
                    <button className="filter-chip" onClick={() => removeFilter('maxPrice')}>Max: {filters.maxPrice} ✕</button>
                  )}
                  <button className="filter-chip clear-all" onClick={clearFilters}>Clear All</button>
                </div>
              )}
            </div>

            {/* Products Grid */}
            {isLoading ? (
              <div className="loading-grid">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={index} className="product-skeleton">
                    <div className="skeleton-image"></div>
                    <div className="skeleton-content">
                      <div className="skeleton-line"></div>
                      <div className="skeleton-line short"></div>
                      <div className="skeleton-line"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="no-products">
                <h3>No products found</h3>
                <p>Try adjusting your filters or search terms.</p>
                <button onClick={clearFilters} className="btn btn-primary">
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="products-grid refined">
                {products.map((product) => {
                  const discount = product.originalPrice && product.originalPrice > product.price
                    ? Math.round(100 - (product.price / product.originalPrice) * 100)
                    : null;
                  const avg = product.ratings?.average || 0;
                  return (
                    <div key={product._id} className={`product-card modern ${product.stock === 0 ? 'is-out' : ''}`}>
                      <div className="compare-toggle-wrap">
                        <button
                          type="button"
                          className={`compare-toggle ${isCompared(product._id) ? 'active' : ''}`}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); isCompared(product._id) ? removeFromCompare(product._id) : addToCompare(product); }}
                          title={isCompared(product._id) ? 'Remove from compare' : (compareItems.length >= max ? 'Compare list full' : 'Add to compare')}
                          disabled={!isCompared(product._id) && compareItems.length >= max}
                        >
                          {isCompared(product._id) ? '✓ Comparing' : 'Compare'}
                        </button>
                      </div>
                      <Link to={`/products/${product._id}`} className="product-link">
                        <div className="product-image">
                          {product.images && product.images[0] ? (
                            <img src={product.images[0].url} alt={product.name} />
                          ) : (
                            <div className="no-image">📦</div>
                          )}
                          {discount && <div className="discount-badge">-{discount}%</div>}
                          {product.stock === 0 && (
                            <div className="out-of-stock-badge">Out</div>
                          )}
                          {product.brand && <div className="brand-badge">{product.brand}</div>}
                        </div>
                        <div className="product-info compact">
                          <h3 className="product-name" title={product.name}>{product.name}</h3>
                          <div className="meta-row">
                            <div className="product-price">
                              <span className="price">${product.price}</span>
                              {product.originalPrice && product.originalPrice > product.price && (
                                <span className="original-price">${product.originalPrice}</span>
                              )}
                            </div>
                            <div className="product-rating mini" title={`Average rating ${avg.toFixed(1)}`}>
                              <span className="stars">
                                {'★'.repeat(Math.round(avg))}
                                {'☆'.repeat(5 - Math.round(avg))}
                              </span>
                              <span className="rating-text">{avg.toFixed(1)}</span>
                            </div>
                          </div>
                          <div className={`stock-pill ${product.stock > 0 ? 'in' : 'out'}`}>
                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                          </div>
                        </div>
                      </Link>
                      <div className="product-actions minimal">
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="btn btn-primary btn-block"
                          disabled={product.stock === 0}
                        >
                          {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn btn-outline"
                >
                  Previous
                </button>
                
                <div className="page-numbers">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`btn ${currentPage === pageNum ? 'btn-primary' : 'btn-outline'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn btn-outline"
                >
                  Next
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Products;
