import cleanyLogo from "../assets/cleany-symble.png";
import { useStore } from "../context/storeContext";

function Sidebar({
  sidebarOpen,
  closeSidebar,
  currentPage,
  openPage,
  wishlistCount = 0,
  cartCount = 0,
}) {
  const { categories } = useStore();

  function handleNavigate(page) {
    openPage(page);
    if (closeSidebar) {
      closeSidebar();
    }
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Main Navigation">
        {/* SIDEBAR HEADER */}
        <div className="sidebar-header">
          <div
            className="sidebar-logo"
            onClick={() => handleNavigate("home")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleNavigate("home");
            }}
            aria-label="CLENORA Home"
          >
            <img src={cleanyLogo} alt="CLENORA Symbol" />
            <span className="sidebar-brand-name">CLENORA</span>
          </div>

          {/* Close button visible on mobile */}
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={closeSidebar}
            aria-label="Close navigation menu"
          >
            ✕
          </button>
        </div>

        {/* MAIN MENU */}
        <nav className="sidebar-menu">
          <button
            type="button"
            className={currentPage === "home" ? "active" : ""}
            onClick={() => handleNavigate("home")}
          >
            <span className="menu-icon"></span>
            <span>Home</span>
          </button>

          <button
            type="button"
            className={currentPage === "shop" ? "active" : ""}
            onClick={() => handleNavigate("shop")}
          >
            <span className="menu-icon"></span>
            <span>Shop All</span>
          </button>

          <button
            type="button"
            className={currentPage === "categories" ? "active" : ""}
            onClick={() => handleNavigate("categories")}
          >
            <span className="menu-icon"></span>
            <span>Categories</span>
          </button>

          <button
            type="button"
            className={currentPage === "deals" ? "active" : ""}
            onClick={() => handleNavigate("deals")}
          >
            <span className="menu-icon"></span>
            <span>Special Deals</span>
            <span className="deals-tag">Sale</span>
          </button>
        </nav>

        {/* SHOP BY CATEGORY */}
        <div className="sidebar-section">
          <p className="sidebar-section-title">SHOP BY CATEGORY</p>

          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={currentPage === cat.id ? "active" : ""}
              onClick={() => handleNavigate(cat.id)}
            >
              <span className="cat-icon">{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* BOTTOM USER ACTIONS */}
        <div className="sidebar-bottom">
          <button
            type="button"
            className={currentPage === "wishlist" ? "active" : ""}
            onClick={() => handleNavigate("wishlist")}
          >
            <span className="menu-icon">♡</span>
            <span>Wishlist</span>
            {wishlistCount > 0 && (
              <span className="sidebar-badge">{wishlistCount}</span>
            )}
          </button>

          <button
            type="button"
            className={currentPage === "cart" ? "active" : ""}
            onClick={() => handleNavigate("cart")}
          >
            <span className="menu-icon">🛒</span>
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="sidebar-badge cart">{cartCount}</span>
            )}
          </button>

          <button
            type="button"
            className={currentPage === "account" ? "active" : ""}
            onClick={() => handleNavigate("account")}
          >
            <span className="menu-icon">👤</span>
            <span>Account</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;