'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { contentApi } from '@/services/api';
import { useStoreLocale } from '@/context/LocaleContext';

const MAP: Record<string, [string, string]> = {
  envios: ['SHIPPING_INFO', 'content.shipping'],
  devoluciones: ['RETURNS', 'content.returns'],
  faq: ['FAQ', 'content.faq'],
  contacto: ['CONTACT', 'content.contact'],
  privacidad: ['PRIVACY', 'content.privacy'],
  terminos: ['TERMS', 'content.terms'],
};

export default function ContentPage({ kind }: { kind: string }) {
  const { t } = useStoreLocale();
  const [area, titleKey] = MAP[kind] || ['HOME', 'content.generic'];
  const { data = [], isLoading } = useQuery({ queryKey: ['content', area, kind], queryFn: () => contentApi.list(area).then(r => r.data) });
  const blocks: any[] = data as any[];
  return (
    <section className="min-h-screen px-4 pt-32 pb-20 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/[.035] p-8">
          <h1 className="text-4xl md:text-5xl font-semibold">{t(titleKey)}</h1>
        </div>
        {isLoading && <p className="text-white/45">{t('content.loading')}...</p>}
        {!isLoading && !blocks.length && (
          <div className="rounded-[2rem] border border-white/10 bg-white/[.035] p-8">
            <h2 className="text-2xl font-semibold">{t('content.unpublished')}</h2>
            <p className="mt-3 text-white/55">{t('content.empty')}</p>
            <Link href="/" className="btn-ember mt-8 inline-flex">{t('common.backHome')}</Link>
          </div>
        )}
        {blocks.map(b => (
          <article key={b.id} className="rounded-[2rem] border border-white/10 bg-white/[.035] p-8">
            {b.imageUrl && <img src={b.imageUrl} className="mb-6 max-h-[420px] w-full rounded-3xl object-cover" alt="" />}
            <h2 className="text-2xl md:text-3xl font-semibold">{b.title}</h2>
            {b.subtitle && <p className="mt-2 text-orange-200/80">{b.subtitle}</p>}
            {b.body && <p className="mt-4 whitespace-pre-line leading-relaxed text-white/60">{b.body}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
