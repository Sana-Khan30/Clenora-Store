import { useCallback, useEffect, useRef, useState } from "react";

import ThreeLoader from "./components/ThreeLoader";
import Navbar from "./components/navbar";
import Sidebar from "./components/sidebar";
import Footer from "./components/footer";
import CategoryView from "./components/CategoryView";
import ProductCard from "./components/ProductCard";
import WhatsAppButton from "./components/WhatsAppButton";

import Home from "./pages/home";
import Cart from "./pages/cart";
import Checkout from "./pages/checkout";
import OrderSuccess from "./pages/orderSuccess";
import FloorCare from "./pages/floorCare";
import Bathroom from "./pages/bathroom";
import Kitchen from "./pages/kitchen";
import Laundry from "./pages/laundry";
import GlassCleaners from "./pages/glassCleaners";
import Dishwashing from "./pages/dishwashing";
import Wishlist from "./pages/wishlist";
import Account from "./pages/account";
import Admin from "./pages/Admin";

import { useStore } from "./context/storeContext";
import * as api from "./api/endpoints";
import { writeJson } from "./utils/storage";
import {
  CART_KEY,
  WISHLIST_KEY,
  MAX_QTY,
  loadCart,
  loadWishlist,
  reconcileItem,
  toOrderItems,
} from "./utils/cart";

import "./App.css";

// Pages with their own hard-coded route. Any other page id is treated as a category slug.
const RESERVED_PAGES = [
  "home", "shop", "categories", "deals", "floor-care", "bathroom", "kitchen", "laundry",
  "glass-cleaners", "dishwashing", "cart", "checkout", "success", "wishlist", "account", "admin",
];
// These pages do not need the product catalog, so they never wait for it.
const PAGES_WITHOUT_CATALOG = ["cart", "checkout", "success", "account", "admin"];

