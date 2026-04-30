type AvailabilityProduct = {
  name: string;
  slug?: string | null;
};

type CartAvailabilityItem = {
  product: {
    name: string;
    slug?: string | null;
  };
  quantity: number;
  unitPrice?: number;
  variant?: { name?: string | null };
};

export const STORE_WHATSAPP_NUMBER = "18492757807";
export const STORE_WHATSAPP_URL = "https://wa.link/wfuodm";
export const STORE_ORDER_WHATSAPP_URL = "https://wa.link/5c0jyk";

function getConfiguredWhatsAppUrl(_message: string) {
  return STORE_WHATSAPP_URL;
}

function getDynamicStoreWhatsappUrl(message: string) {
  if (!message.trim()) return STORE_ORDER_WHATSAPP_URL;
  return `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function getProductUrl(slug?: string | null) {
  if (!slug || typeof window === "undefined") return "";
  return `${window.location.origin}/producto/${slug}`;
}

export function productAvailabilityWhatsappUrl(product: AvailabilityProduct, language: "es" | "en" = "es") {
  const productUrl = getProductUrl(product.slug);
  const message =
    language === "en"
      ? `Hi Magma Blaze, I want to verify availability for "${product.name}".${productUrl ? ` Link: ${productUrl}` : ""}`
      : `Hola Magma Blaze, quiero verificar disponibilidad de "${product.name}".${productUrl ? ` Link: ${productUrl}` : ""}`;

  return getConfiguredWhatsAppUrl(message);
}

export function cartAvailabilityWhatsappUrl(
  items: CartAvailabilityItem[],
  symbol: string,
  subtotal: number,
  language: "es" | "en" = "es",
  extraLines: string[] = [],
) {
  const lines = items.map((item) => {
    const productUrl = getProductUrl(item.product.slug);
    const price = item.unitPrice ? ` - ${symbol} ${(item.unitPrice * item.quantity).toLocaleString(language === "en" ? "en-US" : "es-DO")}` : "";
    const variant = item.variant?.name ? ` (${language === "en" ? "variant" : "variante"}: ${item.variant.name})` : "";
    return `- ${item.product.name}${variant} x ${item.quantity}${price}${productUrl ? ` (${productUrl})` : ""}`;
  });

  const total = `${symbol} ${subtotal.toLocaleString(language === "en" ? "en-US" : "es-DO")}`;
  const details = extraLines.filter(Boolean);
  const detailsBlock = details.length
    ? `\n\n${language === "en" ? "Delivery details" : "Detalles de entrega"}:\n${details.map((line) => `- ${line}`).join("\n")}`
    : "";
  const message =
    language === "en"
      ? `Hi Magma Blaze, I want to verify availability for these products:\n${lines.join("\n")}\nApproximate subtotal: ${total}${detailsBlock}`
      : `Hola Magma Blaze, quiero verificar disponibilidad de estos productos:\n${lines.join("\n")}\nSubtotal aproximado: ${total}${detailsBlock}`;

  return getConfiguredWhatsAppUrl(message);
}

export function cartOrderWhatsappUrl(
  items: CartAvailabilityItem[],
  symbol: string,
  subtotal: number,
  language: "es" | "en" = "es",
  sharedCartUrl = "",
  extraLines: string[] = [],
) {
  if (!items.length) return STORE_ORDER_WHATSAPP_URL;

  const locale = language === "en" ? "en-US" : "es-DO";
  const lines = items.map((item, index) => {
    const productUrl = getProductUrl(item.product.slug);
    const lineTotal = item.unitPrice ? item.unitPrice * item.quantity : 0;
    const price = item.unitPrice ? ` - ${symbol} ${lineTotal.toLocaleString(locale)}` : "";
    const variant = item.variant?.name ? ` (${language === "en" ? "variant" : "variante"}: ${item.variant.name})` : "";
    return `${index + 1}. ${item.product.name}${variant} x ${item.quantity}${price}${productUrl ? `\n   ${productUrl}` : ""}`;
  });

  const total = `${symbol} ${subtotal.toLocaleString(locale)}`;
  const details = extraLines.filter(Boolean);
  const detailsBlock = details.length
    ? `\n\n${language === "en" ? "Delivery details" : "Detalles de entrega"}:\n${details.map((line) => `- ${line}`).join("\n")}`
    : "";
  const sharedLine = sharedCartUrl
    ? `\n\n${language === "en" ? "Shared cart link" : "Enlace del carrito"}: ${sharedCartUrl}`
    : "";

  const message =
    language === "en"
      ? `Hi Magma Blaze, I want to place this order:\n\n${lines.join("\n\n")}\n\nApproximate total: ${total}${sharedLine}${detailsBlock}`
      : `Hola Magma Blaze, quiero hacer este pedido:\n\n${lines.join("\n\n")}\n\nTotal aproximado: ${total}${sharedLine}${detailsBlock}`;

  return getDynamicStoreWhatsappUrl(message);
}
