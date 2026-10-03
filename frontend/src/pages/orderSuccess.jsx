import { useStore } from "../context/storeContext";
import { buildOrderMessage, buildWhatsAppLink } from "../utils/whatsapp";

function OrderSuccess({
  orderId,
  orderData,
  goHome,
  openPage,
}) {
  const { settings } = useStore();
  const whatsappLink =
    orderData && orderData.items
      ? buildWhatsAppLink(
          settings.whatsappNumber,
          buildOrderMessage(settings.storeName, { ...orderData, orderNumber: orderId })
        )
      : null;

  return (
    <section className="order-success-page">
      <div className="success-card">
        {/* SUCCESS BADGE */}
        <div className="success-icon" aria-hidden="true">
          ✓
        </div>

        <span className="section-label">ORDER CONFIRMED</span>
        <h1>Thank You for Choosing CLEANY!</h1>
        <p className="success-message">
          Your order has been recorded successfully. Our warehouse team is
          preparing your fresh cleaning supplies for rapid dispatch.
        </p>

        {/* ORDER ID */}
        <div className="order-id-box">
          <span>Tracking / Order ID</span>
          <strong>#{orderId}</strong>
          <small>Keep this ID for order tracking and delivery status</small>
        </div>

        {/* ORDER DETAILS RECAP */}
        {orderData && (
          <div className="order-details-container">
            {/* DELIVERY ADDRESS */}
            <div className="order-customer-info">
              <h3>Delivery Details</h3>
              <div className="info-grid">
                <div>
                  <strong>Customer:</strong>
                  <p>{orderData.fullName}</p>
                </div>
                <div>
                  <strong>Phone:</strong>
                  <p>{orderData.phone}</p>
                </div>
                <div>
                  <strong>Email:</strong>
                  <p>{orderData.email}</p>
                </div>
                <div>
                  <strong>Address:</strong>
                  <p>{orderData.address}, {orderData.city}</p>
                </div>
                <div>
                  <strong>Payment:</strong>
                  <p>{orderData.paymentMethod || "Cash on Delivery"}</p>
                </div>
              </div>
            </div>

            {/* ORDERED ITEMS LIST */}
            {orderData.items && orderData.items.length > 0 && (
              <div className="order-items-recap">
                <h3>Ordered Items ({orderData.items.length})</h3>
                <div className="recap-list">
                  {orderData.items.map((item) => (
                    <div key={item.id} className="recap-item-row">
                      <div className="recap-item-name">
                        <strong>{item.name}</strong>
                        <span>Qty: {item.quantity}</span>
                      </div>
                      <span className="recap-item-price">
                        Rs. {item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="recap-total-row">
                  <span>Grand Total Paid / Due:</span>
                  <strong>
                    Rs. {orderData.grandTotal || orderData.subtotal}
                  </strong>
                </div>
              </div>
            )}
          </div>
        )}

        {whatsappLink && (
          <div className="whatsapp-order-box">
            <a
              className="secondary-btn"
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              💬 Send order details on WhatsApp
            </a>
            <small>
              This opens WhatsApp with a ready message. Your message is only sent when you press
              Send there.
            </small>
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="success-actions">
          <button
            type="button"
            className="continue-shopping-btn"
            onClick={goHome}
          >
            ← Back to Home
          </button>
          {openPage && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => openPage("shop")}
            >
              Browse More Products
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default OrderSuccess;