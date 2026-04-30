"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, ShoppingBag, Flame } from "lucide-react";
import { useFavorites } from "@/context/FavoritesContext";
import { useStoreLocale } from "@/context/LocaleContext";
import { productAvailabilityWhatsappUrl } from "@/lib/whatsapp";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  priceUsd?: number;
  description?: string | null;
  imageUrl?: string | null;
  images?: { url: string; alt?: string | null; sortOrder?: number }[];
  comparePrice?: number | null;
  mainImage?: string;
  isNew: boolean;
  isBestSeller: boolean;
  isLimitedDrop: boolean;
  isOutOfStock: boolean;
  status: string;
}

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { formatPrice, language, productPrice, t } = useStoreLocale();
  const isComingSoon = product.status === "COMING_SOON";
  const favorite = isFavorite(product.id);
  const discount = product.comparePrice
    ? Math.round((1 - productPrice(product) / product.comparePrice) * 100)
    : null;
  const primaryImage = product.mainImage || product.images?.[0]?.url || product.imageUrl || "";
  const hoverImage = product.images?.[1]?.url && product.images[1].url !== primaryImage ? product.images[1].url : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="product-card group"
    >
      {/* Image */}
      <Link href={`/producto/${product.slug}`} className="block relative aspect-square overflow-hidden">
        {primaryImage ? (
          <>
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {hoverImage ? (
              <Image
                src={hoverImage}
                alt={product.images?.[1]?.alt || product.name}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover opacity-0 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
              />
            ) : null}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#1a1a1a" }}>
            <ShoppingBag className="w-16 h-16 text-white/5" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isLimitedDrop && (
            <span className="badge badge-drop text-xs flex items-center gap-1">
              <Flame className="w-3 h-3" /> Drop
            </span>
          )}
          {product.isNew && !product.isLimitedDrop && (
            <span className="badge badge-new text-xs">{t("badge.new")}</span>
          )}
          {product.isBestSeller && (
            <span className="badge badge-hot text-xs">{t("badge.bestSeller")}</span>
          )}
          {discount && discount > 0 && (
            <span className="badge text-xs text-white" style={{ background: "#ff4500" }}>-{discount}%</span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(product);
          }}
          className={`absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-white/10 transition ${favorite ? "bg-orange-500 text-black" : "bg-black/60 text-white hover:bg-white hover:text-black"}`}
          aria-label={favorite ? t("product.favoriteRemove") : t("product.favoriteAdd")}
        >
          <Heart className={`h-5 w-5 ${favorite ? "fill-current" : ""}`} />
        </button>

        {/* Out of stock / coming soon overlay */}
        {(product.isOutOfStock || isComingSoon) && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
            <span className={`badge text-sm px-4 py-2 ${isComingSoon ? "badge-soon" : "badge-sold-out"}`} style={{ border: "1px solid currentColor" }}>
              {isComingSoon ? t("badge.comingSoon") : t("badge.soldOut")}
            </span>
          </div>
        )}

        {/* Quick add (desktop hover) */}
        {!product.isOutOfStock && !isComingSoon && (
          <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={(e) => {
                e.preventDefault();
                window.open(productAvailabilityWhatsappUrl(product, language), "_blank", "noopener,noreferrer");
              }}
              className="w-full py-3 font-heading text-sm uppercase tracking-wider text-white transition-all"
              style={{ background: "var(--ember)" }}
            >
              {t("product.verifyAvailability")}
            </button>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="p-4">
        <Link href={`/producto/${product.slug}`}>
          <h3 className="font-heading text-base text-white hover:text-ember-DEFAULT transition-colors line-clamp-2 leading-tight mb-2">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-heading text-lg text-white font-700">
            {formatPrice(product)}
          </span>
          {product.comparePrice && (
            <span className="text-sm text-white/30 line-through">
              ${product.comparePrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
