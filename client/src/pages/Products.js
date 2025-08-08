import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useCart } from '../contexts/CartContext';
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
    sort: searchParams.get('sort') || 'name'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { addToCart } = useCart();
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
      sort: 'name'
    });
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
        <div className="page-header">
          <h1>PC Components & Parts</h1>
          <p>Find the perfect components for your build</p>
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
            <div className="filters-header">
              <h3>Filters</h3>
              <button onClick={clearFilters} className="btn btn-sm btn-outline">
                Clear All
              </button>
            </div>

            {/* Search */}
            <div className="filter-group">
              <label>Search Products</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search by name or keyword..."
                className="form-control"
              />
            </div>

            {/* Category Filter */}
            <div className="filter-group">
              <label>Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="form-control"
              >
                <option value="">All Categories</option>
                {categoriesData?.categories?.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div className="filter-group">
              <label>Brand</label>
              <select
                value={filters.brand}
                onChange={(e) => handleFilterChange('brand', e.target.value)}
                className="form-control"
              >
                <option value="">All Brands</option>
                {brandsData?.brands?.map(brand => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="filter-group">
              <label>Price Range</label>
              <div className="price-inputs">
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  placeholder="Min"
                  className="form-control"
                />
                <span>to</span>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  placeholder="Max"
                  className="form-control"
                />
              </div>
            </div>

            {/* Sort */}
            <div className="filter-group">
              <label>Sort By</label>
              <select
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="form-control"
              >
                <option value="name">Name A-Z</option>
                <option value="-name">Name Z-A</option>
                <option value="price">Price Low to High</option>
                <option value="-price">Price High to Low</option>
                <option value="-createdAt">Newest First</option>
                <option value="createdAt">Oldest First</option>
              </select>
            </div>
          </aside>

          {/* Products Content */}
          <main className="products-content">
            {/* Results Header */}
            <div className="results-header">
              <div className="results-info">
                <span>
                  {isLoading ? 'Loading...' : 
                   `Showing ${products.length} of ${totalProducts} products`}
                </span>
              </div>
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
              <div className="products-grid">
                {products.map((product) => (
                  <div key={product._id} className="product-card">
                    <Link to={`/products/${product._id}`} className="product-link">
                      <div className="product-image">
                        {product.images && product.images[0] ? (
                          <img src={product.images[0].url} alt={product.name} />
                        ) : (
                          <div className="no-image">📦</div>
                        )}
                        {product.stock === 0 && (
                          <div className="out-of-stock-badge">Out of Stock</div>
                        )}
                      </div>
                      <div className="product-info">
                        <h3 className="product-name">{product.name}</h3>
                        <div className="product-price">
                          <span className="price">${product.price}</span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="original-price">${product.originalPrice}</span>
                          )}
                        </div>
                        <div className="product-stock">
                          {product.stock > 0 ? `In stock: ${product.stock} units` : 'Out of stock'}
                        </div>
                        <div className="product-rating">
                          <span className="stars">
                            {'★'.repeat(Math.round(product.ratings?.average || 0))}
                            {'☆'.repeat(5 - Math.round(product.ratings?.average || 0))}
                          </span>
                          <span className="rating-text">({product.ratings?.average?.toFixed(1) || '0.0'})</span>
                        </div>
                      </div>
                    </Link>
                    <div className="product-actions">
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="btn btn-primary btn-block"
                        disabled={product.stock === 0}
                      >
                        {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                ))}
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
