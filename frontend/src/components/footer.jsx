import { useState } from "react";
import cleanyLogo from "../assets/cleany-text.png";
import { useStore } from "../context/storeContext";

function Footer({ openPage }) {
  const { settings } = useStore();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [supportModal, setSupportModal] = useState(null);

  function handleSubscribe(e) {
    e.preventDefault();
    if (email && email.includes("@")) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 5000);
    }
  }

  function handleNav(page) {
    if (openPage) {
      openPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const supportContent = {
    contact: {
      title: "Contact CLEANY Support",
      body: "Need help or product advice? Reach out to our hygiene experts:\n\n📞 Phone: 0800-CLEANY (Mon-Sat, 9am - 8pm)\n✉️ Email: support@cleany.pk\n📍 Headquarters: Technology Park, Clean Street, Lahore",
    },
    faq: {
      title: "Frequently Asked Questions",
      body: "• Are your products safe around children and pets?\nYes! All CLEANY formulas are biodegradable, phosphate-free, and formulated without toxic fumes.\n\n• What is the delivery time?\nDeliveries in major metropolitan cities arrive in 24–48 hours. Nationwide orders arrive within 2–4 business days.\n\n• Can I return an item?\nYes, we offer a 100% 7-day hassle-free money-back guarantee on unopened bottles.",
    },
    shipping: {
      title: "Shipping & Delivery Policy",
      body: "• Free standard shipping on all orders over Rs. 1500.\n• Flat shipping rate of Rs. 150 on orders under Rs. 1500.\n• Real-time SMS tracking updates sent with every order ID.",
    },
    returns: {
      title: "Returns & Guarantee",
      body: "We stand behind our clean formulas. If you are not completely satisfied with the cleaning power of any CLEANY product, contact us within 7 days for a full replacement or refund.",
    },
  };

  return (
    <>
      <footer className="footer" aria-label="Footer">
        <div className="footer-container">
          {/* COLUMN 1: BRAND & ABOUT */}
          <div className="footer-col footer-brand-col">
            <div
              className="footer-logo"
              onClick={() => handleNav("home")}
              role="button"
              tabIndex={0}
              aria-label="CLEANY Home"
            >
              <img src={cleanyLogo} alt="CLEANY" />
            </div>
            <p className="footer-about">
              CLEANY is committed to modern, hospital-grade home hygiene.
              Science-backed formulations that cut grease, eliminate germs, and
              leave an invigorating fresh scent—safe for your family and the
              planet.
            </p>
            {/* Social Links */}
            <div className="footer-socials">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="social-icon-btn"
                aria-label="Visit CLEANY Facebook"
              >
                <span>f</span>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="social-icon-btn"
                aria-label="Visit CLEANY Instagram"
              >
                <span>📷</span>
              </a>
              {settings.whatsappLink && (
                <a
                  href={settings.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon-btn"
                  aria-label="Contact CLEANY on WhatsApp"
                >
                  <span>💬</span>
                </a>
              )}
            </div>
          </div>

          {/* COLUMN 2: QUICK LINKS */}
          <div className="footer-col">
            <h4 className="footer-heading">Quick Links</h4>
            <ul className="footer-links">
              <li>
                <button type="button" onClick={() => handleNav("home")}>
                  Home
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav("shop")}>
                  Shop All Products
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav("categories")}>
                  Explore Categories
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav("deals")}>
                  Special Deals & Bundles
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav("admin")}>
                  Admin Portal
                </button>
              </li>
            </ul>
          </div>

          {/* COLUMN 3: CATEGORIES */}
          <div className="footer-col">
            <h4 className="footer-heading">Categories</h4>
            <ul className="footer-links">
              <li>
                <button type="button" onClick={() => handleNav("floor-care")}>
                  Floor Care
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav("bathroom")}>
                  Bathroom
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav("kitchen")}>
                  Kitchen
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav("laundry")}>
                  Laundry
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav("glass-cleaners")}>
                  Glass Cleaners
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav("dishwashing")}>
                  Dishwashing
                </button>
              </li>
            </ul>
          </div>

          {/* COLUMN 4: CUSTOMER SUPPORT & NEWSLETTER */}
          <div className="footer-col">
            <h4 className="footer-heading">Customer Support</h4>
            <ul className="footer-links">
              <li>
                <button
                  type="button"
                  onClick={() => setSupportModal("contact")}
                >
                  Contact Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setSupportModal("faq")}>
                  FAQ & Guides
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setSupportModal("shipping")}
                >
                  Shipping Information
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setSupportModal("returns")}
                >
                  Returns & Guarantee
                </button>
              </li>
            </ul>

            <div className="footer-newsletter">
              <h5>Subscribe for Fresh Offers</h5>
              <p>Get exclusive cleaning tips & 15% off your next order.</p>
              <form onSubmit={handleSubscribe} className="newsletter-form">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  aria-label="Email for newsletter subscription"
                />
                <button type="submit" className="primary-btn">
                  Join
                </button>
              </form>
              {subscribed && (
                <p className="newsletter-success">
                  ✓ Thank you! You are subscribed to CLEANY updates.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="footer-bottom">
          <div className="footer-bottom-container">
            <p>© 2026 CLEANY. All rights reserved. Powered by Clean Science.</p>
            <div className="footer-bottom-badges">
              <span>🌱 Eco-Certified</span>
              <span>🛡️ 100% Non-Toxic</span>
              <span>⚡ Fast Dispatch</span>
            </div>
          </div>
        </div>
      </footer>

      {/* SUPPORT INFO MODAL */}
      {supportModal && supportContent[supportModal] && (
        <div
          className="modal-backdrop-overlay"
          onClick={() => setSupportModal(null)}
        >
          <div
            className="support-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{supportContent[supportModal].title}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSupportModal(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <pre className="support-modal-text">
                {supportContent[supportModal].body}
              </pre>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="primary-btn"
                onClick={() => setSupportModal(null)}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Footer;
