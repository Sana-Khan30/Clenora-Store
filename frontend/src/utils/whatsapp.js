// Click-to-chat links. Nothing is sent automatically: the customer must press Send inside WhatsApp.
export function buildWhatsAppLink(number, text) {
  const digits = String(number || "").replace(/\D/g, "");
  if (!digits) return null;
  return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`;
}

export function buildOrderMessage(storeName, order) {
  const lines = order.items.map((item) => `- ${item.quantity} x ${item.name} (Rs. ${item.price * item.quantity})`);
  return [
    `Hello ${storeName}, I placed order ${order.orderNumber}.`,
    ...lines,
    `Total: Rs. ${order.grandTotal} (Cash on Delivery)`,
    `Name: ${order.fullName}`,
    `Phone: ${order.phone}`,
    `Address: ${order.address}, ${order.city}`,
  ].join("\n");
}
