import { useStore } from "../context/storeContext";
import { buildWhatsAppLink } from "../utils/whatsapp";

// Floating click-to-chat button. Hidden until an admin saves a WhatsApp number in the store settings.
function WhatsAppButton() {
  const { settings } = useStore();
  const href = buildWhatsAppLink(settings.whatsappNumber, `Hello ${settings.storeName}, I have a question.`);

  if (!href) return null;

  return (
    <a
      className="whatsapp-float"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat with us on WhatsApp"
    >
      <span aria-hidden="true">💬</span>
    </a>
  );
}

export default WhatsAppButton;
