"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useStoreLocale } from "@/context/LocaleContext";

interface Result {
  id: string;
  name: string;
  slug: string;
  price: number;
  priceUsd?: number;
  images: { url: string }[];
}

interface Props {
  query: string;
  results: Result[];
  searching: boolean;
  onClose: () => void;
}

export default function SearchResults({ query, results, searching, onClose }: Props) {
  const { symbol, productPrice, t } = useStoreLocale();

  if (!query || query.length < 2) {
    return <div className="p-8 text-center text-sm text-white/30">{t("search.minLength")}</div>;
  }

  if (searching) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-ember-DEFAULT" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-white/30">{t("search.noResults")} &ldquo;{query}&rdquo;</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <p className="mb-4 font-heading text-xs uppercase tracking-wider text-white/30">
        {results.length} {t("search.results")}
      </p>
      <div className="space-y-2">
        {results.map((r) => (
          <Link
            key={r.id}
            href={`/producto/${r.slug}`}
            onClick={onClose}
            className="flex items-center gap-4 rounded p-3 transition-colors hover:bg-white/5"
          >
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden bg-white/5">
              {r.images?.[0] ? (
                <Image src={r.images[0].url} alt={r.name} width={64} height={64} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-white/5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-heading line-clamp-2 text-base leading-tight text-white">{r.name}</p>
              <p className="mt-1 text-sm text-ember-DEFAULT">{symbol} {productPrice(r).toLocaleString("es-DO")}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
