"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { productApi, dropApi } from "@/services/api";
import ProductCard from "./ProductCard";
import ProductSkeleton from "./ProductSkeleton";

// ─── Featured Products ────────────────────────────────────────
export default function FeaturedProducts() {
  const { data: site } = useQuery({ queryKey: ["site-state", "featured"], queryFn: () => dropApi.siteState().then((r) => r.data) });
  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => productApi.list({ isFeatured: true, limit: 4 }).then((r) => r.data),
  });

  if (site?.publicSettings?.showFeatured === false) return null;
  if (!isLoading && (isError || !data?.items?.length)) return null;

  return (
    <section className="py-12 px-4 md:py-16 md:px-6">
      <div className="max-w-7xl mx-auto">

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
