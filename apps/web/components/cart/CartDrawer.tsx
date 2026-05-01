"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, MessageCircle, Minus, Plus, Share2, ShoppingBag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { useStoreLocale } from "@/context/LocaleContext";
import { createSharedCartUrl } from "@/lib/cartShare";

export default function CartDrawer() {
  const { isOpen, closeCart, items, subtotal, itemCount, updateItem, removeItem, clearCart } = useCart();
  const { language, symbol, t } = useStoreLocale();
  const [copied, setCopied] = useState(false);

  const sharedCartUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return createSharedCartUrl(items, window.location.origin, symbol, language);
  }, [items, language, symbol]);


  const shareCart = async () => {
    if (!sharedCartUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({ title: t("cart.sharedTitle"), url: sharedCartUrl });
      } else {
        await navigator.clipboard.writeText(sharedCartUrl);
      }
      setCopied(true);
      toast.success(t("cart.shareCopied"));
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(t("cart.shareError"));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          />

          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col"
            style={{ background: "#111", borderLeft: "1px solid #1e1e1e" }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-ember-DEFAULT" />
                <span className="font-heading text-lg uppercase tracking-wider text-white">
                  {t("cart.title")}
                </span>
                {itemCount > 0 && <span className="text-xs text-white/40">({itemCount} {t("cart.itemCount")})</span>}
              </div>
              <button onClick={closeCart} className="p-1 text-white/40 transition-colors hover:text-white" aria-label="Close cart">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <AnimatePresence mode="popLayout">
                {items.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex h-64 flex-col items-center justify-center gap-4"
                  >
                    <ShoppingBag className="h-16 w-16 text-white/10" />
                    <p className="font-heading text-sm uppercase tracking-wider text-white/30">
                      {t("cart.empty")}
                    </p>
                    <button onClick={closeCart} className="btn-ghost px-4 py-2 text-sm">
                      {t("cart.explore")}
                    </button>
                  </motion.div>
                ) : (
                  items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex gap-4 border-b border-white/5 py-4"
                    >
                      <div className="h-20 w-20 flex-shrink-0 overflow-hidden" style={{ background: "#1a1a1a" }}>
                        {item.product.image ? (
                          <Image src={item.product.image} alt={item.product.name} width={80} height={80} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/10">
                            <ShoppingBag className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/producto?slug=${encodeURIComponent(item.product.slug)}`}
                          onClick={closeCart}
                          className="font-heading line-clamp-2 text-sm leading-tight text-white transition-colors hover:text-ember-DEFAULT"
                        >
                          {item.product.name}
                        </Link>
                        {item.variant && <p className="mt-0.5 text-xs text-white/40">{item.variant.name}</p>}
                        <p className="mt-1 text-sm font-700 text-ember-DEFAULT">
                          {symbol} {item.unitPrice.toLocaleString("es-DO")}
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => updateItem(item.id, item.quantity - 1)}
                            className="flex h-6 w-6 items-center justify-center border border-white/20 text-white/60 transition-colors hover:border-ember-DEFAULT hover:text-ember-DEFAULT"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-4 text-center text-sm text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateItem(item.id, item.quantity + 1)}
                            className="flex h-6 w-6 items-center justify-center border border-white/20 text-white/60 transition-colors hover:border-ember-DEFAULT hover:text-ember-DEFAULT"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button onClick={() => removeItem(item.id)} className="ml-auto text-white/30 transition-colors hover:text-red-400" aria-label={t("common.delete")}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {items.length > 0 && (
              <div className="space-y-4 border-t border-white/10 px-6 py-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">{t("cart.subtotal")}</span>
                  <span className="font-heading text-xl font-700 text-white">
                    {symbol} {subtotal.toLocaleString("es-DO")}
                  </span>
                </div>
                <p className="text-xs text-white/30">{t("cart.availabilityNote")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={shareCart}
                    className="btn-ghost min-h-11 px-3 text-xs"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                    {t("cart.share")}
                  </button>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="btn-ghost min-h-11 px-3 text-xs text-red-200 hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("cart.clear")}
                  </button>
                </div>
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="btn-whatsapp w-full text-sm"
                >
                  <MessageCircle className="h-5 w-5" />
                  {t("cart.finishOrder")}
                </Link>
                <p className="text-xs text-white/30">{t("cart.whatsappOrderNote")}</p>
                <button onClick={closeCart} className="w-full py-2 text-center text-xs text-white/30 transition-colors hover:text-white/60">
                  {t("cart.continue")}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
