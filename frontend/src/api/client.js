// One place that talks to the backend. Every API call goes through request().
const rawUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").trim().replace(/\/+$/, "");
const BASE_URL = rawUrl.endsWith("/api") ? rawUrl : `${rawUrl}/api`;
const TOKEN_KEY = "clenora_token";

let unauthorizedHandler = null;

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode): the session just will not persist */
  }
}

// AuthProvider registers a callback so a rejected token logs the user out everywhere.
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors || [];
  }
}

function buildQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export async function request(path, { method = "GET", body, params, auth = true, signal } = {}) {
  const token = auth ? getToken() : null;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = {};
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}${buildQuery(params)}`, {
      method,
      headers,
      body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
      signal,
    });
  } catch (err) {
    if (err && err.name === "AbortError") throw err;
    throw new ApiError("Cannot reach the server. Please check your connection and try again.", 0);
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token) {
      setToken(null);
      if (unauthorizedHandler) unauthorizedHandler();
    }
    throw new ApiError((json && json.message) || "Something went wrong. Please try again.", response.status, json && json.errors);
  }
  return json || { success: true, data: null };
}
