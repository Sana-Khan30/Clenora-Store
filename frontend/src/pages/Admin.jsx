import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/authContext";
import { useStore } from "../context/storeContext";
import * as api from "../api/endpoints";
import { buildWhatsAppLink } from "../utils/whatsapp";
import "./Admin.css";

const ORDER_STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const ALLOWED_STATUS_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export default function Admin({ openPage }) {
  const { user, isAdmin, adminLogin, logout } = useAuth();
  const { refresh, settings: publicSettings } = useStore();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [toast, setToast] = useState({ message: "", type: "success" });

  // Admin login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 4000);
  }

  /* ----------------------------------------------------
     DASHBOARD STATE & DATA
  ---------------------------------------------------- */
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const res = await api.getDashboardStats();
      setDashboardData(res.data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  /* ----------------------------------------------------
     PRODUCTS STATE & DATA
  ---------------------------------------------------- */
  const [productsList, setProductsList] = useState([]);
  const [productsMeta, setProductsMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [productsLoading, setProductsLoading] = useState(false);
  const [productFilters, setProductFilters] = useState({
    search: "",
    category: "",
    status: "all",
    stock: "all",
    sort: "newest",
    page: 1,
  });

  // Product modal (Add / Edit)
  const [productModal, setProductModal] = useState(null); // 'create' | product object | null
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    category: "",
    regularPrice: "",
    salePrice: "",
    stock: 0,
    lowStockThreshold: 5,
    description: "",
    badge: "",
    images: [],
    isActive: true,
    isFeatured: false,
    isBestSeller: false,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productSaving, setProductSaving] = useState(false);

  const loadAdminProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const params = {
        page: productFilters.page,
        limit: 20,
        sort: productFilters.sort,
      };
      if (productFilters.search) params.search = productFilters.search;
      if (productFilters.category) params.category = productFilters.category;
      if (productFilters.status !== "all") params.status = productFilters.status;
      if (productFilters.stock !== "all") params.stock = productFilters.stock;

      const res = await api.adminGetProducts(params);
      setProductsList(res.data.items);
      setProductsMeta(res.meta);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setProductsLoading(false);
    }
  }, [productFilters]);

  /* ----------------------------------------------------
     CATEGORIES STATE & DATA
  ---------------------------------------------------- */
  const [categoriesList, setCategoriesList] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryModal, setCategoryModal] = useState(null); // 'create' | category object | null
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    icon: "",
    sortOrder: 0,
    isActive: true,
  });
  const [categorySaving, setCategorySaving] = useState(false);

  const loadAdminCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = await api.adminGetCategories();
      setCategoriesList(res.data.items);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  /* ----------------------------------------------------
     INVENTORY STATE & DATA
  ---------------------------------------------------- */
  const [inventoryTransactions, setInventoryTransactions] = useState([]);
  const [inventoryMeta, setInventoryMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [adjustModal, setAdjustModal] = useState(null); // product object | null
  const [adjustForm, setAdjustForm] = useState({ change: "", reason: "" });
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [inventoryFilter, setInventoryFilter] = useState({ type: "", page: 1 });

  const loadInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const params = { page: inventoryFilter.page, limit: 20 };
      if (inventoryFilter.type) params.type = inventoryFilter.type;
      const res = await api.adminGetInventoryTransactions(params);
      setInventoryTransactions(res.data.items);
      setInventoryMeta(res.meta);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setInventoryLoading(false);
    }
  }, [inventoryFilter]);

  /* ----------------------------------------------------
     ORDERS STATE & DATA
  ---------------------------------------------------- */
  const [ordersList, setOrdersList] = useState([]);
  const [ordersMeta, setOrdersMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilters, setOrderFilters] = useState({ search: "", status: "", page: 1 });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusUpdateNote, setStatusUpdateNote] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadAdminOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const params = { page: orderFilters.page, limit: 20 };
      if (orderFilters.search) params.search = orderFilters.search;
      if (orderFilters.status) params.status = orderFilters.status;

      const res = await api.adminGetOrders(params);
      setOrdersList(res.data.items);
      setOrdersMeta(res.meta);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setOrdersLoading(false);
    }
  }, [orderFilters]);

  /* ----------------------------------------------------
     CUSTOMERS STATE & DATA
  ---------------------------------------------------- */
  const [customersList, setCustomersList] = useState([]);
  const [customersMeta, setCustomersMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerFilters, setCustomerFilters] = useState({ search: "", status: "all", page: 1 });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerOrdersLoading, setCustomerOrdersLoading] = useState(false);

  const loadAdminCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const params = { page: customerFilters.page, limit: 20 };
      if (customerFilters.search) params.search = customerFilters.search;
      if (customerFilters.status !== "all") params.status = customerFilters.status;

      const res = await api.adminGetCustomers(params);
      setCustomersList(res.data.items);
      setCustomersMeta(res.meta);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setCustomersLoading(false);
    }
  }, [customerFilters]);

  /* ----------------------------------------------------
     SETTINGS STATE & DATA
  ---------------------------------------------------- */
  const [settingsForm, setSettingsForm] = useState({
    storeName: "CLENORA",
    whatsappNumber: "",
    shippingFee: 150,
    freeShippingThreshold: 1500,
    currency: "PKR",
    currencySymbol: "Rs.",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  const loadAdminSettings = useCallback(async () => {
    try {
      const res = await api.adminGetSettings();
      if (res.data?.settings) {
        setSettingsForm({
          storeName: res.data.settings.storeName || "CLENORA",
          whatsappNumber: res.data.settings.whatsappNumber || "",
          shippingFee: res.data.settings.shippingFee ?? 150,
          freeShippingThreshold: res.data.settings.freeShippingThreshold ?? 1500,
          currency: res.data.settings.currency || "PKR",
          currencySymbol: res.data.settings.currencySymbol || "Rs.",
        });
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  }, []);

  /* ----------------------------------------------------
     TAB SWITCH EFFECT
  ---------------------------------------------------- */
  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === "dashboard") loadDashboard();
    if (activeTab === "products") {
      loadAdminProducts();
      loadAdminCategories();
    }
    if (activeTab === "categories") loadAdminCategories();
    if (activeTab === "inventory") {
      loadInventory();
      loadAdminProducts();
    }
    if (activeTab === "orders") loadAdminOrders();
    if (activeTab === "customers") loadAdminCustomers();
    if (activeTab === "settings") loadAdminSettings();
  }, [
    isAdmin,
    activeTab,
    loadDashboard,
    loadAdminProducts,
    loadAdminCategories,
    loadInventory,
    loadAdminOrders,
    loadAdminCustomers,
    loadAdminSettings,
  ]);

  /* ----------------------------------------------------
     LOGIN HANDLER
  ---------------------------------------------------- */
  async function handleAdminLogin(e) {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      await adminLogin(loginEmail.trim(), loginPassword);
      showToast("Admin access granted.");
    } catch (err) {
      setLoginError(err.message || "Invalid credentials or unauthorized role.");
    } finally {
      setLoginBusy(false);
    }
  }

  /* ----------------------------------------------------
     PRODUCT ACTIONS
  ---------------------------------------------------- */
  function openCreateProduct() {
    setProductForm({
      name: "",
      sku: "",
      category: categoriesList[0]?.id || "",
      regularPrice: "",
      salePrice: "",
      stock: 10,
      lowStockThreshold: 5,
      description: "",
      badge: "",
      images: [],
      isActive: true,
      isFeatured: false,
      isBestSeller: false,
    });
    setProductModal("create");
  }

  function openEditProduct(p) {
    setProductForm({
      name: p.name,
      sku: p.sku,
      category: p.category?.id || p.category || "",
      regularPrice: p.regularPrice,
      salePrice: p.salePrice || "",
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      description: p.description || "",
      badge: p.badge || "",
      images: p.images || [],
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      isBestSeller: p.isBestSeller,
    });
    setProductModal(p);
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await api.adminUploadImage(file);
      const newImg = res.data.image; // { url, publicId }
      setProductForm((prev) => ({
        ...prev,
        images: [...prev.images, newImg],
      }));
      showToast("Image uploaded successfully.");
    } catch (err) {
      showToast(err.message || "Image upload failed.", "error");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  function removeProductImage(index) {
    setProductForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }

  async function handleSaveProduct(e) {
    e.preventDefault();
    setProductSaving(true);
    try {
      const payload = {
        name: productForm.name.trim(),
        sku: productForm.sku.trim(),
        category: productForm.category,
        regularPrice: Number(productForm.regularPrice),
        salePrice: productForm.salePrice ? Number(productForm.salePrice) : null,
        lowStockThreshold: Number(productForm.lowStockThreshold),
        description: productForm.description.trim(),
        badge: productForm.badge.trim(),
        images: productForm.images,
        isActive: Boolean(productForm.isActive),
        isFeatured: Boolean(productForm.isFeatured),
        isBestSeller: Boolean(productForm.isBestSeller),
      };

      if (productModal === "create") {
        payload.stock = Number(productForm.stock);
        await api.adminCreateProduct(payload);
        showToast("Product created successfully.");
      } else {
        await api.adminUpdateProduct(productModal.id, payload);
        showToast("Product updated successfully.");
      }
      setProductModal(null);
      loadAdminProducts();
      refresh(); // update storefront
    } catch (err) {
      showToast(err.message || "Failed to save product", "error");
    } finally {
      setProductSaving(false);
    }
  }

  async function handleDeleteProduct(p) {
    if (!window.confirm(`Are you sure you want to delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api.adminDeleteProduct(p.id);
      showToast("Product deleted.");
      loadAdminProducts();
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function toggleProductStatus(p) {
    try {
      await api.adminUpdateProduct(p.id, { isActive: !p.isActive });
      showToast(`Product ${!p.isActive ? "activated" : "deactivated"}.`);
      loadAdminProducts();
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  /* ----------------------------------------------------
     CATEGORY ACTIONS
  ---------------------------------------------------- */
  function openCreateCategory() {
    setCategoryForm({ name: "", description: "", icon: "✨", sortOrder: 0, isActive: true });
    setCategoryModal("create");
  }

  function openEditCategory(c) {
    setCategoryForm({
      name: c.name,
      description: c.description || "",
      icon: c.icon || "",
      sortOrder: c.sortOrder || 0,
      isActive: c.isActive,
    });
    setCategoryModal(c);
  }

  async function handleSaveCategory(e) {
    e.preventDefault();
    setCategorySaving(true);
    try {
      const payload = {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
        icon: categoryForm.icon.trim(),
        sortOrder: Number(categoryForm.sortOrder),
        isActive: Boolean(categoryForm.isActive),
      };
      if (categoryModal === "create") {
        await api.adminCreateCategory(payload);
        showToast("Category created.");
      } else {
        await api.adminUpdateCategory(categoryModal.id, payload);
        showToast("Category updated.");
      }
      setCategoryModal(null);
      loadAdminCategories();
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setCategorySaving(false);
    }
  }

  async function handleDeleteCategory(c) {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try {
      await api.adminDeleteCategory(c.id);
      showToast("Category deleted.");
      loadAdminCategories();
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  /* ----------------------------------------------------
     INVENTORY ADJUSTMENT
  ---------------------------------------------------- */
  async function handleAdjustStock(e) {
    e.preventDefault();
    setAdjustSaving(true);
    try {
      const changeNum = Number(adjustForm.change);
      if (!changeNum || Number.isNaN(changeNum)) throw new Error("Enter a valid non-zero adjustment amount.");
      if (!adjustForm.reason.trim()) throw new Error("Please enter a short reason for this adjustment.");

      await api.adminAdjustInventory({
        productId: adjustModal.id,
        change: changeNum,
        reason: adjustForm.reason.trim(),
      });
      showToast("Stock adjusted successfully.");
      setAdjustModal(null);
      setAdjustForm({ change: "", reason: "" });
      loadInventory();
      loadAdminProducts();
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setAdjustSaving(false);
    }
  }

  /* ----------------------------------------------------
     ORDER STATUS UPDATE
  ---------------------------------------------------- */
  async function handleUpdateOrderStatus(orderId, newStatus) {
    setStatusUpdating(true);
    try {
      const res = await api.adminUpdateOrderStatus(orderId, newStatus, statusUpdateNote.trim());
      showToast(`Order status updated to ${newStatus}.`);
      setSelectedOrder(res.data.order);
      setStatusUpdateNote("");
      loadAdminOrders();
      if (activeTab === "dashboard") loadDashboard();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setStatusUpdating(false);
    }
  }

  /* ----------------------------------------------------
     CUSTOMER ACTIONS
  ---------------------------------------------------- */
  async function handleToggleCustomerStatus(cust) {
    const nextStatus = !cust.isActive;
    try {
      await api.adminSetCustomerStatus(cust.id, nextStatus);
      showToast(`Customer account ${nextStatus ? "activated" : "deactivated"}.`);
      loadAdminCustomers();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function openCustomerOrders(cust) {
    setSelectedCustomer(cust);
    setCustomerOrdersLoading(true);
    try {
      const res = await api.adminGetCustomerOrders(cust.id, { page: 1, limit: 50 });
      setCustomerOrders(res.data.items);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setCustomerOrdersLoading(false);
    }
  }

  /* ----------------------------------------------------
     SETTINGS SAVE
  ---------------------------------------------------- */
  async function handleSaveSettings(e) {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const payload = {
        storeName: settingsForm.storeName.trim(),
        whatsappNumber: settingsForm.whatsappNumber.trim(),
        shippingFee: Number(settingsForm.shippingFee),
        freeShippingThreshold: Number(settingsForm.freeShippingThreshold),
        currency: settingsForm.currency.trim().toUpperCase(),
        currencySymbol: settingsForm.currencySymbol.trim(),
      };
      await api.adminUpdateSettings(payload);
      showToast("Store settings saved successfully.");
      refresh(); // update client store context
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSettingsSaving(false);
    }
  }

  /* ====================================================
     RENDER: NOT LOGGED IN AS ADMIN
  ==================================================== */
  if (!isAdmin) {
    return (
      <section className="admin-page">
        <div className="admin-card" style={{ maxWidth: 440, margin: "60px auto" }}>
          <div className="admin-card-header" style={{ justifyContent: "center", textAlign: "center" }}>
            <h2>🛡️ Clenora Admin Portal</h2>
            <p style={{ color: "var(--muted)", margin: "4px 0 0" }}>
              Sign in with your verified administrator credentials.
            </p>
          </div>

          {loginError && (
            <div className="admin-alert-banner error" role="alert">
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="admin-form-group">
            <div className="admin-form-group" style={{ marginBottom: 14 }}>
              <label htmlFor="admin-email">Admin Email Address</label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@clenora.com"
              />
            </div>

            <div className="admin-form-group" style={{ marginBottom: 20 }}>
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>

            <button type="submit" className="primary-btn" disabled={loginBusy} style={{ width: "100%" }}>
              {loginBusy ? "Verifying Credentials…" : "Authenticate as Admin →"}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <button type="button" className="link-btn" onClick={() => openPage("home")}>
              ← Return to Clenora Storefront
            </button>
          </div>
        </div>
      </section>
    );
  }

  /* ====================================================
     RENDER: AUTHENTICATED ADMIN PANEL
  ==================================================== */
  const currencySym = publicSettings?.currencySymbol || "Rs.";

  return (
    <section className="admin-page">
      {/* Toast Notification */}
      {toast.message && (
        <div className={`admin-alert-banner ${toast.type}`} style={{ position: "fixed", top: 20, right: 20, zIndex: 2000, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
          {toast.type === "success" ? "✓" : "⚠️"} {toast.message}
        </div>
      )}

      {/* Admin Header */}
      <header className="admin-header">
        <div>
          <h1>
            <span>🛡️ Clenora Management</span>
            <span className="admin-badge">Admin</span>
          </h1>
          <p style={{ color: "var(--muted)", margin: "4px 0 0" }}>
            Logged in as <strong>{user?.name}</strong> ({user?.email})
          </p>
        </div>

        <div className="admin-user-info">
          <button type="button" className="secondary-btn sm" onClick={() => openPage("home")}>
            👁️ View Storefront
          </button>
          <button
            type="button"
            className="secondary-btn sm"
            onClick={async () => {
              await logout();
              showToast("Signed out.");
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Admin Nav Tabs */}
      <nav className="admin-nav-tabs" aria-label="Admin Navigation">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          📊 Dashboard
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "products" ? "active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          📦 Products
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "categories" ? "active" : ""}`}
          onClick={() => setActiveTab("categories")}
        >
          🏷️ Categories
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "inventory" ? "active" : ""}`}
          onClick={() => setActiveTab("inventory")}
        >
          📈 Inventory
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          🛒 Orders
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "customers" ? "active" : ""}`}
          onClick={() => setActiveTab("customers")}
        >
          👥 Customers
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          ⚙️ Settings
        </button>
      </nav>

      {/* ====================================================
          TAB 1: DASHBOARD
      ==================================================== */}
      {activeTab === "dashboard" && (
        <div className="admin-dashboard-view">
          {dashboardLoading && !dashboardData ? (
            <p>Loading dashboard metrics…</p>
          ) : dashboardData ? (
            <>
              {/* Stat Boxes */}
              <div className="admin-stats-grid">
                <div className="admin-stat-box">
                  <div className="admin-stat-icon">💰</div>
                  <div className="admin-stat-meta">
                    <strong>
                      {currencySym} {dashboardData.sales?.totalSales?.toLocaleString()}
                    </strong>
                    <span>Total Order Sales</span>
                    <small>Delivered: {currencySym} {dashboardData.sales?.deliveredSales?.toLocaleString()}</small>
                  </div>
                </div>

                <div className="admin-stat-box">
                  <div className="admin-stat-icon">🛒</div>
                  <div className="admin-stat-meta">
                    <strong>{dashboardData.orders?.total || 0}</strong>
                    <span>Total Orders</span>
                    <small>Pending: {dashboardData.orders?.pending || 0}</small>
                  </div>
                </div>

                <div className="admin-stat-box">
                  <div className="admin-stat-icon">👥</div>
                  <div className="admin-stat-meta">
                    <strong>{dashboardData.customers?.total || 0}</strong>
                    <span>Registered Customers</span>
                    <small>Active accounts</small>
                  </div>
                </div>

                <div className="admin-stat-box">
                  <div className="admin-stat-icon">📦</div>
                  <div className="admin-stat-meta">
                    <strong>{dashboardData.products?.total || 0}</strong>
                    <span>Catalog Products</span>
                    <small>
                      {dashboardData.products?.lowStock || 0} Low Stock • {dashboardData.products?.outOfStock || 0} Out
                    </small>
                  </div>
                </div>
              </div>

              {/* Order Status Breakdown */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3>Order Fulfillment Overview</h3>
                </div>
                <div className="admin-status-summary-grid">
                  {Object.entries(dashboardData.orders?.byStatus || {}).map(([st, cnt]) => (
                    <div key={st} className="admin-status-pill-box">
                      <div className="num">{cnt}</div>
                      <div className={`status-tag ${st}`} style={{ marginTop: 6 }}>
                        {ORDER_STATUS_LABELS[st] || st}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 14-Day Sales Sparkline */}
              {dashboardData.sales?.daily?.length > 0 && (
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h3>14-Day Sales Activity</h3>
                    <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                      Avg Order Value: {currencySym} {dashboardData.sales?.averageOrderValue || 0}
                    </span>
                  </div>
                  <div className="admin-chart-bars">
                    {(() => {
                      const maxDaily = Math.max(1, ...dashboardData.sales.daily.map((d) => d.sales));
                      return dashboardData.sales.daily.map((d) => (
                        <div key={d.date} className="admin-chart-col" title={`${d.date}: ${currencySym} ${d.sales} (${d.orders} orders)`}>
                          <div
                            className="admin-chart-bar-fill"
                            style={{ height: `${Math.max(6, Math.round((d.sales / maxDaily) * 100))}%` }}
                          />
                          <span className="admin-chart-date-label">{d.date.slice(5)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Grid: Low Stock Alert & Recent Orders */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
                {/* Low Stock Alerts */}
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h3>⚠️ Low-Stock Warnings</h3>
                    <button type="button" className="admin-sm-btn secondary" onClick={() => setActiveTab("inventory")}>
                      Manage Stock →
                    </button>
                  </div>
                  {dashboardData.lowStockProducts?.length === 0 ? (
                    <p style={{ color: "var(--muted)" }}>No low stock alerts. Inventory levels are healthy.</p>
                  ) : (
                    <div className="admin-table-wrapper">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Stock</th>
                            <th>Threshold</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.lowStockProducts.map((p) => (
                            <tr key={p.id}>
                              <td><strong>{p.name}</strong></td>
                              <td>{p.sku}</td>
                              <td><span className="status-tag low">{p.stock} units</span></td>
                              <td>{p.lowStockThreshold}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Recent Orders */}
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h3>Recent Customer Orders</h3>
                    <button type="button" className="admin-sm-btn secondary" onClick={() => setActiveTab("orders")}>
                      All Orders →
                    </button>
                  </div>
                  {dashboardData.recentOrders?.length === 0 ? (
                    <p style={{ color: "var(--muted)" }}>No orders placed yet.</p>
                  ) : (
                    <div className="admin-table-wrapper">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Order #</th>
                            <th>Customer</th>
                            <th>Total</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.recentOrders.map((o) => (
                            <tr key={o._id}>
                              <td><strong>{o.orderNumber}</strong></td>
                              <td>{o.customer?.fullName}</td>
                              <td>{currencySym} {o.total}</td>
                              <td><span className={`status-tag ${o.status}`}>{ORDER_STATUS_LABELS[o.status] || o.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ====================================================
          TAB 2: PRODUCTS
      ==================================================== */}
      {activeTab === "products" && (
        <div className="admin-products-view">
          <div className="admin-card">
            <div className="admin-card-header">
              <h2>Product Catalog Management</h2>
              <button type="button" className="primary-btn sm" onClick={openCreateProduct}>
                + Add New Product
              </button>
            </div>

            {/* Filters */}
            <div className="admin-filter-bar">
              <input
                type="text"
                placeholder="Search name, description, SKU…"
                value={productFilters.search}
                onChange={(e) => setProductFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
                style={{ minWidth: 220 }}
              />

              <select
                value={productFilters.category}
                onChange={(e) => setProductFilters((prev) => ({ ...prev, category: e.target.value, page: 1 }))}
              >
                <option value="">All Categories</option>
                {categoriesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={productFilters.stock}
                onChange={(e) => setProductFilters((prev) => ({ ...prev, stock: e.target.value, page: 1 }))}
              >
                <option value="all">All Stock Statuses</option>
                <option value="in">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>

              <select
                value={productFilters.status}
                onChange={(e) => setProductFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
              >
                <option value="all">Active & Inactive</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              <select
                value={productFilters.sort}
                onChange={(e) => setProductFilters((prev) => ({ ...prev, sort: e.target.value, page: 1 }))}
              >
                <option value="newest">Newest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="stock-asc">Stock: Low to High</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>

            {/* Table */}
            {productsLoading ? (
              <p>Loading products…</p>
            ) : productsList.length === 0 ? (
              <p style={{ color: "var(--muted)", padding: "20px 0" }}>No products match your criteria.</p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Product Name</th>
                      <th>SKU</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsList.map((p) => {
                      const img = p.images?.[0]?.url || "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=600&q=80";
                      return (
                        <tr key={p.id}>
                          <td>
                            <img src={img} alt={p.name} style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover" }} />
                          </td>
                          <td>
                            <strong>{p.name}</strong>
                            {p.badge && <span className="admin-badge" style={{ marginLeft: 6, fontSize: "0.65rem" }}>{p.badge}</span>}
                          </td>
                          <td><code>{p.sku}</code></td>
                          <td>{p.category?.name || "—"}</td>
                          <td>
                            <strong>{currencySym} {p.price}</strong>
                            {p.salePrice && <span style={{ textDecoration: "line-through", color: "var(--muted)", marginLeft: 6, fontSize: "0.8rem" }}>{currencySym} {p.regularPrice}</span>}
                          </td>
                          <td>
                            <span className={`status-tag ${p.stockStatus}`}>
                              {p.stock} units
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`status-tag ${p.isActive ? "active" : "inactive"}`}
                              style={{ cursor: "pointer", border: "none" }}
                              onClick={() => toggleProductStatus(p)}
                              title="Click to toggle visibility"
                            >
                              {p.isActive ? "Active" : "Deactivated"}
                            </button>
                          </td>
                          <td>
                            <div className="admin-btn-row">
                              <button type="button" className="admin-sm-btn secondary" onClick={() => openEditProduct(p)}>
                                Edit
                              </button>
                              <button
                                type="button"
                                className="admin-sm-btn primary"
                                onClick={() => {
                                  setAdjustModal(p);
                                  setAdjustForm({ change: "", reason: "" });
                                }}
                              >
                                Stock
                              </button>
                              <button type="button" className="admin-sm-btn danger" onClick={() => handleDeleteProduct(p)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {productsMeta.totalPages > 1 && (
              <div className="admin-pagination-row">
                <span>
                  Showing page {productsMeta.page} of {productsMeta.totalPages} ({productsMeta.total} total products)
                </span>
                <div className="admin-btn-row">
                  <button
                    type="button"
                    className="admin-sm-btn secondary"
                    disabled={productsMeta.page <= 1}
                    onClick={() => setProductFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    className="admin-sm-btn secondary"
                    disabled={productsMeta.page >= productsMeta.totalPages}
                    onClick={() => setProductFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================
          TAB 3: CATEGORIES
      ==================================================== */}
      {activeTab === "categories" && (
        <div className="admin-categories-view">
          <div className="admin-card">
            <div className="admin-card-header">
              <h2>Product Categories Management</h2>
              <button type="button" className="primary-btn sm" onClick={openCreateCategory}>
                + Add New Category
              </button>
            </div>

            {categoriesLoading ? (
              <p>Loading categories…</p>
            ) : categoriesList.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No categories found.</p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Icon</th>
                      <th>Category Name</th>
                      <th>Slug</th>
                      <th>Products</th>
                      <th>Sort Order</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoriesList.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontSize: "1.4rem" }}>{c.icon || "🏷️"}</td>
                        <td>
                          <strong>{c.name}</strong>
                          {c.description && <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--muted)" }}>{c.description}</p>}
                        </td>
                        <td><code>{c.slug}</code></td>
                        <td><strong>{c.productCount ?? 0}</strong> products</td>
                        <td>{c.sortOrder ?? 0}</td>
                        <td>
                          <span className={`status-tag ${c.isActive ? "active" : "inactive"}`}>
                            {c.isActive ? "Active" : "Hidden"}
                          </span>
                        </td>
                        <td>
                          <div className="admin-btn-row">
                            <button type="button" className="admin-sm-btn secondary" onClick={() => openEditCategory(c)}>
                              Edit
                            </button>
                            <button type="button" className="admin-sm-btn danger" onClick={() => handleDeleteCategory(c)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================
          TAB 4: INVENTORY
      ==================================================== */}
      {activeTab === "inventory" && (
        <div className="admin-inventory-view">
          <div className="admin-card">
            <div className="admin-card-header">
              <h2>Inventory & Stock Transactions</h2>
              <div className="admin-filter-bar" style={{ margin: 0 }}>
                <select
                  value={inventoryFilter.type}
                  onChange={(e) => setInventoryFilter((prev) => ({ ...prev, type: e.target.value, page: 1 }))}
                >
                  <option value="">All Transaction Types</option>
                  <option value="initial">Initial</option>
                  <option value="adjustment">Manual Adjustment</option>
                  <option value="sale">Customer Sale</option>
                  <option value="cancellation">Order Cancellation</option>
                </select>
              </div>
            </div>

            {inventoryLoading ? (
              <p>Loading inventory history…</p>
            ) : inventoryTransactions.length === 0 ? (
              <p style={{ color: "var(--muted)", padding: "20px 0" }}>No inventory log records found.</p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Type</th>
                      <th>Change</th>
                      <th>Before → After</th>
                      <th>Reason / Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryTransactions.map((tx) => (
                      <tr key={tx._id}>
                        <td>{new Date(tx.createdAt).toLocaleString()}</td>
                        <td><strong>{tx.productName}</strong></td>
                        <td><code>{tx.sku}</code></td>
                        <td><span className="status-tag" style={{ background: "#f1f5f9" }}>{tx.type}</span></td>
                        <td>
                          <strong style={{ color: tx.quantityChange > 0 ? "#15803d" : "#b91c1c" }}>
                            {tx.quantityChange > 0 ? `+${tx.quantityChange}` : tx.quantityChange}
                          </strong>
                        </td>
                        <td>{tx.stockBefore} → <strong>{tx.stockAfter}</strong></td>
                        <td>{tx.reason || (tx.order ? `Order #${tx.order}` : "—")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {inventoryMeta.totalPages > 1 && (
              <div className="admin-pagination-row">
                <span>Page {inventoryMeta.page} of {inventoryMeta.totalPages}</span>
                <div className="admin-btn-row">
                  <button
                    type="button"
                    className="admin-sm-btn secondary"
                    disabled={inventoryMeta.page <= 1}
                    onClick={() => setInventoryFilter((prev) => ({ ...prev, page: prev.page - 1 }))}
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    className="admin-sm-btn secondary"
                    disabled={inventoryMeta.page >= inventoryMeta.totalPages}
                    onClick={() => setInventoryFilter((prev) => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================
          TAB 5: ORDERS
      ==================================================== */}
      {activeTab === "orders" && (
        <div className="admin-orders-view">
          <div className="admin-card">
            <div className="admin-card-header">
              <h2>Customer Orders Management</h2>
            </div>

            <div className="admin-filter-bar">
              <input
                type="text"
                placeholder="Search order #, customer name, phone, email…"
                value={orderFilters.search}
                onChange={(e) => setOrderFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
                style={{ minWidth: 260 }}
              />

              <select
                value={orderFilters.status}
                onChange={(e) => setOrderFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
              >
                <option value="">All Statuses</option>
                {Object.entries(ORDER_STATUS_LABELS).map(([st, lbl]) => (
                  <option key={st} value={st}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>

            {ordersLoading ? (
              <p>Loading orders…</p>
            ) : ordersList.length === 0 ? (
              <p style={{ color: "var(--muted)", padding: "20px 0" }}>No orders found.</p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Placed At</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>City</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersList.map((o) => (
                      <tr key={o.id}>
                        <td><strong>{o.orderNumber}</strong></td>
                        <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td>{o.customer?.fullName}</td>
                        <td>{o.customer?.phone}</td>
                        <td>{o.customer?.city}</td>
                        <td>{o.items?.length || 0} items</td>
                        <td><strong>{currencySym} {o.total}</strong></td>
                        <td>
                          <span className={`status-tag ${o.status}`}>
                            {ORDER_STATUS_LABELS[o.status] || o.status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-sm-btn primary"
                            onClick={async () => {
                              try {
                                const res = await api.adminGetOrder(o.id);
                                setSelectedOrder(res.data.order);
                              } catch (err) {
                                showToast(err.message, "error");
                              }
                            }}
                          >
                            View & Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {ordersMeta.totalPages > 1 && (
              <div className="admin-pagination-row">
                <span>Page {ordersMeta.page} of {ordersMeta.totalPages}</span>
                <div className="admin-btn-row">
                  <button
                    type="button"
                    className="admin-sm-btn secondary"
                    disabled={ordersMeta.page <= 1}
                    onClick={() => setOrderFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    className="admin-sm-btn secondary"
                    disabled={ordersMeta.page >= ordersMeta.totalPages}
                    onClick={() => setOrderFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================
          TAB 6: CUSTOMERS
      ==================================================== */}
      {activeTab === "customers" && (
        <div className="admin-customers-view">
          <div className="admin-card">
            <div className="admin-card-header">
              <h2>Registered Customers</h2>
            </div>

            <div className="admin-filter-bar">
              <input
                type="text"
                placeholder="Search customer name, email, phone…"
                value={customerFilters.search}
                onChange={(e) => setCustomerFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
                style={{ minWidth: 260 }}
              />

              <select
                value={customerFilters.status}
                onChange={(e) => setCustomerFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
              >
                <option value="all">All Accounts</option>
                <option value="active">Active Only</option>
                <option value="inactive">Deactivated Only</option>
              </select>
            </div>

            {customersLoading ? (
              <p>Loading customers…</p>
            ) : customersList.length === 0 ? (
              <p style={{ color: "var(--muted)", padding: "20px 0" }}>No customers found.</p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Orders Placed</th>
                      <th>Total Spent</th>
                      <th>Joined</th>
                      <th>Account Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customersList.map((cust) => (
                      <tr key={cust.id}>
                        <td><strong>{cust.name}</strong></td>
                        <td>{cust.email}</td>
                        <td>{cust.phone || "—"}</td>
                        <td>{cust.orderCount || 0}</td>
                        <td>{currencySym} {(cust.totalSpent || 0).toLocaleString()}</td>
                        <td>{new Date(cust.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-tag ${cust.isActive ? "active" : "inactive"}`}>
                            {cust.isActive ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td>
                          <div className="admin-btn-row">
                            <button
                              type="button"
                              className="admin-sm-btn secondary"
                              onClick={() => openCustomerOrders(cust)}
                            >
                              Orders
                            </button>
                            <button
                              type="button"
                              className={`admin-sm-btn ${cust.isActive ? "danger" : "primary"}`}
                              onClick={() => handleToggleCustomerStatus(cust)}
                            >
                              {cust.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {customersMeta.totalPages > 1 && (
              <div className="admin-pagination-row">
                <span>Page {customersMeta.page} of {customersMeta.totalPages}</span>
                <div className="admin-btn-row">
                  <button
                    type="button"
                    className="admin-sm-btn secondary"
                    disabled={customersMeta.page <= 1}
                    onClick={() => setCustomerFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    className="admin-sm-btn secondary"
                    disabled={customersMeta.page >= customersMeta.totalPages}
                    onClick={() => setCustomerFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================
          TAB 7: SETTINGS
      ==================================================== */}
      {activeTab === "settings" && (
        <div className="admin-settings-view">
          <div className="admin-card" style={{ maxWidth: 680 }}>
            <div className="admin-card-header">
              <h2>Store Configurations & WhatsApp</h2>
            </div>

            <form onSubmit={handleSaveSettings}>
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label htmlFor="cfg-store-name">Store Name</label>
                  <input
                    id="cfg-store-name"
                    type="text"
                    required
                    value={settingsForm.storeName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="cfg-whatsapp">Business WhatsApp Number</label>
                  <input
                    id="cfg-whatsapp"
                    type="text"
                    placeholder="923001234567 (with country code, no +)"
                    value={settingsForm.whatsappNumber}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                  />
                  <small style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                    Include country code, no leading zeros or +. E.g. 923001234567
                  </small>
                </div>

                <div className="admin-form-group">
                  <label htmlFor="cfg-shipping-fee">Standard Delivery Fee ({settingsForm.currencySymbol})</label>
                  <input
                    id="cfg-shipping-fee"
                    type="number"
                    min="0"
                    required
                    value={settingsForm.shippingFee}
                    onChange={(e) => setSettingsForm({ ...settingsForm, shippingFee: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="cfg-free-shipping">Free Delivery Threshold ({settingsForm.currencySymbol})</label>
                  <input
                    id="cfg-free-shipping"
                    type="number"
                    min="0"
                    required
                    value={settingsForm.freeShippingThreshold}
                    onChange={(e) => setSettingsForm({ ...settingsForm, freeShippingThreshold: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="cfg-currency-code">Currency Code</label>
                  <input
                    id="cfg-currency-code"
                    type="text"
                    maxLength={3}
                    required
                    value={settingsForm.currency}
                    onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="cfg-currency-sym">Currency Display Symbol</label>
                  <input
                    id="cfg-currency-sym"
                    type="text"
                    maxLength={6}
                    required
                    value={settingsForm.currencySymbol}
                    onChange={(e) => setSettingsForm({ ...settingsForm, currencySymbol: e.target.value })}
                  />
                </div>
              </div>

              {settingsForm.whatsappNumber && (
                <div style={{ margin: "16px 0", padding: "12px 16px", background: "#f0fdf4", borderRadius: 8 }}>
                  <p style={{ margin: "0 0 8px", color: "#15803d", fontWeight: 600 }}>WhatsApp Link Preview:</p>
                  <a
                    href={buildWhatsAppLink(settingsForm.whatsappNumber, `Hello ${settingsForm.storeName}, I have a question.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-btn sm"
                  >
                    💬 Test WhatsApp Click-to-Chat Link →
                  </a>
                </div>
              )}

              <button type="submit" className="primary-btn" disabled={settingsSaving} style={{ marginTop: 10 }}>
                {settingsSaving ? "Saving Settings…" : "Save Store Settings"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: ADD / EDIT PRODUCT
      ==================================================== */}
      {productModal && (
        <div className="admin-modal-overlay" onClick={() => setProductModal(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{productModal === "create" ? "Add New Product" : `Edit Product: ${productModal.name}`}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setProductModal(null)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div className="admin-form-grid">
                <div className="admin-form-group full-span">
                  <label htmlFor="p-name">Product Name *</label>
                  <input
                    id="p-name"
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="e.g. Ultra Citrus Floor Wash"
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="p-sku">SKU Code *</label>
                  <input
                    id="p-sku"
                    type="text"
                    required
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    placeholder="CLN-FLR-01"
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="p-cat">Category *</label>
                  <select
                    id="p-cat"
                    required
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  >
                    <option value="" disabled>Select category</option>
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label htmlFor="p-reg-price">Regular Price ({currencySym}) *</label>
                  <input
                    id="p-reg-price"
                    type="number"
                    min="1"
                    required
                    value={productForm.regularPrice}
                    onChange={(e) => setProductForm({ ...productForm, regularPrice: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="p-sale-price">Sale Price ({currencySym}) (optional)</label>
                  <input
                    id="p-sale-price"
                    type="number"
                    min="1"
                    value={productForm.salePrice}
                    onChange={(e) => setProductForm({ ...productForm, salePrice: e.target.value })}
                    placeholder="Leave empty for regular price"
                  />
                </div>

                {productModal === "create" && (
                  <div className="admin-form-group">
                    <label htmlFor="p-init-stock">Initial Stock Quantity *</label>
                    <input
                      id="p-init-stock"
                      type="number"
                      min="0"
                      required
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    />
                  </div>
                )}

                <div className="admin-form-group">
                  <label htmlFor="p-low-stock">Low Stock Warning Threshold</label>
                  <input
                    id="p-low-stock"
                    type="number"
                    min="0"
                    value={productForm.lowStockThreshold}
                    onChange={(e) => setProductForm({ ...productForm, lowStockThreshold: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="p-badge">Badge (e.g. Best Seller, New, Popular)</label>
                  <input
                    id="p-badge"
                    type="text"
                    value={productForm.badge}
                    onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                  />
                </div>

                <div className="admin-form-group full-span">
                  <label htmlFor="p-desc">Product Description</label>
                  <textarea
                    id="p-desc"
                    rows={3}
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    placeholder="Detailed cleaning formulation features and benefits..."
                  />
                </div>

                {/* Cloud Image Upload */}
                <div className="admin-form-group full-span">
                  <label>Product Images (Cloud Upload)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploadingImage || productForm.images.length >= 8}
                  />
                  {uploadingImage && <small style={{ color: "var(--primary)" }}>Uploading to Cloudinary…</small>}

                  {/* Manual Image URL adder fallback */}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <input
                      id="manual-img-url"
                      type="url"
                      placeholder="Or paste an existing https:// image URL"
                    />
                    <button
                      type="button"
                      className="admin-sm-btn secondary"
                      onClick={() => {
                        const input = document.getElementById("manual-img-url");
                        const val = input?.value?.trim();
                        if (val && val.startsWith("https://")) {
                          setProductForm((prev) => ({
                            ...prev,
                            images: [...prev.images, { url: val, publicId: null }],
                          }));
                          input.value = "";
                        }
                      }}
                    >
                      Add URL
                    </button>
                  </div>

                  <div className="admin-image-preview-row">
                    {productForm.images.map((img, idx) => (
                      <div key={idx} className="admin-image-thumb">
                        <img src={img.url} alt="" />
                        <button type="button" onClick={() => removeProductImage(idx)} title="Remove image">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Flags */}
                <div className="admin-form-group full-span" style={{ display: "flex", flexDirection: "row", gap: 20 }}>
                  <label className="admin-form-checkbox">
                    <input
                      type="checkbox"
                      checked={productForm.isActive}
                      onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                    />
                    Active / Sellable
                  </label>
                  <label className="admin-form-checkbox">
                    <input
                      type="checkbox"
                      checked={productForm.isFeatured}
                      onChange={(e) => setProductForm({ ...productForm, isFeatured: e.target.checked })}
                    />
                    Featured
                  </label>
                  <label className="admin-form-checkbox">
                    <input
                      type="checkbox"
                      checked={productForm.isBestSeller}
                      onChange={(e) => setProductForm({ ...productForm, isBestSeller: e.target.checked })}
                    />
                    Best Seller
                  </label>
                </div>
              </div>

              <div className="admin-btn-row" style={{ justifyContent: "flex-end" }}>
                <button type="button" className="secondary-btn sm" onClick={() => setProductModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn sm" disabled={productSaving}>
                  {productSaving ? "Saving Product…" : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: ADD / EDIT CATEGORY
      ==================================================== */}
      {categoryModal && (
        <div className="admin-modal-overlay" onClick={() => setCategoryModal(null)}>
          <div className="admin-modal-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{categoryModal === "create" ? "Add Category" : `Edit: ${categoryModal.name}`}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setCategoryModal(null)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory}>
              <div className="admin-form-group" style={{ marginBottom: 14 }}>
                <label htmlFor="cat-name">Category Name *</label>
                <input
                  id="cat-name"
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g. Floor Care"
                />
              </div>

              <div className="admin-form-group" style={{ marginBottom: 14 }}>
                <label htmlFor="cat-icon">Icon Emoji / Symbol</label>
                <input
                  id="cat-icon"
                  type="text"
                  maxLength={8}
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  placeholder="e.g. 🧹"
                />
              </div>

              <div className="admin-form-group" style={{ marginBottom: 14 }}>
                <label htmlFor="cat-desc">Description</label>
                <textarea
                  id="cat-desc"
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Summary for product listings..."
                />
              </div>

              <div className="admin-form-group" style={{ marginBottom: 14 }}>
                <label htmlFor="cat-sort">Sort Order Number</label>
                <input
                  id="cat-sort"
                  type="number"
                  value={categoryForm.sortOrder}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: e.target.value })}
                />
              </div>

              <div className="admin-form-group" style={{ marginBottom: 20 }}>
                <label className="admin-form-checkbox">
                  <input
                    type="checkbox"
                    checked={categoryForm.isActive}
                    onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                  />
                  Active (Visible on Storefront)
                </label>
              </div>

              <div className="admin-btn-row" style={{ justifyContent: "flex-end" }}>
                <button type="button" className="secondary-btn sm" onClick={() => setCategoryModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn sm" disabled={categorySaving}>
                  {categorySaving ? "Saving…" : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: INVENTORY STOCK ADJUSTMENT
      ==================================================== */}
      {adjustModal && (
        <div className="admin-modal-overlay" onClick={() => setAdjustModal(null)}>
          <div className="admin-modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Adjust Stock: {adjustModal.name}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setAdjustModal(null)}>
                ✕
              </button>
            </div>

            <p style={{ margin: "0 0 16px", color: "var(--muted)" }}>
              Current stock: <strong>{adjustModal.stock} units</strong> (SKU: {adjustModal.sku})
            </p>

            <form onSubmit={handleAdjustStock}>
              <div className="admin-form-group" style={{ marginBottom: 14 }}>
                <label htmlFor="adj-qty">Stock Change Quantity (+ or -) *</label>
                <input
                  id="adj-qty"
                  type="number"
                  required
                  placeholder="e.g. +20 to restock, or -5 for damage"
                  value={adjustForm.change}
                  onChange={(e) => setAdjustForm({ ...adjustForm, change: e.target.value })}
                />
                <small style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                  Resulting stock: {Number(adjustModal.stock) + (Number(adjustForm.change) || 0)} units
                </small>
              </div>

              <div className="admin-form-group" style={{ marginBottom: 20 }}>
                <label htmlFor="adj-reason">Reason for Adjustment *</label>
                <input
                  id="adj-reason"
                  type="text"
                  required
                  placeholder="e.g. Restocked supplier shipment, Damaged in warehouse..."
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                />
              </div>

              <div className="admin-btn-row" style={{ justifyContent: "flex-end" }}>
                <button type="button" className="secondary-btn sm" onClick={() => setAdjustModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn sm" disabled={adjustSaving}>
                  {adjustSaving ? "Updating Stock…" : "Confirm Stock Change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: ORDER DETAILS & STATUS UPDATE
      ==================================================== */}
      {selectedOrder && (
        <div className="admin-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="admin-modal-card" style={{ maxWidth: 660 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h3>Order #{selectedOrder.orderNumber}</h3>
                <span className={`status-tag ${selectedOrder.status}`}>
                  {ORDER_STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
                </span>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setSelectedOrder(null)}>
                ✕
              </button>
            </div>

            {/* Customer & Address Details */}
            <div style={{ background: "#f8fafc", padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>Delivery & Recipient</h4>
              <p style={{ margin: "2px 0" }}><strong>Name:</strong> {selectedOrder.customer?.fullName}</p>
              <p style={{ margin: "2px 0" }}><strong>Phone:</strong> {selectedOrder.customer?.phone}</p>
              <p style={{ margin: "2px 0" }}><strong>Email:</strong> {selectedOrder.customer?.email}</p>
              <p style={{ margin: "2px 0" }}><strong>Address:</strong> {selectedOrder.customer?.address}, {selectedOrder.customer?.city}</p>
              {selectedOrder.customer?.notes && (
                <p style={{ margin: "6px 0 0", color: "#b45309" }}><strong>Notes:</strong> {selectedOrder.customer?.notes}</p>
              )}
            </div>

            {/* Ordered Items Table */}
            <h4 style={{ margin: "0 0 8px" }}>Ordered Items ({selectedOrder.items?.length})</h4>
            <div className="admin-table-wrapper" style={{ marginBottom: 16 }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td>{it.name}</td>
                      <td><code>{it.sku}</code></td>
                      <td>{it.quantity}</td>
                      <td>{currencySym} {it.unitPrice}</td>
                      <td><strong>{currencySym} {it.lineTotal}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ textAlign: "right", marginBottom: 20 }}>
              <p style={{ margin: "2px 0" }}>Subtotal: <strong>{currencySym} {selectedOrder.subtotal}</strong></p>
              <p style={{ margin: "2px 0" }}>Shipping: <strong>{selectedOrder.shippingFee === 0 ? "FREE" : `${currencySym} ${selectedOrder.shippingFee}`}</strong></p>
              <h3 style={{ margin: "6px 0 0", color: "var(--text)" }}>Grand Total: {currencySym} {selectedOrder.total}</h3>
            </div>

            {/* Status Update Control */}
            <div style={{ background: "#f0f9ff", padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <h4 style={{ margin: "0 0 10px", color: "var(--primary-dark)" }}>Update Order Status</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 10px" }}>
                Current: <strong>{ORDER_STATUS_LABELS[selectedOrder.status]}</strong>. Allowed next steps:
              </p>

              {ALLOWED_STATUS_TRANSITIONS[selectedOrder.status]?.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>This order has reached its final state and cannot be changed.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Status change note (e.g. Shipped via TCS #123456)..."
                    value={statusUpdateNote}
                    onChange={(e) => setStatusUpdateNote(e.target.value)}
                  />
                  <div className="admin-btn-row">
                    {ALLOWED_STATUS_TRANSITIONS[selectedOrder.status]?.map((nextSt) => (
                      <button
                        key={nextSt}
                        type="button"
                        className={`admin-sm-btn ${nextSt === "cancelled" ? "danger" : "primary"}`}
                        disabled={statusUpdating}
                        onClick={() => handleUpdateOrderStatus(selectedOrder.id, nextSt)}
                      >
                        {statusUpdating ? "Updating…" : `Move to: ${ORDER_STATUS_LABELS[nextSt]}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            {selectedOrder.statusHistory?.length > 0 && (
              <div>
                <h4 style={{ margin: "0 0 8px" }}>Status History</h4>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.85rem", color: "var(--muted)" }}>
                  {selectedOrder.statusHistory.map((h, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      <strong>{ORDER_STATUS_LABELS[h.status] || h.status}</strong> on {new Date(h.at).toLocaleString()}
                      {h.note && ` — "${h.note}"`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: CUSTOMER ORDER HISTORY
      ==================================================== */}
      {selectedCustomer && (
        <div className="admin-modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="admin-modal-card" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Orders for {selectedCustomer.name}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setSelectedCustomer(null)}>
                ✕
              </button>
            </div>

            <p style={{ margin: "0 0 12px", color: "var(--muted)" }}>
              Email: <strong>{selectedCustomer.email}</strong> • Total Orders: {selectedCustomer.orderCount || 0}
            </p>

            {customerOrdersLoading ? (
              <p>Loading order history…</p>
            ) : customerOrders.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>This customer has not placed any orders yet.</p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Date</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerOrders.map((co) => (
                      <tr key={co._id || co.id}>
                        <td><strong>{co.orderNumber}</strong></td>
                        <td>{new Date(co.createdAt).toLocaleDateString()}</td>
                        <td>{currencySym} {co.total}</td>
                        <td><span className={`status-tag ${co.status}`}>{ORDER_STATUS_LABELS[co.status] || co.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
