import { useState, useMemo } from "react";
import ProductCard from "./ProductCard";

function CategoryView({
  title,
  subtitle,
  icon,
  products = [],
  addToCart,
  wishlist = [],
  toggleWishlist,
}) {
  const [sortBy, setSortBy] = useState("featured");
  const [maxPriceChoice, setMaxPriceChoice] = useState(null); // null = no price limit chosen yet
  const [minRating, setMinRating] = useState(0);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Compute available price boundaries
  const prices = products.map((p) => p.price);
  const lowestPrice = prices.length ? Math.min(...prices) : 0;
  const highestPrice = prices.length ? Math.max(...prices) : 2000;
  const maxPrice = maxPriceChoice === null ? highestPrice : Math.min(maxPriceChoice, highestPrice);
  const setMaxPrice = setMaxPriceChoice;

  // Filter & sort products
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      if (p.price > maxPrice) return false;
      if (minRating > 0 && p.rating < minRating) return false;
      if (onlyInStock && !p.inStock) return false;
      return true;
    });

    if (sortBy === "price-asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // "featured" default
      list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    return list;
  }, [products, sortBy, maxPrice, minRating, onlyInStock]);

  const activeFilterCount =
    (maxPrice < highestPrice ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (onlyInStock ? 1 : 0);

  function resetFilters() {
    setMaxPriceChoice(null);
    setMinRating(0);
    setOnlyInStock(false);
    setSortBy("featured");
  }

  return (
    <section className="category-view-section">
      {/* HEADER */}
      <div className="category-hero-header">
        <div className="category-hero-content">
          <span className="section-label">CLEANY CATALOG</span>
          <h1>
            {icon && <span className="cat-header-icon">{icon}</span>}
            {title}
          </h1>
          {subtitle && <p className="category-desc">{subtitle}</p>}
        </div>
        <div className="category-meta-count">
          <span className="count-pill">
            {filteredProducts.length} {filteredProducts.length === 1 ? "Product" : "Products"}
          </span>
        </div>
      </div>

      {/* FILTER & SORT TOOLBAR */}
      <div className="catalog-toolbar">
        <div className="toolbar-left">
          {/* Mobile Filter Toggle Button */}
          <button
            type="button"
            className="mobile-filter-trigger-btn"
            onClick={() => setMobileFiltersOpen(true)}
            aria-label="Open filter options"
          >
            <span>⚙️ Filters</span>
            {activeFilterCount > 0 && (
              <span className="filter-badge-count">{activeFilterCount}</span>
            )}
          </button>

          {/* Desktop inline quick filters */}
          <div className="desktop-inline-filters">
            <label className="filter-item-inline">
              <span className="filter-label-text">Max Price:</span>
              <strong className="filter-val-text">Rs. {maxPrice}</strong>
              <input
                type="range"
                min={lowestPrice || 300}
                max={highestPrice || 2000}
                step={50}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="price-slider"
                aria-label="Filter by maximum price"
              />
            </label>

            <label className="filter-item-inline">
              <span className="filter-label-text">Rating:</span>
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="filter-select"
                aria-label="Filter by minimum rating"
              >
                <option value={0}>All Ratings</option>
                <option value={4.7}>★ 4.7 & up</option>
                <option value={4.8}>★ 4.8 & up</option>
                <option value={4.9}>★ 4.9 only</option>
              </select>
            </label>

            <label className="filter-checkbox-inline">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
              />
              <span>In Stock Only</span>
            </label>

            {activeFilterCount > 0 && (
              <button
                type="button"
                className="clear-filters-btn"
                onClick={resetFilters}
              >
                Reset ×
              </button>
            )}
          </div>
        </div>

        {/* Sorting Dropdown */}
        <div className="toolbar-right">
          <label className="sort-label">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
              aria-label="Sort products"
            >
              <option value="featured">Featured First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="name">Name: A to Z</option>
            </select>
          </label>
        </div>
      </div>

      {/* MOBILE FILTER MODAL / DRAWER */}
      {mobileFiltersOpen && (
        <div
          className="mobile-filter-drawer-overlay"
          onClick={() => setMobileFiltersOpen(false)}
        >
          <div
            className="mobile-filter-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <h3>Filter Products</h3>
              <button
                type="button"
                className="close-drawer-btn"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filter drawer"
              >
                ✕
              </button>
            </div>

            <div className="drawer-body">
              <div className="drawer-filter-group">
                <label>
                  <span>Max Price:</span>
                  <strong>Rs. {maxPrice}</strong>
                </label>
                <input
                  type="range"
                  min={lowestPrice || 300}
                  max={highestPrice || 2000}
                  step={50}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="price-slider"
                />
              </div>

              <div className="drawer-filter-group">
                <label>Minimum Star Rating</label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="filter-select"
                >
                  <option value={0}>All Ratings</option>
                  <option value={4.7}>★ 4.7 & up</option>
                  <option value={4.8}>★ 4.8 & up</option>
                  <option value={4.9}>★ 4.9 only</option>
                </select>
              </div>

              <div className="drawer-filter-group checkbox-group">
                <label className="filter-checkbox-inline">
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                  />
                  <span>In Stock Only</span>
                </label>
              </div>
            </div>

            <div className="drawer-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  resetFilters();
                  setMobileFiltersOpen(false);
                }}
              >
                Reset
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setMobileFiltersOpen(false)}
              >
                Apply ({filteredProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTS GRID */}
      {filteredProducts.length > 0 ? (
        <div className="product-grid category-grid-view">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              addToCart={addToCart}
              wishlist={wishlist}
              toggleWishlist={toggleWishlist}
            />
          ))}
        </div>
      ) : (
        <div className="no-products-empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No products found</h3>
          <p>
            No products match your active filter criteria. Try adjusting your
            price range or star rating filter.
          </p>
          <button
            type="button"
            className="primary-btn"
            onClick={resetFilters}
          >
            Reset All Filters
          </button>
        </div>
      )}
    </section>
  );
}

export default CategoryView;
