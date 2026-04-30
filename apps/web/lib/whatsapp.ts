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
};

export const STORE_WHATSAPP_NUMBER = "18492757807";
export const STORE_WHATSAPP_URL = "https://wa.link/wfuodm";

function getConfiguredWhatsAppUrl(_message: string) {
  return STORE_WHATSAPP_URL;
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
    return `- ${item.product.name} x ${item.quantity}${price}${productUrl ? ` (${productUrl})` : ""}`;
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
