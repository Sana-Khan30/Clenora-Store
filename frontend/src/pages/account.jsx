import { useEffect, useState } from "react";
import { useAuth } from "../context/authContext";
import { useStore } from "../context/storeContext";
import { cancelMyOrder, changePassword, getMyOrders } from "../api/endpoints";

const STATUS_LABEL = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const EMPTY_ORDERS = { ownerId: null, items: [], page: 0, totalPages: 0, total: 0, loading: false, error: "" };
const EMPTY_ADDRESS = { label: "Home", fullName: "", phone: "", city: "", address: "" };

const badgeClass = (status) =>
  status === "delivered" ? "order-badge-complete" : status === "cancelled" ? "order-badge-cancelled" : "order-badge-live";
const formatDate = (iso) => new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

// Shows the server's field messages when there are any, otherwise the general message.
function errorText(err) {
  return err.errors && err.errors.length > 0 ? err.errors.map((e) => e.message).join(" ") : err.message;
}

function Account({ lastOrder, orderId, openPage }) {
  const { user, isLoggedIn, login, register, logout, updateProfile } = useAuth();
  const { settings } = useStore();

  const [activeTab, setActiveTab] = useState("overview");
  const [authModal, setAuthModal] = useState(null); // 'login' | 'register' | null
  const [toastMessage, setToastMessage] = useState("");

  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const userId = user ? user.id : null;
  const [orders, setOrders] = useState(EMPTY_ORDERS);
  const myOrders = orders.ownerId === userId ? orders : EMPTY_ORDERS;

  const [profileForm, setProfileForm] = useState(null); // null = show the saved values
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "" });
  const [addressForm, setAddressForm] = useState(null); // null = form closed
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  }

  // Load the first page of the customer's orders whenever a (different) user is signed in.
  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    getMyOrders({ page: 1, limit: 10 })
      .then((res) => {
        if (cancelled) return;
        setOrders({
          ownerId: userId,
          items: res.data.items,
          page: 1,
          totalPages: res.meta.totalPages,
          total: res.meta.total,
          loading: false,
          error: "",
        });
      })
      .catch((err) => {
        if (!cancelled) setOrders({ ...EMPTY_ORDERS, ownerId: userId, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function loadMoreOrders() {
    setOrders((prev) => ({ ...prev, loading: true }));
    try {
      const res = await getMyOrders({ page: myOrders.page + 1, limit: 10 });
      setOrders((prev) => ({
        ...prev,
        items: [...prev.items, ...res.data.items],
        page: prev.page + 1,
        totalPages: res.meta.totalPages,
        total: res.meta.total,
        loading: false,
      }));
    } catch (err) {
      setOrders((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  }

  async function handleCancelOrder(order) {
    if (!window.confirm(`Cancel order ${order.orderNumber}?`)) return;
    try {
      const res = await cancelMyOrder(order.id);
      setOrders((prev) => ({
        ...prev,
        items: prev.items.map((o) => (o.id === order.id ? { ...o, ...res.data.order } : o)),
      }));
      showToast(`Order ${order.orderNumber} was cancelled.`);
    } catch (err) {
      showToast(err.message);
    }
  }

  function openAuth(mode) {
    setAuthForm({ name: "", email: "", password: "" });
    setAuthError("");
    setAuthModal(mode);
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      if (authModal === "login") {
        await login(authForm.email, authForm.password);
        showToast("Signed in successfully.");
      } else {
        await register({ name: authForm.name, email: authForm.email, password: authForm.password });
        showToast("Account created. Welcome!");
      }
      setAuthModal(null);
    } catch (err) {
      setAuthError(errorText(err));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    await logout();
    setActiveTab("overview");
    showToast("You have been signed out.");
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      await updateProfile({ name: profileForm.name, phone: profileForm.phone });
      setProfileForm(null);
      showToast("Profile updated.");
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      await changePassword(passwordForm.current, passwordForm.next);
      setPasswordForm({ current: "", next: "" });
      showToast("Password changed.");
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveAddresses(addresses, message) {
    setBusy(true);
    setFormError("");
    try {
      const clean = addresses.map((a) => ({
        label: a.label,
        fullName: a.fullName,
        phone: a.phone,
        city: a.city,
        address: a.address,
        isDefault: Boolean(a.isDefault),
      }));
      await updateProfile({ addresses: clean });
      setAddressForm(null);
      showToast(message);
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function handleAddressAdd(e) {
    e.preventDefault();
    const existing = user.addresses || [];
    saveAddresses([...existing, { ...addressForm, isDefault: existing.length === 0 }], "Address saved.");
  }

  function handleAddressDefault(index) {
    saveAddresses(
      user.addresses.map((a, i) => ({ ...a, isDefault: i === index })),
      "Default address updated."
    );
  }

  function handleAddressRemove(index) {
    saveAddresses(
      user.addresses.filter((_, i) => i !== index),
      "Address removed."
    );
  }

  const profileValues = profileForm || { name: user ? user.name : "", phone: user ? user.phone || "" : "" };
  const SignInPrompt = (
    <div className="account-signin-prompt">
      <p>Please sign in to see this section.</p>
      <button type="button" className="primary-btn sm" onClick={() => openAuth("login")}>
        Sign In
      </button>
    </div>
  );

  return (
    <section className="account-page">
      <div className="page-heading">
        <span className="section-label">MY CLEANY ACCOUNT</span>
        <h1>Account Dashboard</h1>
        <p>Manage your orders, delivery preferences, and profile settings.</p>
      </div>

      {toastMessage && (
        <div className="account-toast-alert" role="status">
          ℹ️ {toastMessage}
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="account-nav-tabs">
        <button
          type="button"
          className={`account-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          👤 Overview
        </button>
        <button
          type="button"
          className={`account-tab-btn ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          📦 Order History {!isLoggedIn && lastOrder && <span className="tab-dot" />}
        </button>
        <button
          type="button"
          className={`account-tab-btn ${activeTab === "addresses" ? "active" : ""}`}
          onClick={() => setActiveTab("addresses")}
        >
          📍 Saved Addresses
        </button>
        <button
          type="button"
          className={`account-tab-btn ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          ⚙️ Settings
        </button>
      </div>

      <div className="account-content-card">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="account-overview">
            <div className="profile-banner">
              <div className="profile-avatar">✨</div>
              <div className="profile-meta">
                {isLoggedIn ? (
                  <>
                    <h2>Welcome, {user.name}!</h2>
                    <p>
                      {user.email} • Customer since {new Date(user.createdAt).getFullYear()}
                    </p>
                    <div className="auth-action-buttons">
                      {user.role === "admin" && (
                        <button type="button" className="primary-btn sm" onClick={() => openPage("admin")}>
                          🛡️ Admin Portal
                        </button>
                      )}
                      <button type="button" className="secondary-btn sm" onClick={handleLogout}>
                        Sign Out
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2>Welcome, Clean Home Enthusiast!</h2>
                    <p>Guest Shopper • Sign in to save your orders and addresses</p>
                    <div className="auth-action-buttons">
                      <button type="button" className="primary-btn sm" onClick={() => openAuth("login")}>
                        Sign In
                      </button>
                      <button type="button" className="secondary-btn sm" onClick={() => openAuth("register")}>
                        Create Account
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="overview-stats-grid">
              <div className="stat-card">
                <span className="stat-icon">📦</span>
                <strong>{isLoggedIn ? myOrders.total : lastOrder ? "1" : "0"}</strong>
                <p>{isLoggedIn ? "Total Orders" : "Recent Orders"}</p>
              </div>
              <div className="stat-card">
                <span className="stat-icon">🚚</span>
                <strong>Rs. {settings.freeShippingThreshold}</strong>
                <p>Free Delivery Over</p>
              </div>
              <div className="stat-card">
                <span className="stat-icon">💵</span>
                <strong>COD</strong>
                <p>Payment Method</p>
              </div>
            </div>

            {settings.whatsappLink && (
              <div className="quick-help-card">
                <h3>Need Assistance?</h3>
                <p>
                  Chat with our team for product recommendations, bulk ordering, or delivery status.
                </p>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => window.open(settings.whatsappLink, "_blank", "noopener,noreferrer")}
                >
                  💬 Chat on WhatsApp
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ORDER HISTORY */}
        {activeTab === "orders" && (
          <div className="account-orders">
            <h2>Order History</h2>
            <p className="subtext">Track current deliveries and past purchases.</p>

            {!isLoggedIn && (
              <>
                {lastOrder && (
                  <div className="order-history-item active-order">
                    <div className="order-item-header">
                      <div>
                        <span className="order-badge-live">Placed</span>
                        <h3 className="order-id-title">Order #{orderId}</h3>
                        <p className="order-date">Placed just now</p>
                      </div>
                      <div className="order-recipient-summary">
                        <strong>Recipient: {lastOrder.fullName}</strong>
                        <p>
                          {lastOrder.address}, {lastOrder.city}
                        </p>
                        <p>Phone: {lastOrder.phone}</p>
                      </div>
                    </div>
                    <div className="order-actions-bar">
                      <button type="button" className="primary-btn sm" onClick={() => openPage("success")}>
                        View Receipt Details →
                      </button>
                    </div>
                  </div>
                )}
                <p className="subtext">Sign in to see your full order history on any device.</p>
                {SignInPrompt}
              </>
            )}

            {isLoggedIn && (
              <>
                {myOrders.error && <p className="auth-form-error">{myOrders.error}</p>}
                {!myOrders.error && myOrders.page === 0 && <p className="subtext">Loading your orders…</p>}
                {myOrders.page > 0 && myOrders.items.length === 0 && (
                  <p className="subtext">You have not placed any orders yet.</p>
                )}

                {myOrders.items.map((order) => (
                  <div className="order-history-item" key={order.id}>
                    <div className="order-item-header">
                      <div>
                        <span className={badgeClass(order.status)}>{STATUS_LABEL[order.status]}</span>
                        <h3 className="order-id-title">Order #{order.orderNumber}</h3>
                        <p className="order-date">Placed {formatDate(order.createdAt)}</p>
                      </div>
                      <div className="order-recipient-summary">
                        <strong>Total: Rs. {order.total}</strong>
                        <p>Items: {order.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}</p>
                        <p>
                          {order.customer.address}, {order.customer.city}
                        </p>
                        <p>Cash on Delivery • Payment {order.paymentStatus}</p>
                      </div>
                    </div>
                    {order.status === "pending" && (
                      <div className="order-actions-bar">
                        <button type="button" className="secondary-btn sm" onClick={() => handleCancelOrder(order)}>
                          Cancel Order
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {myOrders.page > 0 && myOrders.page < myOrders.totalPages && (
                  <button type="button" className="secondary-btn sm" onClick={loadMoreOrders} disabled={myOrders.loading}>
                    {myOrders.loading ? "Loading…" : "Load more orders"}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: ADDRESSES */}
        {activeTab === "addresses" && (
          <div className="account-addresses">
            <h2>Saved Addresses</h2>
            <p className="subtext">Addresses used for express checkout.</p>

            {!isLoggedIn ? (
              SignInPrompt
            ) : (
              <>
                {formError && <p className="auth-form-error">{formError}</p>}
                <div className="address-cards-grid">
                  {(user.addresses || []).map((a, index) => (
                    <div className={`address-card ${a.isDefault ? "default" : ""}`} key={a.id || index}>
                      <span className="address-type-badge">
                        {a.label || "Address"}
                        {a.isDefault ? " (Primary)" : ""}
                      </span>
                      <h4>{a.fullName}</h4>
                      <p>{a.address}</p>
                      <p>{a.city}, Pakistan</p>
                      <p>Phone: {a.phone}</p>
                      <div className="address-actions">
                        {!a.isDefault && (
                          <button type="button" className="link-btn" disabled={busy} onClick={() => handleAddressDefault(index)}>
                            Make primary
                          </button>
                        )}
                        <button type="button" className="link-btn" disabled={busy} onClick={() => handleAddressRemove(index)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  {(user.addresses || []).length < 5 && !addressForm && (
                    <div className="add-address-card">
                      <button
                        type="button"
                        className="add-address-btn"
                        onClick={() => {
                          setFormError("");
                          setAddressForm({ ...EMPTY_ADDRESS, fullName: user.name, phone: user.phone || "" });
                        }}
                      >
                        + Add New Address
                      </button>
                    </div>
                  )}
                </div>

                {addressForm && (
                  <form className="auth-form account-inline-form" onSubmit={handleAddressAdd}>
                    {["label", "fullName", "phone", "city", "address"].map((field) => (
                      <div className="form-group" key={field}>
                        <label htmlFor={`addr-${field}`}>
                          {{ label: "Label (e.g. Home, Office)", fullName: "Full name", phone: "Phone", city: "City", address: "Street address" }[field]}
                        </label>
                        <input
                          id={`addr-${field}`}
                          type="text"
                          value={addressForm[field]}
                          onChange={(e) => setAddressForm({ ...addressForm, [field]: e.target.value })}
                          required={field !== "label"}
                        />
                      </div>
                    ))}
                    <div className="auth-action-buttons">
                      <button type="submit" className="primary-btn sm" disabled={busy}>
                        {busy ? "Saving…" : "Save Address"}
                      </button>
                      <button type="button" className="secondary-btn sm" onClick={() => setAddressForm(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === "settings" && (
          <div className="account-settings">
            <h2>Account Preferences</h2>

            {!isLoggedIn ? (
              SignInPrompt
            ) : (
              <>
                {formError && <p className="auth-form-error">{formError}</p>}

                <form className="auth-form account-inline-form" onSubmit={handleProfileSave}>
                  <h3>Profile</h3>
                  <div className="form-group">
                    <label htmlFor="profile-name">Full name</label>
                    <input
                      id="profile-name"
                      type="text"
                      value={profileValues.name}
                      onChange={(e) => setProfileForm({ ...profileValues, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="profile-phone">Phone</label>
                    <input
                      id="profile-phone"
                      type="text"
                      value={profileValues.phone}
                      onChange={(e) => setProfileForm({ ...profileValues, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="profile-email">Email (cannot be changed)</label>
                    <input id="profile-email" type="email" value={user.email} disabled readOnly />
                  </div>
                  <button type="submit" className="primary-btn sm" disabled={busy || !profileForm}>
                    {busy ? "Saving…" : "Save Profile"}
                  </button>
                </form>

                <form className="auth-form account-inline-form" onSubmit={handlePasswordSave}>
                  <h3>Change Password</h3>
                  <div className="form-group">
                    <label htmlFor="pw-current">Current password</label>
                    <input
                      id="pw-current"
                      type="password"
                      autoComplete="current-password"
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pw-next">New password (8+ characters, with a letter and a number)</label>
                    <input
                      id="pw-next"
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.next}
                      onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="primary-btn sm" disabled={busy}>
                    {busy ? "Saving…" : "Change Password"}
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>

      {/* LOGIN / REGISTER MODAL */}
      {authModal && (
        <div className="modal-backdrop-overlay" onClick={() => setAuthModal(null)}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{authModal === "login" ? "Sign In to CLEANY" : "Create CLEANY Account"}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setAuthModal(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {authError && (
                <p className="auth-form-error" role="alert">
                  {authError}
                </p>
              )}

              <form onSubmit={handleAuthSubmit} className="auth-form">
                {authModal === "register" && (
                  <div className="form-group">
                    <label htmlFor="auth-name">Full Name</label>
                    <input
                      id="auth-name"
                      type="text"
                      placeholder="e.g. Sara Khan"
                      value={authForm.name}
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="auth-email">Email Address</label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="auth-password">Password</label>
                  <input
                    id="auth-password"
                    type="password"
                    autoComplete={authModal === "login" ? "current-password" : "new-password"}
                    placeholder={authModal === "register" ? "8+ characters, a letter and a number" : "Your password"}
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    required
                  />
                </div>

                <button type="submit" className="primary-btn full-width" disabled={authBusy}>
                  {authBusy ? "Please wait…" : authModal === "login" ? "Sign In" : "Register Account"}
                </button>
              </form>

              <div className="auth-toggle-link">
                {authModal === "login" ? (
                  <p>
                    Don&apos;t have an account?{" "}
                    <button type="button" className="link-btn" onClick={() => openAuth("register")}>
                      Create one
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{" "}
                    <button type="button" className="link-btn" onClick={() => openAuth("login")}>
                      Sign In
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Account;
