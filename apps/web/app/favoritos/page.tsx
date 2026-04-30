'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Trash2 } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';
import { useStoreLocale } from '@/context/LocaleContext';

export default function Page() {
  const { favorites, removeFavorite } = useFavorites();
  const { formatPrice, t } = useStoreLocale();

  return (
    <section className="min-h-screen px-4 pt-28 pb-16 text-white md:px-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm text-white/45">{t("account.title")} / {t("favorites.title")}</p>
        <h1 className="mt-2 text-3xl font-semibold md:text-5xl">{t("favorites.title")}</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/50">{t("favorites.subtitle")}</p>

        {favorites.length ? (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {favorites.map((product, index) => (
              <motion.article
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: index * 0.03 }}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]"
              >
                <Link href={`/producto/${product.slug}`} className="block">
                  <div className="relative aspect-square bg-white/[.04]">
                    {product.imageUrl || product.mainImage ? (
                      <img src={product.imageUrl || product.mainImage || ''} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-white/25"><Heart /></div>
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="line-clamp-2 min-h-[44px] text-sm font-semibold leading-snug md:text-base">{product.name}</h2>
                    {product.description && <p className="mt-2 line-clamp-2 text-xs text-white/45">{product.description}</p>}
                    <p className="mt-3 font-bold">{formatPrice(product)}</p>
                  </div>
                </Link>
                <button onClick={() => removeFavorite(product.id)} className="mx-4 mb-4 flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 hover:border-red-400/40 hover:text-red-100">
                  <Trash2 size={15} /> {t("favorites.remove")}
                </button>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-8 text-center">
            <h2 className="text-lg font-semibold">{t("favorites.emptyTitle")}</h2>
            <p className="mt-2 text-sm text-white/45">{t("favorites.emptyText")}</p>
            <Link href="/catalogo" className="btn-ember mt-6 inline-flex">{t("hero.collection")}</Link>
          </div>
        )}
      </div>
    </section>
  );
}
