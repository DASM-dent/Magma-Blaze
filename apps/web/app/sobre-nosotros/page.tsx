'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { contentApi } from '@/services/api';
import { useStoreLocale } from '@/context/LocaleContext';

export default function Page() {
  const { t } = useStoreLocale();
  const { data = [], isLoading } = useQuery({ queryKey: ['content-about'], queryFn: () => contentApi.list('ABOUT').then(r => r.data) });
  const blocks: any[] = data as any[];
  return (
    <section className="min-h-screen px-4 pt-32 pb-20 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/[.035] p-8">
          <h1 className="text-4xl md:text-5xl font-black">{t('about.title')}</h1>
          <p className="mt-4 max-w-2xl text-white/55">{t('about.copy')}</p>
        </div>
        {isLoading ? <p className="text-white/45">{t('content.loading')}...</p> : null}
        {!isLoading && !blocks.length ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/[.035] p-8">
            <h2 className="text-2xl font-bold">{t('about.comingSoon')}</h2>
            <p className="mt-3 text-white/55">{t('about.empty')}</p>
            <Link href="/" className="btn-ember mt-8 inline-flex">{t('common.backHome')}</Link>
          </div>
        ) : null}
        {blocks.map((b) => (
          <article key={b.id} className="rounded-[2rem] border border-white/10 bg-white/[.035] p-8">
            {b.imageUrl ? <img src={b.imageUrl} alt={b.title} className="mb-6 max-h-[420px] w-full rounded-3xl object-cover" /> : null}
            <h2 className="text-2xl md:text-3xl font-bold">{b.title}</h2>
            {b.subtitle ? <p className="mt-2 text-orange-200/80">{b.subtitle}</p> : null}
            {b.body ? <p className="mt-4 whitespace-pre-line leading-relaxed text-white/60">{b.body}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
