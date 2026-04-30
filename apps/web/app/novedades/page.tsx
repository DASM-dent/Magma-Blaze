'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useStoreLocale } from '@/context/LocaleContext';

type NewsPost = { id:string; title:string; slug:string; excerpt:string; content:string; imageUrl?:string; type:string; createdAt:string };

export default function NovedadesPage() {
  const { t } = useStoreLocale();
  const { data=[], isLoading } = useQuery({ queryKey:['public-news'], queryFn:()=>api<NewsPost[]>('/news') });
  return (
    <section className="min-h-screen px-4 pt-32 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 rounded-[2rem] border border-white/10 bg-white/[.035] p-8">
          <h1 className="soft-title text-4xl md:text-5xl">{t('news.title')}</h1>
          <p className="mt-4 max-w-2xl text-white/55">{t('news.copy')}</p>
        </div>
        {isLoading && <p className="text-white/50">{t('news.loading')}...</p>}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data.map(post => (
            <article key={post.id} className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.035]">
              {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="h-56 w-full object-cover" />}
              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-[.18em] text-orange-300">{post.type}</p>
                <h2 className="mt-2 text-2xl font-black">{post.title}</h2>
                <p className="mt-3 text-sm text-white/55">{post.excerpt}</p>
                <p className="mt-4 line-clamp-2 text-sm text-white/40">{post.content}</p>
              </div>
            </article>
          ))}
        </div>
        {!isLoading && !data.length && <div className="rounded-[2rem] border border-dashed border-white/15 p-10 text-center text-white/45">{t('news.empty')}</div>}
        <Link href="/" className="btn-ember mt-8 inline-flex">{t('common.backHome')}</Link>
      </div>
    </section>
  );
}
