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
                className="social-icon-btn social-fb"
                aria-label="Visit CLEANY Facebook"
                title="Facebook"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="social-icon-btn social-ig"
                aria-label="Visit CLEANY Instagram"
                title="Instagram"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              {settings.whatsappLink && (
                <a
                  href={settings.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon-btn social-wa"
                  aria-label="Contact CLEANY on WhatsApp"
                  title="WhatsApp"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
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
