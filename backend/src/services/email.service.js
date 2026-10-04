const HOSTINGER_MAIL_API = 'https://api.mail.hostinger.com/api/v1';
const DEFAULT_MAILBOX_ID = 'AC1b3c906c55fdaf40ba48f65b3e58';
const DEFAULT_API_TOKEN = '73200e63ec31cc07757c79b7cc869cceea566378c19615132870ba5d157f10af';
const SENDER_NAME = 'CLENORA Store';
const STORE_EMAIL = 'info@clenorastore.com';

/**
 * Send an email via Hostinger Agentic Mail REST API
 */
async function sendMail({ to, subject, html, text }) {
  const token = process.env.HOSTINGER_MAIL_TOKEN || DEFAULT_API_TOKEN;
  const mailboxId = process.env.HOSTINGER_MAILBOX_ID || DEFAULT_MAILBOX_ID;

  if (!token || !mailboxId || !to || (Array.isArray(to) && to.length === 0)) {
    return false;
  }

  const recipients = Array.isArray(to) ? to : [to];

  const payload = {
    to: recipients,
    displayName: SENDER_NAME,
    subject,
    html,
    text: text || subject,
  };

  try {
    const res = await fetch(`${HOSTINGER_MAIL_API}/mailboxes/${mailboxId}/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CLENORA-Store-Backend/1.0',
      },
      body: JSON.stringify(payload),
    });

    return res.status === 204 || res.ok;
  } catch (err) {
    console.error('Failed to send email via Hostinger Mail API:', err.message);
    return false;
  }
}

/**
 * Send rich HTML order confirmation email to customer + store owner notification
 */
async function sendOrderConfirmationEmail(order) {
  if (!order || !order.customer || !order.customer.email) {
    return false;
  }

  const { orderNumber, customer, items = [], subtotal, shippingFee, total, paymentMethod } = order;

  const itemsRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b;">
          <strong>${item.name}</strong>
          ${item.sku ? `<br><small style="color: #64748b;">SKU: ${item.sku}</small>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b; text-align: right;">
          Rs. ${item.unitPrice ? item.unitPrice.toLocaleString() : 0}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0284c7; text-align: right; font-weight: bold;">
          Rs. ${item.lineTotal ? item.lineTotal.toLocaleString() : 0}
        </td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .wrapper { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
          .header { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px; }
          .header p { margin: 6px 0 0 0; opacity: 0.9; font-size: 14px; }
          .body-content { padding: 30px 25px; }
          .badge { display: inline-block; background-color: #e0f2fe; color: #0369a1; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; margin-bottom: 16px; }
          .order-id-box { background-color: #f0f9ff; border: 1px dashed #38bdf8; border-radius: 8px; padding: 14px; text-align: center; margin-bottom: 24px; }
          .order-id-box h3 { margin: 0; color: #0369a1; font-size: 18px; }
          .table-container { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .table-container th { background-color: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569; }
          .totals-row { text-align: right; padding: 6px 12px; font-size: 14px; color: #334155; }
          .grand-total { font-size: 18px; font-weight: 800; color: #0284c7; padding-top: 10px; border-top: 2px solid #0284c7; }
          .address-box { background-color: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 20px; border: 1px solid #e2e8f0; }
          .footer-note { text-align: center; padding: 25px 20px; background-color: #f1f5f9; font-size: 13px; color: #64748b; }
          .button { display: inline-block; background-color: #25d366; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1>CLENORA</h1>
            <p>Hospital-Grade Home Hygiene</p>
          </div>
          <div class="body-content">
            <span class="badge">✓ ORDER CONFIRMED</span>
            <h2 style="color: #0f172a; margin-top: 0;">Thank you, ${customer.fullName || 'Valued Customer'}!</h2>
            <p style="color: #475569; line-height: 1.5;">Your order has been received and is now being prepared for dispatch. We will deliver it to your address shortly.</p>
            
            <div class="order-id-box">
              <span style="font-size: 12px; color: #64748b; text-transform: uppercase;">Tracking / Order ID</span>
              <h3>#${orderNumber}</h3>
            </div>

            <table class="table-container">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td class="totals-row">Subtotal:</td>
                <td class="totals-row" style="font-weight: 600; width: 120px;">Rs. ${(subtotal || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td class="totals-row">Shipping Fee:</td>
                <td class="totals-row" style="font-weight: 600;">${shippingFee === 0 ? 'FREE' : `Rs. ${shippingFee}`}</td>
              </tr>
              <tr>
                <td class="totals-row grand-total">Total Amount:</td>
                <td class="totals-row grand-total">Rs. ${(total || 0).toLocaleString()}</td>
              </tr>
            </table>

            <div class="address-box">
              <h4 style="margin: 0 0 10px 0; color: #1e293b;">Delivery Address</h4>
              <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">
                <strong>${customer.fullName}</strong><br>
                ${customer.address}<br>
                ${customer.city}, Pakistan<br>
                <strong>Phone:</strong> ${customer.phone}<br>
                <strong>Payment Method:</strong> ${paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : paymentMethod}
              </p>
            </div>
          </div>
          <div class="footer-note">
            <p style="margin: 0 0 8px 0;">Need help or have questions about your order?</p>
            <p style="margin: 0;">Email: <a href="mailto:info@clenorastore.com" style="color: #0284c7; text-decoration: none; font-weight: bold;">info@clenorastore.com</a> | Website: <a href="https://www.clenorastore.com" style="color: #0284c7; text-decoration: none;">www.clenorastore.com</a></p>
            <p style="margin: 15px 0 0 0; font-size: 11px; color: #94a3b8;">© 2026 CLENORA Store. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  // Send to customer
  await sendMail({
    to: [customer.email],
    subject: `Order Confirmation #${orderNumber} - CLENORA Store`,
    html,
    text: `Thank you for your order #${orderNumber} at CLENORA Store! Total: Rs. ${total}. We are preparing your order.`,
  });

  // Also send an admin notification copy to store email
  if (customer.email !== STORE_EMAIL) {
    await sendMail({
      to: [STORE_EMAIL],
      subject: `[New Order] #${orderNumber} from ${customer.fullName} (Rs. ${total})`,
      html,
      text: `New order #${orderNumber} placed by ${customer.fullName} (${customer.phone}) for Rs. ${total}.`,
    });
  }

  return true;
}

module.exports = {
  sendMail,
  sendOrderConfirmationEmail,
};
