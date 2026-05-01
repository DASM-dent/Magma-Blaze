'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Camera, Flame } from 'lucide-react';
import { api } from '@/lib/api';
import { useStoreLocale } from '@/context/LocaleContext';

type ModelPhoto = { id:string; imageUrl:string; caption?:string; tagX:number; tagY:number; product:{ name:string; slug:string; price:number } };

export default function ModelosPage() {
  const { t } = useStoreLocale();
  const { data, isLoading } = useQuery({ queryKey:['public-model-photos'], queryFn:()=>api<{drop:any; photos:ModelPhoto[]}>('/drops/active/models') });
  if (isLoading) return <main className="min-h-screen bg-black pt-28 text-white"><p className="text-center text-white/50">{t('models.loading')}...</p></main>;
  if (!data?.drop) return <main className="min-h-screen bg-[#050403] px-4 pt-32 text-white"><section className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-white/[.035] p-8 text-center"><p className="text-xs font-bold uppercase tracking-[.22em] text-orange-300">{t('models.closed')}</p><h1 className="mt-3 soft-title text-4xl md:text-5xl">{t('models.closedTitle')}</h1><p className="mx-auto mt-4 max-w-2xl text-white/55">{t('models.closedCopy')}</p><Link href="/drops" className="btn-ember mt-8 inline-flex">{t('home.viewDrops')}</Link></section></main>;
  return <main className="min-h-screen bg-[#050403] pt-24 text-white">
    <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-orange-300"><Flame size={16} /> {t('models.active')}</p>
          <h1 className="soft-title text-5xl md:text-6xl">{t('models.title')}</h1>
          <p className="mt-4 max-w-2xl text-white/55">{t('models.copy')}</p>
        </div>
        <Link href="/catalogo" className="btn-ember">{t('hero.collection')}</Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {data.photos.map((photo)=><article key={photo.id} className="group overflow-hidden rounded-[2.2rem] border border-white/10 bg-white/[.035]">
          <div className="relative aspect-[4/5] overflow-hidden">
            <img src={photo.imageUrl} alt={photo.product.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            <Link href={'/producto?slug='+encodeURIComponent(photo.product.slug)} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left:photo.tagX+'%', top:photo.tagY+'%' }}>
              <span className="relative flex h-6 w-6"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-70" /><span className="relative inline-flex h-6 w-6 rounded-full border-2 border-white bg-orange-500 shadow-[0_0_25px_rgba(255,85,0,.7)]" /></span>
              <span className="mt-2 block whitespace-nowrap rounded-full bg-black/80 px-4 py-2 text-xs font-black backdrop-blur hover:bg-orange-500 hover:text-black">{photo.product.name}</span>
            </Link>
          </div>
          <div className="p-5"><p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-orange-300"><Camera size={14} /> {t('models.tagged')}</p><h2 className="text-xl font-black">{photo.product.name}</h2><p className="mt-2 text-sm text-white/50">{photo.caption || t('models.editorial')}</p></div>
        </article>)}
      </div>
      {!data.photos.length && <div className="rounded-[2rem] border border-dashed border-white/15 p-10 text-center text-white/45">{t('models.empty')}</div>}
    </section>
  </main>;
}
