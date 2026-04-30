'use client';

import { useEffect, useState } from 'react';
import HeroSection from '@/components/layout/HeroSection';
import FeaturedProducts from '@/components/product/FeaturedProducts';
import DropTeaser from '@/components/drop/DropTeaser';
import CategoryGrid from '@/components/product/CategoryGrid';
import { contentApi, dropApi } from '@/services/api';

type PublicSettings = {
  showModels?: boolean;
  showDrops?: boolean;
  showNews?: boolean;
  showCategories?: boolean;
  showFeatured?: boolean;
  showFooter?: boolean;
};

export default function HomeClient() {
  const [settings, setSettings] = useState<PublicSettings>({
    showDrops: true,
    showCategories: true,
    showFeatured: true,
  });
  const [homeBlocks, setHomeBlocks] = useState<any[]>([]);

  useEffect(() => {
    dropApi.siteState()
      .then(({ data }) => {
        if (data?.publicSettings) setSettings(data.publicSettings);
      })
      .catch(() => null);
    contentApi.list('HOME')
      .then(({ data }) => setHomeBlocks(Array.isArray(data) ? data : []))
      .catch(() => null);
  }, []);

  return (
    <>
      <HeroSection />
      {homeBlocks.map((block) => (
        <section key={block.id} className="px-4 py-16 text-white md:px-6">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_.9fr] md:items-center">
            <div>
              <h2 className="text-3xl font-semibold md:text-5xl">{block.title}</h2>
              {block.subtitle && <p className="mt-4 text-lg text-orange-100/75">{block.subtitle}</p>}
              {block.body && <p className="mt-5 whitespace-pre-line leading-relaxed text-white/60">{block.body}</p>}
            </div>
            {block.imageUrl && <img src={block.imageUrl} alt={block.title} className="max-h-[440px] w-full object-cover" />}
          </div>
        </section>
      ))}
      {settings.showDrops !== false && <DropTeaser />}
      {settings.showFeatured !== false && <FeaturedProducts />}
      {settings.showCategories !== false && <CategoryGrid />}
    </>
  );
}
