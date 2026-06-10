'use client';

import { useEffect, useState } from 'react';
import HeroSection from '@/components/layout/HeroSection';
import FeaturedProducts from '@/components/product/FeaturedProducts';
import DropTeaser from '@/components/drop/DropTeaser';
import CategoryGrid from '@/components/product/CategoryGrid';
import { contentApi } from '@/services/api';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { usePublicSettings } from '@/hooks/usePublicSettings';

export default function HomeClient() {
  const { settings, isError: settingsError } = usePublicSettings();
  const [homeBlocks, setHomeBlocks] = useState<any[]>([]);

  useEffect(() => {
    contentApi.list('HOME')
      .then(({ data }) => setHomeBlocks(Array.isArray(data) ? data : []))
      .catch(() => null);
  }, []);

  const sectionIsVisible = (value: boolean | undefined) => settingsError || value === true;

  return (
    <>
      <HeroSection />
      {homeBlocks.map((block) => (
        <section key={block.id} className="px-4 py-16 text-white md:px-6">
          <ScrollReveal className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_.9fr] md:items-center">
            <div>
              <h2 className="text-3xl font-semibold md:text-5xl">{block.title}</h2>
              {block.subtitle && <p className="mt-4 text-lg text-orange-100/75">{block.subtitle}</p>}
              {block.body && <p className="mt-5 whitespace-pre-line leading-relaxed text-white/60">{block.body}</p>}
            </div>
            {block.imageUrl && <img src={block.imageUrl} alt={block.title} className="max-h-[440px] w-full object-cover" />}
          </ScrollReveal>
        </section>
      ))}
      {sectionIsVisible(settings?.showDrops) ? <DropTeaser /> : null}
      {sectionIsVisible(settings?.showFeatured) ? <FeaturedProducts /> : null}
      {sectionIsVisible(settings?.showCategories) ? <CategoryGrid /> : null}
    </>
  );
}
