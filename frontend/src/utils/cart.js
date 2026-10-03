import { readJson } from "./storage.js";

export const CART_KEY = "clenora_cart";
export const WISHLIST_KEY = "clenora_wishlist";
export const MAX_QTY = 99;

// The cart lives in the browser. Anything unreadable or malformed in storage is ignored.
export function loadCart() {
  const raw = readJson(CART_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (i) =>
        i &&
        typeof i.id === "string" &&
        typeof i.name === "string" &&
        Number.isFinite(i.price) &&
        Number.isInteger(i.quantity) &&
        i.quantity > 0
    )
    .map((i) => ({ ...i, quantity: Math.min(i.quantity, MAX_QTY) }));
}

export function loadWishlist() {
  const raw = readJson(WISHLIST_KEY, []);
  return Array.isArray(raw) ? raw.filter((id) => typeof id === "string") : [];
}

// Compares one cart line with the server's live data from /orders/quote.
// Returns the corrected line (null = remove it) and a message to show the customer.
export function reconcileItem(item, live) {
  if (!live) return { item, notice: null };
  if (live.name === null || live.availableStock <= 0) {
    return { item: null, notice: `"${item.name}" was removed because it is no longer available.` };
  }
  const notes = [];
  let quantity = item.quantity;
  if (quantity > live.availableStock) {
    quantity = live.availableStock;
    notes.push(`"${item.name}" was reduced to ${quantity} because only ${quantity} ${quantity === 1 ? "is" : "are"} in stock.`);
  }
  if (live.unitPrice !== item.price) {
    notes.push(`The price of "${item.name}" is now Rs. ${live.unitPrice}.`);
  }
  return {
    item: { ...item, price: live.unitPrice, availableStock: live.availableStock, quantity },
    notice: notes.length > 0 ? notes.join(" ") : null,
  };
}

export const toOrderItems = (cart) => cart.map((i) => ({ productId: i.id, quantity: i.quantity }));
