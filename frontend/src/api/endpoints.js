import { request, setToken } from "./client";

// ---------- catalog and settings (public) ----------
export const getCategories = () => request("/categories", { auth: false });
export const getProducts = (params, options = {}) => request("/products", { params, auth: false, ...options });
export const getPublicSettings = () => request("/settings/public", { auth: false });

// ---------- auth ----------
export async function login(email, password) {
  const res = await request("/auth/login", { method: "POST", body: { email, password }, auth: false });
  setToken(res.data.token);
  return res.data.user;
}

export async function register({ name, email, password, phone }) {
  const body = { name, email, password };
  if (phone) body.phone = phone;
  const res = await request("/auth/register", { method: "POST", body, auth: false });
  setToken(res.data.token);
  return res.data.user;
}

export async function logout() {
  try {
    await request("/auth/logout", { method: "POST" });
  } finally {
    setToken(null);
  }
}

export const getMe = () => request("/auth/me");
export const updateMe = (fields) => request("/auth/me", { method: "PATCH", body: fields });

export async function changePassword(currentPassword, newPassword) {
  const res = await request("/auth/me/password", { method: "PATCH", body: { currentPassword, newPassword } });
  setToken(res.data.token); // the old token stops working after a password change
  return res;
}

// ---------- orders ----------
export const quoteCart = (items) => request("/orders/quote", { method: "POST", body: { items }, auth: false });

// Checkout works for guests and customers. If the saved token is rejected, retry once as a guest.
export async function placeOrder(payload) {
  try {
    return await request("/orders", { method: "POST", body: payload });
  } catch (err) {
    if (err.status === 401) return request("/orders", { method: "POST", body: payload, auth: false });
    throw err;
  }
}

export const getMyOrders = (params) => request("/orders/my", { params });
export const cancelMyOrder = (id) => request(`/orders/my/${id}/cancel`, { method: "POST" });

// ---------- admin endpoints ----------
export async function adminLogin(email, password) {
  const res = await request("/auth/admin/login", { method: "POST", body: { email, password }, auth: false });
  setToken(res.data.token);
  return res.data.user;
}

export const getDashboardStats = () => request("/admin/dashboard");

export const adminGetCategories = () => request("/admin/categories");
export const adminCreateCategory = (body) => request("/admin/categories", { method: "POST", body });
export const adminUpdateCategory = (id, body) => request(`/admin/categories/${id}`, { method: "PATCH", body });
export const adminDeleteCategory = (id) => request(`/admin/categories/${id}`, { method: "DELETE" });

export const adminGetProducts = (params) => request("/admin/products", { params });
export const adminGetProduct = (id) => request(`/admin/products/${id}`);
export const adminCreateProduct = (body) => request("/admin/products", { method: "POST", body });
export const adminUpdateProduct = (id, body) => request(`/admin/products/${id}`, { method: "PATCH", body });
export const adminDeleteProduct = (id) => request(`/admin/products/${id}`, { method: "DELETE" });

export const adminUploadImage = (file) => {
  const formData = new FormData();
  formData.append("image", file);
  return request("/admin/uploads/image", { method: "POST", body: formData });
};
export const adminDeleteImage = (publicId) => request("/admin/uploads/image", { method: "DELETE", params: { publicId } });

export const adminGetOrders = (params) => request("/admin/orders", { params });
export const adminGetOrder = (id) => request(`/admin/orders/${id}`);
export const adminUpdateOrderStatus = (id, status, note) =>
  request(`/admin/orders/${id}/status`, { method: "PATCH", body: { status, note } });

export const adminGetInventoryTransactions = (params) => request("/admin/inventory/transactions", { params });
export const adminAdjustInventory = (body) => request("/admin/inventory/adjust", { method: "POST", body });

export const adminGetCustomers = (params) => request("/admin/customers", { params });
export const adminGetCustomer = (id) => request(`/admin/customers/${id}`);
export const adminGetCustomerOrders = (id, params) => request(`/admin/customers/${id}/orders`, { params });
export const adminSetCustomerStatus = (id, isActive) =>
  request(`/admin/customers/${id}/status`, { method: "PATCH", body: { isActive } });

export const adminGetSettings = () => request("/admin/settings");
export const adminUpdateSettings = (body) => request("/admin/settings", { method: "PATCH", body });
