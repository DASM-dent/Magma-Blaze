'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Newspaper, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useStoreLocale } from '@/context/LocaleContext';
import ScrollReveal from '@/components/ui/ScrollReveal';

type NewsPost = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  type: string;
  createdAt: string;
};

type NewsContentBlock = {
  id: string;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  url?: string | null;
  imageUrl?: string | null;
  createdAt: string;
};

type PublicNewsItem = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl?: string | null;
  type: string;
  createdAt: string;
  url?: string | null;
};

export default function NovedadesPage() {
  const { t } = useStoreLocale();
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['public-news-v2'],
    queryFn: async () => {
      const [blocks, posts] = await Promise.all([
        api<NewsContentBlock[]>('/content?area=NEWS'),
        api<NewsPost[]>('/news'),
      ]);

      const contentItems: PublicNewsItem[] = blocks.map((block) => ({
        id: `content-${block.id}`,
        title: block.title,
        excerpt: block.subtitle || block.body || '',
        content: block.body || '',
        imageUrl: block.imageUrl,
        type: 'NOVEDAD',
        createdAt: block.createdAt,
        url: block.url,
      }));

      const legacyItems: PublicNewsItem[] = posts.map((post) => ({
        id: `post-${post.id}`,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        imageUrl: post.imageUrl,
        type: post.type,
        createdAt: post.createdAt,
      }));

      return [...contentItems, ...legacyItems];
    },
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
            <Newspaper size={27} />
          </motion.div>
          <div className="showcase-hero-copy">
            <h1>{t('news.title')}</h1>
            <p>{t('news.copy')}</p>
          </div>
        </motion.div>
      </header>

      <section className="showcase-body">
        {isLoading ? <p className="showcase-loading">{t('news.loading')}...</p> : null}

        {isError ? (
          <div className="showcase-error">
            <p>No pudimos cargar las novedades.</p>
            <button type="button" onClick={() => refetch()} className="btn-ghost">
              Intentar de nuevo
            </button>
          </div>
        ) : null}

        {!isLoading && !isError && data.length ? (
          <div className="news-editorial-list">
            {data.map((post, index) => (
              <ScrollReveal
                key={post.id}
                delay={Math.min(index * 0.06, 0.24)}
                distance={30}
                amount={0.16}
              >
                {post.imageUrl ? (
                  <div className="news-editorial-media">
                    <img src={post.imageUrl} alt={post.title} />
                    <span>{String(index + 1).padStart(2, '0')}</span>
                  </div>
                ) : (
                  <div className="news-editorial-placeholder"><Sparkles size={28} /></div>
                )}

                <div className="news-editorial-copy">
                  <p className="news-editorial-type">{post.type || 'Novedad'}</p>
                  <h2>{post.title}</h2>
                  {post.excerpt ? <p className="news-editorial-excerpt">{post.excerpt}</p> : null}
                  {post.content && post.content !== post.excerpt ? (
                    <p className="news-editorial-content">{post.content}</p>
                  ) : null}
                  {post.url ? (
                    <a href={post.url} className="showcase-link">
                      Descubrir <ArrowRight size={16} />
                    </a>
                  ) : null}
                </div>
              </ScrollReveal>
            ))}
          </div>
        ) : null}

        {!isLoading && !isError && !data.length ? (
          <div className="showcase-empty">
            <Sparkles size={24} />
            <div>
              <h2>Próximamente</h2>
              <p>{t('news.empty')}</p>
            </div>
            <Link href="/catalogo" className="showcase-link">
              Explorar catálogo <ArrowRight size={16} />
            </Link>
          </div>
        ) : null}

        <div className="showcase-footer-action">
          <Link href="/" className="showcase-link">
            {t('common.backHome')} <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
