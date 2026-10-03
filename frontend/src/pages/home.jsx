import cleaningProducts from "../assets/cleany-product.png";
import ProductCard from "../components/ProductCard";
import { useStore } from "../context/storeContext";

function Home({ addToCart, wishlist = [], toggleWishlist, openPage }) {
  const { categories, getFeaturedProducts, getBestSellers } = useStore();
  const featuredProducts = getFeaturedProducts().slice(0, 4);
  const bestSellerProducts = getBestSellers().slice(0, 4);

  function handleCategoryClick(categoryId) {
    if (openPage) {
      openPage(categoryId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleShopNow() {
    if (openPage) {
      openPage("shop");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleExploreCategories() {
    const el = document.getElementById("categories-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else if (openPage) {
      openPage("categories");
    }
  }

  return (
    <div className="home-page-container">
      {/* 1. HERO SECTION */}
      <section className="hero">
        <div className="hero-content">
          <span className="hero-badge">CLEAN • FRESH • SMART</span>

          <h1>
            A cleaner home.
            <br />
            A better life.
          </h1>

          <p>
            Experience hospital-grade hygiene formulated with gentle plant
            enzymes. CLEANY removes stubborn grime, grease, and germs while
            keeping your indoor air fresh and safe.
          </p>

          <div className="hero-buttons">
            <button
              type="button"
              className="primary-btn"
              onClick={handleShopNow}
            >
              Shop All Products →
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={handleExploreCategories}
            >
              Explore Categories
            </button>
          </div>

          {/* QUICK TRUST BADGES */}
          <div className="hero-trust-row">
            <div className="trust-pill">
              <span className="trust-icon">🌱</span>
              <span>100% Eco-Safe</span>
            </div>
            <div className="trust-pill">
              <span className="trust-icon">🚚</span>
              <span>Free Delivery over Rs. 1500</span>
            </div>
            <div className="trust-pill">
              <span className="trust-icon">🛡️</span>
              <span>Non-Toxic Fumes</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-circle" />
          <img
            src={cleaningProducts}
            alt="CLEANY Premium Cleaning Bottles"
            className="hero-product-image"
          />
        </div>
      </section>

      {/* 2. CATEGORIES SECTION */}
      <section id="categories-section" className="categories-section">
        <div className="section-heading">
          <div>
            <span className="section-label">EXPLORE PRODUCTS</span>
            <h2>Shop By Category</h2>
            <p>
              Targeted formulations engineered for every surface in your home.
            </p>
          </div>
        </div>

        <div className="category-grid">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="category-card"
              onClick={() => handleCategoryClick(cat.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCategoryClick(cat.id);
                }
              }}
              aria-label={`Explore ${cat.name} category`}
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

      {/* 3. FEATURED PRODUCTS */}
      <section className="featured-products">
        <div className="section-heading flex-between">
          <div>
            <span className="section-label">FEATURED ESSENTIALS</span>
            <h2>Customer Favorites</h2>
            <p>
              Our most popular formulations recommended by professional cleaners.
            </p>
          </div>
          <button
            type="button"
            className="view-all-link-btn"
            onClick={handleShopNow}
          >
            View All ({featuredProducts.length}+) →
          </button>
        </div>

        <div className="product-grid">
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              addToCart={addToCart}
              wishlist={wishlist}
              toggleWishlist={toggleWishlist}
            />
          ))}
        </div>
      </section>

      {/* 4. PROMOTIONAL / DEALS BANNER */}
      <section className="promo-banner-section">
        <div className="promo-banner-card">
          <div className="promo-badge">SPARKLE SEASON SALE</div>
          <h2>Upgrade Your Cleaning Routine — Save Up to 25%</h2>
          <p>
            Bundle any floor care and kitchen cleaner today and get complimentary
            microfiber cloths with your order.
          </p>
          <div className="promo-actions">
            <button
              type="button"
              className="primary-btn light"
              onClick={() => {
                if (openPage) openPage("deals");
              }}
            >
              Claim Special Offer →
            </button>
            <span className="promo-code">Use code: <strong>CLEAN2026</strong></span>
          </div>
        </div>
      </section>

      {/* 5. BEST SELLERS */}
      <section className="best-sellers-section">
        <div className="section-heading">
          <div>
            <span className="section-label">PROVEN RESULTS</span>
            <h2>Top Best Sellers</h2>
            <p>
              Loved by thousands of Pakistani homes for unbeatable grease and
              stain removal.
            </p>
          </div>
        </div>

        <div className="product-grid">
          {bestSellerProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              addToCart={addToCart}
              wishlist={wishlist}
              toggleWishlist={toggleWishlist}
            />
          ))}
        </div>
      </section>

      {/* 6. CLEANING SOLUTIONS & BENEFITS */}
      <section className="benefits-section">
        <div className="section-heading text-center">
          <span className="section-label">CLEAN SCIENCE</span>
          <h2>Why Our Formulations Work Better</h2>
          <p>
            We replace harsh chemical smells with advanced bioactive technology.
          </p>
        </div>

        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-icon">🔬</div>
            <h3>Bio-Enzyme Active</h3>
            <p>
              Micro-enzymes break down grease, milk fats, and proteins at a
              molecular level without abrasive scratching.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">💨</div>
            <h3>Fast Dry, Zero Streaks</h3>
            <p>
              High-evaporation surface tension agents ensure windows, mirrors,
              and tiles dry within seconds without foggy marks.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">🐾</div>
            <h3>Pet & Child Safe</h3>
            <p>
              Zero phosphates, ammonia, or caustic bleach. Safe for crawling
              toddlers and pets walking on cleaned floors.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">🌿</div>
            <h3>Invigorating Aromatherapy</h3>
            <p>
              Infused with natural essential oils of lemon zest, wild mint, and
              eucalyptus rather than pungent chemical perfumes.
            </p>
          </div>
        </div>
      </section>

      {/* 7. WHY CLEANY */}
      <section className="why-cleany-section">
        <div className="why-cleany-layout">
          <div className="why-cleany-text">
            <span className="section-label">THE CLEANY STANDARD</span>
            <h2>Re-imagining Modern Home Hygiene</h2>
            <p>
              Most conventional cleaning supplies were designed decades ago with
              harsh chemicals that irritate skin and lungs. CLEANY was built on
              modern chemical engineering: effective, gentle, and sustainable.
            </p>
            <div className="why-points-list">
              <div className="why-point">
                <span className="point-bullet">✓</span>
                <div>
                  <strong>99.9% Antibacterial Sanitization</strong>
                  <p>Certified against household pathogens and bacteria.</p>
                </div>
              </div>
              <div className="why-point">
                <span className="point-bullet">✓</span>
                <div>
                  <strong>100% Recyclable Packaging</strong>
                  <p>Refill-ready ergonomic trigger spray bottles.</p>
                </div>
              </div>
              <div className="why-point">
                <span className="point-bullet">✓</span>
                <div>
                  <strong>Dermatologically Approved</strong>
                  <p>Formulated to be kind on hands during daily washing.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="why-cleany-visual">
            <div className="stat-highlight-box">
              <div className="highlight-number">50,000+</div>
              <p>Sparkling Homes Cleaned in Pakistan</p>
            </div>
            <div className="stat-highlight-box green">
              <div className="highlight-number">4.9 / 5.0</div>
              <p>Average Customer Satisfaction Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CALL TO ACTION (CTA) */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready for an Effortlessly Clean Home?</h2>
          <p>
            Join thousands of satisfied households who switched to CLEANY for
            fresh, residue-free sparkle.
          </p>
          <div className="cta-buttons">
            <button
              type="button"
              className="primary-btn"
              onClick={handleShopNow}
            >
              Browse Complete Catalog →
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                if (openPage) openPage("deals");
              }}
            >
              View Bundle Savings
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;