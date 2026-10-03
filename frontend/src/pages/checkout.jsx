import { useState } from "react";
import { useAuth } from "../context/authContext";
import { useStore } from "../context/storeContext";

// Same rule as the server, so a phone number accepted here is accepted there.
const PHONE_PATTERN = /^\+?[0-9\s-]{10,20}$/;
const SERVER_FIELD_TO_FORM = {
  fullName: "fullName",
  phone: "phone",
  email: "email",
  city: "city",
  address: "address",
  notes: "orderNotes",
};

// Turns the server's validation errors into messages under the matching inputs.
function mapServerErrors(err) {
  const errors = {};
  for (const item of err.errors || []) {
    const key = SERVER_FIELD_TO_FORM[String(item.field).split(".").pop()];
    if (key && !errors[key]) errors[key] = item.message;
  }
  errors.submit = Object.keys(errors).length > 0 ? "Please correct the highlighted fields." : err.message;
  return errors;
}

function Checkout({ cart = [], placeOrder, openPage, cartNotices = [], dismissNotices }) {
  const { user } = useAuth();
  const { settings } = useStore();
  const savedAddress = user && user.addresses ? user.addresses.find((a) => a.isDefault) || user.addresses[0] : null;

  const [formData, setFormData] = useState(() => ({
    fullName: (savedAddress && savedAddress.fullName) || (user && user.name) || "",
    phone: (savedAddress && savedAddress.phone) || (user && user.phone) || "",
    email: (user && user.email) || "",
    city: (savedAddress && savedAddress.city) || "",
    address: (savedAddress && savedAddress.address) || "",
    orderNotes: "",
  }));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const subtotal = cart.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);

  // Display only: the server recalculates shipping and totals when the order is placed.
  const shippingFee = subtotal >= settings.freeShippingThreshold || subtotal === 0 ? 0 : settings.shippingFee;
  const grandTotal = subtotal + shippingFee;

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error as user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }

  function validate() {
    const newErrors = {};

    if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Please enter your full name.";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Please enter your phone number.";
    } else if (!PHONE_PATTERN.test(formData.phone.trim())) {
      newErrors.phone = "Please enter a valid phone number (10-20 digits, e.g. 0300 1234567).";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (formData.city.trim().length < 2) {
      newErrors.city = "Please provide your delivery city.";
    }

    if (formData.address.trim().length < 5) {
      newErrors.address = "Please enter your complete delivery street address.";
    }

    if (cart.length === 0) {
      newErrors.cart = "Your cart is empty. Please add products first.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting || !validate()) return;

    setSubmitting(true);
    try {
      await placeOrder(formData);
      // On success the app switches to the confirmation page.
    } catch (err) {
      setErrors(mapServerErrors(err));
      setSubmitting(false);
    }
  }

  if (cart.length === 0) {
    return (
      <section className="checkout-page">
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Cannot proceed to checkout</h2>
          <p>Your shopping bag has no items.</p>
          <button
            type="button"
            className="primary-btn"
            onClick={() => openPage("shop")}
          >
            Browse Cleaning Products →
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <div className="checkout-heading">
        <span className="section-label">SECURE CHECKOUT</span>
        <h1>Complete Your Order</h1>
        <p>
          Please provide your delivery address and choose a payment method.
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

      {errors.submit && (
        <div className="form-error-alert" role="alert">
          ⚠️ {errors.submit}
        </div>
      )}

      {errors.cart && (
        <div className="form-error-alert" role="alert">
          ⚠️ {errors.cart}
        </div>
      )}

      <div className="checkout-layout">
        {/* CUSTOMER FORM */}
        <form className="checkout-form" onSubmit={handleSubmit} noValidate>
          <h2>1. Delivery Information</h2>

          <div className="form-group">
            <label htmlFor="fullName">Full Name *</label>
            <input
              id="fullName"
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Tariq Mehmood"
              className={errors.fullName ? "input-error" : ""}
            />
            {errors.fullName && (
              <span className="error-message">{errors.fullName}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="0300 1234567"
                className={errors.phone ? "input-error" : ""}
              />
              {errors.phone && (
                <span className="error-message">{errors.phone}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tariq@example.com"
                className={errors.email ? "input-error" : ""}
              />
              {errors.email && (
                <span className="error-message">{errors.email}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="city">City / Region *</label>
            <input
              id="city"
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g. Lahore, Karachi, Islamabad..."
              className={errors.city ? "input-error" : ""}
            />
            {errors.city && <span className="error-message">{errors.city}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="address">Delivery Street Address *</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="House or apartment number, street name, landmarks..."
              className={errors.address ? "input-error" : ""}
            />
            {errors.address && (
              <span className="error-message">{errors.address}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="orderNotes">Order Notes (Optional)</label>
            <input
              id="orderNotes"
              type="text"
              name="orderNotes"
              value={formData.orderNotes}
              onChange={handleChange}
              placeholder="e.g. Please ring the doorbell or leave with guard"
            />
          </div>

          {/* PAYMENT METHOD: Cash on Delivery only for now. No card details are collected anywhere. */}
          <h2 className="payment-section-title">2. Payment Method</h2>
          <div className="payment-options">
            <label className="payment-option-card selected">
              <input type="radio" name="paymentMethod" value="cod" checked readOnly />
              <div className="payment-option-text">
                <strong>💵 Cash on Delivery (COD)</strong>
                <p>Pay in cash upon doorstep delivery. No advance payment required.</p>
              </div>
            </label>
          </div>

          <button type="submit" className="place-order-btn" disabled={submitting}>
            {submitting ? "Placing your order…" : `Place Order • Rs. ${grandTotal} →`}
          </button>
        </form>

        {/* ORDER SUMMARY */}
        <aside className="checkout-summary">
          <h2>Your Order ({cart.length} items)</h2>

          <div className="checkout-items-list">
            {cart.map((item) => (
              <div className="checkout-product" key={item.id}>
                <div className="checkout-product-info">
                  <h4>{item.name}</h4>
                  <span>
                    Qty: {item.quantity} × Rs. {item.price}
                  </span>
                </div>
                <strong>Rs. {item.price * item.quantity}</strong>
              </div>
            ))}
          </div>

          <div className="checkout-price-breakdown">
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

            <div className="checkout-total">
              <span>Total Due</span>
              <strong>Rs. {grandTotal}</strong>
            </div>
          </div>

          <p className="checkout-confirm-note">
            Prices, delivery fee and stock are confirmed by our server when you place the order.
          </p>

          <div className="checkout-back-link">
            <button
              type="button"
              className="link-btn"
              onClick={() => openPage("cart")}
            >
              ← Edit Shopping Bag
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default Checkout;