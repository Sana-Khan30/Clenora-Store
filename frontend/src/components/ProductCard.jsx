import { useState } from "react";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=600&q=80";

function ProductCard({ product, addToCart, wishlist = [], toggleWishlist }) {
  const [addedAnim, setAddedAnim] = useState(false);

  const outOfStock = product.inStock === false;
  const isWishlisted = Array.isArray(wishlist) && wishlist.includes(product.id);

  const discountPercent =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null;

  function handleAddToCart(e) {
    e.stopPropagation();
    if (outOfStock) return;
    addToCart(product);
    setAddedAnim(true);
    setTimeout(() => {
      setAddedAnim(false);
    }, 1200);
  }

  function handleWishlistToggle(e) {
    e.stopPropagation();
    if (toggleWishlist) {
      toggleWishlist(product);
    }
  }

  return (
    <article className="product-card" aria-label={product.name}>
      <div className="product-image-container">
        {/* Badges */}
        <div className="product-badges-wrapper">
          {product.badge && (
            <span className="product-badge">{product.badge}</span>
          )}
          {outOfStock && (
            <span className="product-badge out-of-stock-badge">Out of stock</span>
          )}
          {discountPercent && (
            <span className="discount-badge">-{discountPercent}%</span>
          )}
        </div>

        {/* Wishlist Button */}
        {toggleWishlist && (
          <button
            type="button"
            className={`product-wishlist-btn ${isWishlisted ? "active" : ""}`}
            onClick={handleWishlistToggle}
            aria-label={
              isWishlisted
                ? `Remove ${product.name} from wishlist`
                : `Add ${product.name} to wishlist`
            }
            title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            {isWishlisted ? "♥" : "♡"}
          </button>
        )}

        <img
          src={product.image || FALLBACK_IMAGE}
          alt={product.name}
          className="product-image"
          loading="lazy"
          onError={(e) => {
            // Fallback placeholder image if network fails
            e.target.onerror = null;
            e.target.src = FALLBACK_IMAGE;
          }}
        />
      </div>

      <div className="product-info">
        <p className="product-category">{product.category}</p>

        <h3 className="product-title" title={product.name}>
          {product.name}
        </h3>

        {product.description && (
          <p className="product-short-desc">{product.description}</p>
        )}

        <div className="product-rating" aria-label={`Rating ${product.rating} out of 5 stars`}>
          <span className="rating-star">★</span>
          <span className="rating-score">{product.rating}</span>
          {product.reviews && (
            <span className="rating-reviews">({product.reviews})</span>
          )}
        </div>

        {product.lowStock && !outOfStock && (
          <p className="low-stock-hint">Only a few left</p>
        )}

        <div className="product-bottom">
          <div className="product-price">
            <strong>Rs. {product.price}</strong>
            {product.oldPrice && <span>Rs. {product.oldPrice}</span>}
          </div>

          <button
            type="button"
            className={`add-cart-btn ${addedAnim ? "added" : ""} ${outOfStock ? "sold-out" : ""}`}
            disabled={outOfStock}
            onClick={handleAddToCart}
            aria-label={`Add ${product.name} to cart`}
          >
            {outOfStock ? "Sold out" : addedAnim ? "✓ Added" : "Add +"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;