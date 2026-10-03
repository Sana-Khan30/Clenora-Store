import cleanyLogo from "../assets/cleany-text.png";

function Navbar({
  toggleSidebar,
  cartCount = 0,
  wishlistCount = 0,
  openCart,
  openWishlist,
  openAccount,
  openHome,
  searchQuery = "",
  onSearchChange,
  onClearSearch,
}) {
  return (
    <header className="navbar">
      <div className="navbar-top">
        {/* Mobile Hamburger */}
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <span className="hamburger-icon">☰</span>
        </button>

        {/* Logo */}
        <div
          className="navbar-logo"
          onClick={openHome}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openHome();
            }
          }}
          aria-label="CLEANY Home"
        >
          <img src={cleanyLogo} alt="CLEANY - Modern Cleaning Products" />
        </div>

        {/* Desktop Search */}
        <div className="desktop-search navbar-search">
          <span className="search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search cleaning products, categories, scents..."
            aria-label="Search products"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={onClearSearch}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Navbar Actions */}
        <div className="navbar-actions">
          {/* Wishlist Button */}
          <button
            type="button"
            className="nav-action-btn wishlist-btn"
            onClick={openWishlist}
            aria-label={`Wishlist (${wishlistCount} items)`}
            title="Wishlist"
          >
            <span className="action-icon">♡</span>
            {wishlistCount > 0 && (
              <span className="nav-badge wishlist-count">{wishlistCount}</span>
            )}
          </button>

          {/* Account Button */}
          <button
            type="button"
            className="nav-action-btn account-btn"
            onClick={openAccount}
            aria-label="My Account"
            title="My Account"
          >
            <span className="action-icon">👤</span>
          </button>

          {/* Cart Button */}
          <button
            type="button"
            className="nav-action-btn cart-icon-btn"
            onClick={openCart}
            aria-label={`Cart (${cartCount} items)`}
            title="Shopping Cart"
          >
            <span className="action-icon">🛒</span>
            {cartCount > 0 && (
              <span className="nav-badge cart-count">{cartCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Search - ALWAYS visible on mobile directly below top bar */}
      <div className="mobile-search navbar-search">
        <span className="search-icon" aria-hidden="true">
          ⌕
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search all cleaning products..."
          aria-label="Search products"
        />
        {searchQuery && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={onClearSearch}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
    </header>
  );
}

export default Navbar;