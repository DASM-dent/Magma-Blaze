'use client';
import Link from 'next/link';
import { useState } from 'react';
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

function FaqContent({ blocks, isLoading }: { blocks: any[]; isLoading: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const items = blocks;

  return (
    <section className="min-h-screen bg-[#f7f4ef] px-4 pt-32 pb-20 text-[#1f2937]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-orange-600">Soporte</p>
          <h1 className="text-4xl font-light tracking-normal text-[#1f2937] md:text-5xl">Preguntas frecuentes</h1>
          <p className="mt-5 max-w-4xl text-[15px] leading-relaxed text-[#415064]">
            Estamos a tu disposicion para cualquier pregunta sobre productos, disponibilidad, pagos y envios. Magma Blaze opera como tienda virtual, asi que cada pedido se confirma antes de enviarse.
          </p>
        </div>

        {isLoading ? (
          <p className="text-[#6b7280]">Cargando preguntas...</p>
        ) : !items.length ? (
          <div className="border-y border-[#d9d3ca] bg-white/35 px-3 py-8 text-[#6b7280] md:px-4">
            Aun no hay preguntas frecuentes publicadas.
          </div>
        ) : (
          <div className="overflow-hidden border-y border-[#d9d3ca] bg-white/35">
            {items.map((item: any) => {
              const isOpen = openId === item.id;
              return (
                <article key={item.id} className="border-b border-[#d9d3ca] last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className="group flex w-full items-center gap-4 px-3 py-4 text-left transition hover:bg-white/70 md:px-4"
                    aria-expanded={isOpen}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center text-xs text-[#111827] transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                      ▶
                    </span>
                    <span className="text-[15px] font-bold text-[#253143]">{item.title}</span>
                  </button>
                  <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <div className="px-12 pb-8 text-[15px] leading-8 text-[#4b5563] md:px-14">
                        {item.subtitle && <p className="mb-2 font-semibold text-orange-700">{item.subtitle}</p>}
                        <p className="whitespace-pre-line">{item.body || ''}</p>
                        {item.url && <Link href={item.url} className="mt-4 inline-flex text-sm font-bold text-orange-700 hover:text-orange-600">Ver mas</Link>}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default function ContentPage({ kind }: { kind: string }) {
  const { t } = useStoreLocale();
  const [area, titleKey] = MAP[kind] || ['HOME', 'content.generic'];
  const { data = [], isLoading } = useQuery({ queryKey: ['content', area, kind], queryFn: () => contentApi.list(area).then(r => r.data) });
  const blocks: any[] = data as any[];

  if (kind === 'faq') {
    return <FaqContent blocks={blocks} isLoading={isLoading} />;
  }

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
