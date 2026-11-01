"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Flame, Clock } from "lucide-react";
import { productApi, dropApi } from "@/services/api";
import ProductCard from "./ProductCard";
import ProductSkeleton from "./ProductSkeleton";
import { useStoreLocale } from "@/context/LocaleContext";
import ScrollReveal from "@/components/ui/ScrollReveal";

// ─── Featured Products ────────────────────────────────────────
export default function FeaturedProducts() {
  const { t } = useStoreLocale();
  const { data: site } = useQuery({ queryKey: ["site-state", "featured"], queryFn: () => dropApi.siteState().then((r) => r.data) });
  const { data, isLoading } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => productApi.list({ isFeatured: true, limit: 4 }).then((r) => r.data),
  });

  if (site?.publicSettings?.showFeatured === false) return null;

  return (
    <section className="py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="flex items-end justify-between mb-10">
          <div>
            <p className="font-heading text-xs uppercase tracking-[0.3em] text-ember-DEFAULT mb-2">{t("home.featuredEyebrow")}</p>
            <h2 className="font-heading text-4xl md:text-5xl font-700 text-white">{t("home.featuredTitle")}</h2>
          </div>
          <Link href="/catalogo" className="hidden md:flex items-center gap-2 text-sm text-white/40 hover:text-ember-DEFAULT transition-colors font-heading uppercase tracking-wider">
            {t("home.viewAll")} <ArrowRight className="w-4 h-4" />
          </Link>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)
            : data?.items?.map((p: unknown, i: number) => <ProductCard key={(p as { id: string }).id} product={p as Parameters<typeof ProductCard>[0]['product']} index={i} />)
          }
        </div>
      </div>
    </section>
  );
}
