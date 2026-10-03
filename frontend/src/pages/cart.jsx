import { useStore } from "../context/storeContext";

function Cart({
  cart = [],
  increaseQuantity,
  decreaseQuantity,
  removeFromCart,
  openCheckout,
  openPage,
  cartNotices = [],
  dismissNotices,
}) {
  const { settings } = useStore();
  const subtotal = cart.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);

  // Display only: the server recalculates shipping and totals when the order is placed.
  const shippingThreshold = settings.freeShippingThreshold;
  const shippingFee = subtotal >= shippingThreshold || subtotal === 0 ? 0 : settings.shippingFee;
  const grandTotal = subtotal + shippingFee;

  function handleContinueShopping() {
    if (openPage) {
      openPage("shop");
    }
  }

  return (
    <section className="cart-page">
      <div className="cart-heading">
        <span className="section-label">YOUR SHOPPING BAG</span>
        <h1>Shopping Cart</h1>
        <p>
          Review your selected products and proceed to secure checkout.
        </p>
      </div>

      {cartNotices.length > 0 && (
        <div className="cart-notices" role="status">
          {cartNotices.map((notice) => (
            <p key={notice}>⚠️ {notice}</p>
          ))}
          {dismissNotices && (
            <button type="button" className="link-btn" onClick={dismissNotices}>
              Dismiss
            </button>
          )}
        </div>
      )}

      {cart.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Your cart is currently empty</h2>
          <p>
            You haven&apos;t added any cleaning products yet. Explore our top-rated
            collection to find what your home needs.
          </p>
          <button
            type="button"
            className="primary-btn"
            onClick={handleContinueShopping}
          >
            Start Shopping →
          </button>
        </div>
      ) : (
        <div className="cart-layout">
          {/* CART ITEMS LIST */}
          <div className="cart-items">
            {/* Free shipping progress bar */}
            <div className="shipping-progress-card">
              {subtotal >= shippingThreshold ? (
                <p className="free-shipping-unlocked">
                  🎉 Congratulations! You have unlocked <strong>FREE Shipping</strong>!
                </p>
              ) : (
                <p>
                  Add <strong>Rs. {shippingThreshold - subtotal}</strong> more to qualify
                  for <strong>FREE Delivery</strong>!
                </p>
              )}
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.min(100, (subtotal / shippingThreshold) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {cart.map((item) => (
              <article className="cart-item" key={item.id}>
                <div className="cart-product-image">
                  <img
                    src={item.image}
                    alt={item.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=600&q=80";
                    }}
                  />
                </div>

                <div className="cart-product-info">
                  {item.category && (
                    <p className="cart-category">{item.category}</p>
                  )}
                  <h3>{item.name}</h3>
                  <div className="cart-unit-price">Rs. {item.price} each</div>
                </div>

                {/* QUANTITY CONTROLS */}
                <div className="quantity-controls" aria-label="Quantity Controls">
                  <button
                    type="button"
                    onClick={() => decreaseQuantity(item.id)}
                    aria-label={`Decrease quantity of ${item.name}`}
                  >
                    −
                  </button>
                  <span className="qty-number">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => increaseQuantity(item.id)}
                    aria-label={`Increase quantity of ${item.name}`}
                  >
                    +
                  </button>
                </div>

                {/* LINE TOTAL */}
                <div className="cart-item-total">
                  Rs. {item.price * item.quantity}
                </div>

                {/* REMOVE BUTTON */}
                <button
                  type="button"
                  className="remove-cart-item"
                  onClick={() => removeFromCart(item.id)}
                  aria-label={`Remove ${item.name} from cart`}
                  title="Remove product"
                >
                  ✕
                </button>
              </article>
            ))}

            <div className="cart-actions-row">
              <button
                type="button"
                className="secondary-btn"
                onClick={handleContinueShopping}
              >
                ← Continue Shopping
              </button>
            </div>
          </div>

          {/* ORDER SUMMARY */}
          <aside className="cart-summary">
            <h2>Order Summary</h2>

            <div className="summary-row">
              <span>Subtotal</span>
              <strong>Rs. {subtotal}</strong>
            </div>

            <div className="summary-row">
              <span>Delivery</span>
              <span>
                {shippingFee === 0 ? (
                  <span className="free-badge">FREE</span>
                ) : (
                  `Rs. ${shippingFee}`
                )}
              </span>
            </div>

            <div className="summary-total">
              <span>Grand Total</span>
              <strong>Rs. {grandTotal}</strong>
            </div>

            <button
              type="button"
              className="checkout-btn"
              onClick={openCheckout}
            >
              Proceed to Checkout →
            </button>

            <div className="summary-trust-badges">
              <p>🔒 256-Bit SSL Encrypted Checkout</p>
              <p>⚡ 24–48h Express Dispatch</p>
              <p>📦 7-Day Money Back Guarantee</p>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

export default Cart;