function App() {
  /* =========================
     SIDEBAR
  ========================= */
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* =========================
     CART
  ========================= */
  const { status, error, retry, refresh, categories, getAllProducts, getProductsByCategory } = useStore();
  const [cart, setCart] = useState(loadCart);
  const [cartNotices, setCartNotices] = useState([]);
  const cartRef = useRef(cart);

  /* =========================
     WISHLIST
  ========================= */
  const [wishlist, setWishlist] = useState(loadWishlist);

  /* =========================
     CURRENT PAGE
  ========================= */
  const [currentPage, setCurrentPage] = useState("home");

  /* =========================
     SEARCH STATE
  ========================= */
  const [searchQuery, setSearchQuery] = useState("");

  /* =========================
     ORDER DATA
  ========================= */
  const [lastOrder, setLastOrder] = useState(null);
  const [orderId, setOrderId] = useState("");

  /* =========================
     SPLASH LOADER
  ========================= */
  const [loading, setLoading] = useState(true);

  /* =========================
     SAVE CART + WISHLIST IN THE BROWSER
  ========================= */
  useEffect(() => {
    cartRef.current = cart;
    writeJson(CART_KEY, cart);
  }, [cart]);

  useEffect(() => {
    writeJson(WISHLIST_KEY, wishlist);
  }, [wishlist]);

  /* =========================
     CART CHECK AGAINST THE SERVER
     Refreshes prices and stock, and removes items that can no longer be bought.
  ========================= */
  const syncCart = useCallback(async () => {
    const snapshot = cartRef.current;
    if (snapshot.length === 0) return;
    try {
      const res = await api.quoteCart(toOrderItems(snapshot));
      const live = new Map(res.data.items.map((i) => [i.productId, i]));
      const notices = snapshot
        .map((item) => reconcileItem(item, live.get(item.id)).notice)
        .filter(Boolean);
      setCart((current) =>
        current.flatMap((item) => {
          const { item: fixed } = reconcileItem(item, live.get(item.id));
          return fixed ? [fixed] : [];
        })
      );
      if (notices.length > 0) setCartNotices(notices);
    } catch {
      // Offline or server error: keep the saved cart. The server checks everything again at checkout.
    }
  }, []);

  useEffect(() => {
    if (status === "ready") syncCart();
  }, [status, syncCart]);

  /* =========================
     LIVE SEARCH (asks the server, waits 300ms after typing stops)
  ========================= */
  const trimmedQuery = searchQuery.trim();
  const [searchState, setSearchState] = useState({ query: "", items: [], error: "" });

  useEffect(() => {
    if (!trimmedQuery) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .getProducts({ search: trimmedQuery, limit: 48 }, { signal: controller.signal })
        .then((res) => setSearchState({ query: trimmedQuery, items: res.data.items, error: "" }))
        .catch((err) => {
          if (err.name !== "AbortError") setSearchState({ query: trimmedQuery, items: [], error: err.message });
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery]);

  const searchReady = trimmedQuery !== "" && searchState.query === trimmedQuery;
  const searchLoading = trimmedQuery !== "" && !searchReady;
  const searchResults = searchReady ? searchState.items : [];
  const searchError = searchReady ? searchState.error : "";

  /* =========================
     SIDEBAR TOGGLE & CLOSE
  ========================= */
  function toggleSidebar() {
    setSidebarOpen((currentState) => !currentState);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  /* =========================
     PAGE NAVIGATION
  ========================= */
  function handleOpenPage(page) {
    setCurrentPage(page);
    if (page === "cart" || page === "checkout") syncCart();
    setSearchQuery(""); // Clear search when user explicitly navigates
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* =========================
     SEARCH HANDLERS
  ========================= */
  function handleSearchChange(query) {
    setSearchQuery(query);
  }

  function handleClearSearch() {
    setSearchQuery("");
  }

  /* =========================
     ADD TO CART
  ========================= */
  function addToCart(product) {
    if (product.inStock === false) return;

    setCart((currentCart) => {
      const existingProduct = currentCart.find((item) => item.id === product.id);

      if (existingProduct) {
        const limit = Math.min(existingProduct.availableStock ?? MAX_QTY, MAX_QTY);
        if (existingProduct.quantity >= limit) return currentCart;
        return currentCart.map((item) => {
          if (item.id === product.id) {
            return {
              ...item,
              quantity: item.quantity + 1,
            };
          }
          return item;
        });
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  }

  /* =========================
     INCREASE QUANTITY
  ========================= */
  function increaseQuantity(productId) {
    setCart((currentCart) => {
      return currentCart.map((item) => {
        if (item.id === productId) {
          const limit = Math.min(item.availableStock ?? MAX_QTY, MAX_QTY);
          return {
            ...item,
            quantity: Math.min(item.quantity + 1, limit),
          };
        }
        return item;
      });
    });
  }

  /* =========================
     DECREASE QUANTITY
  ========================= */
  function decreaseQuantity(productId) {
    setCart((currentCart) => {
      return currentCart
        .map((item) => {
          if (item.id === productId) {
            return {
              ...item,
              quantity: item.quantity - 1,
            };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  }

  /* =========================
     REMOVE FROM CART
  ========================= */
  function removeFromCart(productId) {
    setCart((currentCart) => {
      return currentCart.filter((item) => item.id !== productId);
    });
  }

  /* =========================
     TOGGLE WISHLIST
  ========================= */
  function toggleWishlist(product) {
    setWishlist((current) => {
      if (current.includes(product.id)) {
        return current.filter((id) => id !== product.id);
      }
      return [...current, product.id];
    });
  }

  /* =========================
     PLACE ORDER
  ========================= */
  async function placeOrder(form) {
    const notes = form.orderNotes.trim();
    try {
      const res = await api.placeOrder({
        customer: {
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
          ...(notes ? { notes } : {}),
        },
        items: toOrderItems(cart),
        paymentMethod: "cod",
      });
      const order = res.data.order;

      setOrderId(order.orderNumber);
      setLastOrder({
        fullName: order.customer.fullName,
        phone: order.customer.phone,
        email: order.customer.email,
        address: order.customer.address,
        city: order.customer.city,
        paymentMethod: "Cash on Delivery",
        items: order.items.map((i) => ({ id: String(i.product), name: i.name, quantity: i.quantity, price: i.unitPrice })),
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        grandTotal: order.total,
        placedAt: order.createdAt,
      });
      setCart([]);
      setCartNotices([]);
      setCurrentPage("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
      refresh(); // stock changed: reload product availability quietly
    } catch (err) {
      // 409 = stock or availability changed while the customer was checking out.
      if (err.status === 409) await syncCart();
      throw err;
    }
  }

  /* =========================
     CART COUNT
  ========================= */
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const wishlistCount = wishlist.length;

  /* =========================
     CURRENT CATEGORY PAGE (for categories added later by an admin)
  ========================= */
  const currentCategory = RESERVED_PAGES.includes(currentPage)
    ? null
    : categories.find((c) => c.slug === currentPage) || null;

  // Product pages wait for the catalog; cart, checkout and account never do.
  const showPage = PAGES_WITHOUT_CATALOG.includes(currentPage) || status === "ready";
  const waitingForCatalog = !PAGES_WITHOUT_CATALOG.includes(currentPage);

  return (
    <>
      {/* =========================
          SPLASH LOADER (PRESERVED)
      ========================= */}
      {loading ? (
        <ThreeLoader onComplete={() => setLoading(false)} />
      ) : (
        <div className="cleany-app-root">
          {/* =========================
              NAVBAR
          ========================= */}
          <Navbar
            toggleSidebar={toggleSidebar}
            cartCount={cartCount}
            wishlistCount={wishlistCount}
            openCart={() => handleOpenPage("cart")}
            openWishlist={() => handleOpenPage("wishlist")}
            openAccount={() => handleOpenPage("account")}
            openHome={() => handleOpenPage("home")}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onClearSearch={handleClearSearch}
          />

          {/* =========================
              WEBSITE LAYOUT
          ========================= */}
          <div className="website-layout">
            {/* SIDEBAR */}
            <Sidebar
              sidebarOpen={sidebarOpen}
              closeSidebar={closeSidebar}
              currentPage={currentPage}
              openPage={handleOpenPage}
              wishlistCount={wishlistCount}
              cartCount={cartCount}
            />

            {/* MAIN CONTENT */}
            <main className="main-content" id="main-content-area">
              {/* REAL-TIME SEARCH RESULTS OVERRIDE */}
              {searchQuery.trim().length > 0 ? (
                <section className="search-results-section">
                  <div className="search-results-header">
                    <span className="section-label">SEARCH RESULTS</span>
                    <h1>
                      Results for &ldquo;{searchQuery}&rdquo;
                    </h1>
                    <div className="search-meta-row">
                      <p>
                        {searchLoading
                          ? "Searching…"
                          : `Found ${searchResults.length} ${searchResults.length === 1 ? "product" : "products"}`}
                      </p>
                      <button
                        type="button"
                        className="clear-search-link-btn"
                        onClick={handleClearSearch}
                      >
                        Clear Search ×
                      </button>
                    </div>
                  </div>

                  {searchLoading ? (
                    <div className="store-status-card" role="status">
                      <p>Searching products…</p>
                    </div>
                  ) : searchError ? (
                    <div className="store-status-card" role="alert">
                      <p>{searchError}</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="product-grid">
                      {searchResults.map((product) => (
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
                    <div className="no-products-found-card">
                      <div className="empty-search-icon">🔍</div>
                      <h2>No products found for &ldquo;{searchQuery}&rdquo;</h2>
                      <p>
                        Check for spelling errors or try searching for general
                        terms like &ldquo;floor&rdquo;, &ldquo;kitchen&rdquo;, or
                        &ldquo;glass&rdquo;.
                      </p>
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={handleClearSearch}
                      >
                        Clear Search & Return
                      </button>
                    </div>
                  )}
                </section>
              ) : (
                /* REGULAR PAGE ROUTING */
                <>
                  {/* CATALOG LOADING / ERROR */}
                  {waitingForCatalog && status === "loading" && (
                    <div className="store-status-card" role="status">
                      <p>Loading products…</p>
                    </div>
                  )}
                  {waitingForCatalog && status === "error" && (
                    <div className="store-status-card" role="alert">
                      <p>{error}</p>
                      <button type="button" className="primary-btn" onClick={retry}>
                        Try again
                      </button>
                    </div>
                  )}

                  {showPage && (
                    <>
                  {/* HOME */}
                  {currentPage === "home" && (
                    <Home
                      addToCart={addToCart}
                      wishlist={wishlist}
                      toggleWishlist={toggleWishlist}
                      openPage={handleOpenPage}
                    />
                  )}

                  {/* SHOP ALL PRODUCTS */}
                  {currentPage === "shop" && (
                    <CategoryView
                      title="All Cleaning Products"
                      subtitle="Browse our full collection of hospital-grade hygiene solutions for floors, bathrooms, kitchens, and fabrics."
                      icon="🛍️"
                      products={getAllProducts()}
                      addToCart={addToCart}
                      wishlist={wishlist}
                      toggleWishlist={toggleWishlist}
                    />
                  )}

                  {/* CATEGORIES OVERVIEW */}
                  {currentPage === "categories" && (
                    <section className="categories-page-view">
                      <div className="page-heading">
                        <span className="section-label">PRODUCT FAMILIES</span>
                        <h1>All Categories</h1>
                        <p>
                          Explore specialized cleaning formulations for every surface in your home.
                        </p>
                      </div>
                      <div className="category-grid">
                        {categories.map((cat) => (
                          <div
                            key={cat.id}
                            className="category-card"
                            onClick={() => handleOpenPage(cat.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                handleOpenPage(cat.id);
                              }
                            }}
                            aria-label={`Explore ${cat.name}`}
                          >
                            <div className="category-card-top">
                              <div className="category-icon">{cat.icon}</div>
                              <h3>{cat.name}</h3>
                              <p>{cat.description}</p>
                            </div>
                            <span className="category-link-text">
                              Explore {cat.name} →
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* SPECIAL DEALS & BUNDLES */}
                  {currentPage === "deals" && (
                    <CategoryView
                      title="Special Deals & Bundles"
                      subtitle="Save up to 25% on our top-rated cleaning duos, refills, and multi-surface care sets."
                    
                      products={getAllProducts().filter(
                        (p) => p.oldPrice && p.oldPrice > p.price
                      )}
                      addToCart={addToCart}
                      wishlist={wishlist}
                      toggleWishlist={toggleWishlist}
                    />
                  )}

                  {/* INDIVIDUAL CATEGORY PAGES */}
                  {currentPage === "floor-care" && (
                    <FloorCare
                      addToCart={addToCart}
                      wishlist={wishlist}
                      toggleWishlist={toggleWishlist}
                    />
                  )}

                  {currentPage === "bathroom" && (
                    <Bathroom
                      addToCart={addToCart}
                      wishlist={wishlist}
                      toggleWishlist={toggleWishlist}
                    />
                  )}

                  {currentPage === "kitchen" && (
                    <Kitchen
                      addToCart={addToCart}
                      wishlist={wishlist}
                      toggleWishlist={toggleWishlist}
                    />
                  )}

                  {currentPage === "laundry" && (
                    <Laundry
                      addToCart={addToCart}
                      wishlist={wishlist}
                      toggleWishlist={toggleWishlist}
                    />
                  )}

                  {currentPage === "glass-cleaners" && (
                    <GlassCleaners
                      addToCart={addToCart}
                      wishlist={wishlist}
                      toggleWishlist={toggleWishlist}
                    />
                  )}

                  {currentPage === "dishwashing" && (
                    <Dishwashing
                      addToCart={addToCart}
                      wishlist={wishlist}
                      toggleWishlist={toggleWishlist}
                    />
                  )}

                  {/* CATEGORIES CREATED LATER IN THE ADMIN PANEL */}
                  {currentCategory && (
                    <CategoryView
                      title={currentCategory.name}
                      subtitle={currentCategory.description}
                      icon={currentCategory.icon}
                      products={getProductsByCategory(currentCategory.slug)}
                      addToCart={addToCart}
                      wishlist={wishlist}
                      toggleWishlist={toggleWishlist}
                    />
                  )}

                  {/* CART */}
                  {currentPage === "cart" && (
                    <Cart
                      cartNotices={cartNotices}
                      dismissNotices={() => setCartNotices([])}
                      cart={cart}
                      increaseQuantity={increaseQuantity}
                      decreaseQuantity={decreaseQuantity}
                      removeFromCart={removeFromCart}
                      openCheckout={() => handleOpenPage("checkout")}
                      openPage={handleOpenPage}
                    />
                  )}

                  {/* CHECKOUT */}
                  {currentPage === "checkout" && (
                    <Checkout
                      cartNotices={cartNotices}
                      dismissNotices={() => setCartNotices([])}
                      cart={cart}
                      placeOrder={placeOrder}
                      openPage={handleOpenPage}
                    />
                  )}

                  {/* ORDER SUCCESS */}
                  {currentPage === "success" && (
                    <OrderSuccess
                      orderId={orderId}
                      orderData={lastOrder}
                      goHome={() => handleOpenPage("home")}
                      openPage={handleOpenPage}
                    />
                  )}

                  {/* WISHLIST */}
                  {currentPage === "wishlist" && (
                    <Wishlist
                      wishlist={wishlist}
                      toggleWishlist={toggleWishlist}
                      addToCart={addToCart}
                      openPage={handleOpenPage}
                    />
                  )}

                  {/* ACCOUNT */}
                  {currentPage === "account" && (
                    <Account
                      lastOrder={lastOrder}
                      orderId={orderId}
                      openPage={handleOpenPage}
                    />
                  )}

                  {/* ADMIN PANEL */}
                  {currentPage === "admin" && (
                    <Admin openPage={handleOpenPage} />
                  )}
                    </>
                  )}
                </>
              )}

              {/* GLOBAL FOOTER */}
              <Footer openPage={handleOpenPage} />
            </main>
          </div>

          <WhatsAppButton />
        </div>
      )}
    </>
  );
}

export default App;
