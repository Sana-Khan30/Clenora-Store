import ProductCard from "../components/ProductCard";
import { useStore } from "../context/storeContext";

function Wishlist({
  wishlist = [],
  toggleWishlist,
  addToCart,
  openPage,
}) {
  const { getProductById } = useStore();
  const wishlistedProducts = wishlist
    .map((id) => getProductById(id))
    .filter(Boolean);

  function handleAddAllToCart() {
    wishlistedProducts.forEach((product) => {
      addToCart(product);
    });
  }

  return (
    <section className="wishlist-page">
      <div className="page-heading">
        <span className="section-label">SAVED FAVORITES</span>
        <h1>My Wishlist</h1>
        <p>Keep track of your favorite cleaning essentials for easy re-ordering.</p>
      </div>

      {wishlistedProducts.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">♡</div>
          <h2>Your Wishlist is Empty</h2>
          <p>
            You haven&apos;t saved any cleaning products yet. Click the heart icon on any
            product card to save items you love!
          </p>
          <button
            type="button"
            className="primary-btn"
            onClick={() => openPage("shop")}
          >
            Explore Cleaning Products →
          </button>
        </div>
      ) : (
        <>
          <div className="wishlist-header-bar">
            <span>
              Showing {wishlistedProducts.length}{" "}
              {wishlistedProducts.length === 1 ? "saved item" : "saved items"}
            </span>
            <button
              type="button"
              className="primary-btn add-all-btn"
              onClick={handleAddAllToCart}
            >
              Add All to Cart 🛒
            </button>
          </div>

          <div className="product-grid">
            {wishlistedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                addToCart={addToCart}
                wishlist={wishlist}
                toggleWishlist={toggleWishlist}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default Wishlist;
