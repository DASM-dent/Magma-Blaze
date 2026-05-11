"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { productApi } from "@/services/api";
import ProductCard from "@/components/product/ProductCard";
import ProductSkeleton from "@/components/product/ProductSkeleton";
import FilterSidebar from "@/components/product/FilterSidebar";
import { useStoreLocale } from "@/context/LocaleContext";

function CatalogoContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useStoreLocale();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sortOptions = [
    { value: "newest", label: t("sort.newest") },
    { value: "price_asc", label: t("sort.priceAsc") },
    { value: "price_desc", label: t("sort.priceDesc") },
    { value: "popular", label: t("sort.popular") },
    { value: "best_selling", label: t("sort.bestSelling") },
  ];

  const filters = {
    search: params.get("q") || undefined,
    categorySlug: params.get("categoria") || undefined,
    sortBy: (params.get("orden") || "newest") as string,
    minPrice: params.get("min") ? Number(params.get("min")) : undefined,
    maxPrice: params.get("max") ? Number(params.get("max")) : undefined,
    inStock: params.get("stock") === "1" ? true : undefined,
    page: Number(params.get("pagina") || 1),
  };

  const { data, isLoading } = useQuery<any>({
    queryKey: ["products", filters],
    queryFn: () => productApi.list(filters).then((r) => r.data),
    keepPreviousData: true,
  } as any);

  const updateFilter = (key: string, value: unknown) => {
    const current = new URLSearchParams(params.toString());
    if (value === undefined || value === null || value === "") {
      current.delete(key);
    } else {
      current.set(key, String(value));
    }
    if (key !== "pagina") current.delete("pagina");
    router.push(`/catalogo?${current.toString()}`);
  };

  return (
    <div className="pt-20 min-h-screen">
      {/* Header */}
      <div className="border-b border-white/10 py-8 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-heading text-4xl md:text-5xl text-white font-700 mb-1">
            {t("catalog.title")}
          </h1>
          {filters.search && (
            <p className="text-white/40 text-sm">
              {t("catalog.resultsFor")}: <span className="text-white">{filters.search}</span>
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFiltersOpen(true)}
              className="flex items-center gap-2 btn-ghost text-sm px-4 py-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t("catalog.filters")}
            </button>
            {/* Active filter chips */}
            {filters.categorySlug && (
              <button
                onClick={() => updateFilter("categoria", null)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-heading uppercase tracking-wider text-ember-DEFAULT border border-ember-DEFAULT/40 hover:bg-ember-DEFAULT/10 transition-colors"
              >
                {filters.categorySlug} <X className="w-3 h-3" />
              </button>
            )}
            {filters.inStock && (
              <button
                onClick={() => updateFilter("stock", null)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-heading uppercase tracking-wider text-ember-DEFAULT border border-ember-DEFAULT/40 hover:bg-ember-DEFAULT/10 transition-colors"
              >
                {t("catalog.inStock")} <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {data && (
              <span className="text-white/30 text-xs hidden md:block">
                {data.pagination.total} {t("catalog.results")}
              </span>
            )}
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter("orden", e.target.value)}
              className="input-dark text-sm py-2 pr-8 appearance-none cursor-pointer"
              style={{ width: "auto" }}
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : data?.items?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <p className="font-heading text-2xl text-white/20 uppercase tracking-wider">
              {t("catalog.noResults")}
            </p>
            <p className="text-white/30 text-sm">{t("catalog.tryOther")}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {data?.items?.map((product: any, i: number) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>

            {/* Pagination */}
            {data?.pagination && data.pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => updateFilter("pagina", p)}
                    className="w-10 h-10 font-heading text-sm transition-all"
                    style={{
                      background: p === filters.page ? "var(--ember)" : "transparent",
                      border: p === filters.page ? "1px solid var(--ember)" : "1px solid rgba(255,255,255,0.15)",
                      color: p === filters.page ? "#fff" : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Filter sidebar */}
      <FilterSidebar
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onFilter={updateFilter}
        current={filters}
      />
    </div>
  );
}

function CatalogFallback() {
  const { t } = useStoreLocale();
  return <div className="pt-32 min-h-screen text-center text-white/40">{t("catalog.loading")}...</div>;
}

export default function CatalogoPage() {
  return (
    <Suspense fallback={<CatalogFallback />}>
      <CatalogoContent />
    </Suspense>
  );
}
