"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useStoreLocale } from "@/context/LocaleContext";

// ─── Filter Sidebar ───────────────────────────────────────────
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onFilter: (key: string, value: unknown) => void;
  current: { categorySlug?: string; minPrice?: number; maxPrice?: number; inStock?: boolean };
}

export default function FilterSidebar({ isOpen, onClose, onFilter, current }: Props) {
  const { t } = useStoreLocale();
  const [minPrice, setMinPrice] = useState(current.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(current.maxPrice ?? "");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").then((r) => r.data),
  });

  const apply = () => {
    if (minPrice !== "") onFilter("min", minPrice);
    if (maxPrice !== "") onFilter("max", maxPrice);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.6)" }}
          />
          <motion.div
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-80 flex flex-col"
            style={{ background: "#111", borderRight: "1px solid #1e1e1e" }}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <span className="font-heading text-lg uppercase tracking-wider text-white">{t("catalog.filters")}</span>
              <button onClick={onClose}><X className="w-5 h-5 text-white/40 hover:text-white" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {/* Categorías */}
              <div>
                <h4 className="font-heading text-sm uppercase tracking-[0.2em] text-white/40 mb-3">{t("catalog.categories")}</h4>
                <div className="space-y-1">
                  <button
                    onClick={() => onFilter("categoria", null)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${!current.categorySlug ? "text-ember-DEFAULT" : "text-white/60 hover:text-white"}`}
                  >
                    {t("catalog.all")}
                  </button>
                  {categories?.map((cat: { slug: string; name: string; _count?: { products: number } }) => (
                    <button
                      key={cat.slug}
                      onClick={() => { onFilter("categoria", cat.slug); }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${current.categorySlug === cat.slug ? "text-ember-DEFAULT" : "text-white/60 hover:text-white"}`}
                    >
                      <span>{cat.name}</span>
                      {cat._count && <span className="text-xs text-white/30">{cat._count.products}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Precio */}
              <div>
                <h4 className="font-heading text-sm uppercase tracking-[0.2em] text-white/40 mb-3">{t("catalog.price")}</h4>
                <div className="flex gap-3">
                  <label className="w-1/2"><span className="mb-2 block text-xs text-white/45">{t("catalog.min")}</span><input
                    type="number" min={0}
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="input-dark text-sm py-2"
                  /></label>
                  <label className="w-1/2"><span className="mb-2 block text-xs text-white/45">{t("catalog.max")}</span><input
                    type="number" min={0}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="input-dark text-sm py-2"
                  /></label>
                </div>
              </div>

              {/* Disponibilidad */}
              <div>
                <h4 className="font-heading text-sm uppercase tracking-[0.2em] text-white/40 mb-3">{t("catalog.availability")}</h4>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!current.inStock}
                    onChange={(e) => onFilter("stock", e.target.checked ? "1" : null)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-white/70">{t("catalog.onlyStock")}</span>
                </label>
              </div>
            </div>

            <div className="border-t border-white/10 p-6 space-y-3">
              <button onClick={apply} className="btn-ember w-full">{t("catalog.apply")}</button>
              <button
                onClick={() => { onFilter("categoria", null); onFilter("min", null); onFilter("max", null); onFilter("stock", null); onClose(); }}
                className="w-full text-center text-xs text-white/30 hover:text-white/60 py-2 transition-colors"
              >
                {t("catalog.clear")}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
