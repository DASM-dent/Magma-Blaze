'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Camera, Images, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useStoreLocale } from '@/context/LocaleContext';
import { ModelProductTag } from '@/components/ModelProductTag';
import ScrollReveal from '@/components/ui/ScrollReveal';

type ModelPhoto = {
  id: string;
  imageUrl: string;
  caption?: string;
  tagX: number;
  tagY: number;
  tagDotSize: number;
  tagLabelSize: number;
  tagLabelOffsetX: number;
  tagLabelOffsetY: number;
  product: { name: string; slug: string; price: number };
};

export default function ModelosPage() {
  const { t } = useStoreLocale();
  const { data, isLoading } = useQuery({
    queryKey: ['public-model-photos'],
    queryFn: () => api<{ drop: unknown; photos: ModelPhoto[] }>('/drops/active/models'),
  });

  return (
    <main className="showcase-page">
      <header className="showcase-hero">
        <motion.div
          className="showcase-hero-inner"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="showcase-hero-icon"
            initial={{ opacity: 0, rotate: -8, scale: 0.86 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.12 }}
          >
            <Images size={27} />
          </motion.div>
          <div className="showcase-hero-copy">
            <h1>{t('models.title')}</h1>
            <p>{t('models.copy')}</p>
          </div>
        </motion.div>
      </header>

      <section className="showcase-body">
        {isLoading ? <p className="showcase-loading">{t('models.loading')}...</p> : null}

        {!isLoading && !data?.photos?.length ? (
          <div className="showcase-empty">
            <Sparkles size={24} />
            <div>
              <h2>{t('models.closedTitle')}</h2>
              <p>{t('models.closedCopy')}</p>
            </div>
            <Link href="/catalogo" className="showcase-link">
              {t('hero.collection')} <ArrowRight size={16} />
            </Link>
          </div>
        ) : null}

        {data?.photos?.length ? (
          <>
            <div className="models-lookbook-heading">
              <div>
                <h2>Looks etiquetados</h2>
                <p>Presiona una etiqueta para conocer el producto que aparece en la fotografía.</p>
              </div>
              <Link href="/catalogo" className="showcase-link">
                {t('hero.collection')} <ArrowRight size={16} />
              </Link>
            </div>

            <div className="models-lookbook-grid">
              {data.photos.map((photo, index) => (
                <ScrollReveal
                  key={photo.id}
                  delay={Math.min(index * 0.06, 0.24)}
                  distance={28}
                  amount={0.16}
                  className="model-look"
                >
                  <div className="model-look-media">
                    <img src={photo.imageUrl} alt={photo.product.name} />
                    <ModelProductTag
                      x={photo.tagX}
                      y={photo.tagY}
                      dotSize={photo.tagDotSize}
                      labelSize={photo.tagLabelSize}
                      labelOffsetX={photo.tagLabelOffsetX}
                      labelOffsetY={photo.tagLabelOffsetY}
                      label={photo.product.name}
                      href={`/producto?slug=${encodeURIComponent(photo.product.slug)}`}
                    />
                    <span className="model-look-index">{String(index + 1).padStart(2, '0')}</span>
                  </div>

                  <div className="model-look-copy">
                    <p><Camera size={14} /> {t('models.tagged')}</p>
                    <h2>{photo.product.name}</h2>
                    <span>{photo.caption || t('models.editorial')}</span>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
