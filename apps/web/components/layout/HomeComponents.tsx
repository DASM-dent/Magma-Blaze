"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, ArrowRight, Instagram, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { dropApi } from "@/services/api";
import { useStoreLocale } from "@/context/LocaleContext";
import { STORE_WHATSAPP_URL } from "@/lib/whatsapp";
import ScrollReveal from "@/components/ui/ScrollReveal";

// ─── Drop Teaser Banner ───────────────────────────────────────
export function DropTeaser() {
  const { t } = useStoreLocale();
  const { data: site } = useQuery({ queryKey: ["site-state", "drop-teaser"], queryFn: () => dropApi.siteState().then(r => r.data) });
  const { data: activeDrop } = useQuery({ queryKey: ["active-drop", "drop-teaser"], queryFn: () => dropApi.active().then(r => r.data?.drop) });
  if (site?.publicSettings?.showDrops === false || !activeDrop) return null;
  return (
    <section className="py-4 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 36, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden p-8 md:p-12"
          style={{
            background: "linear-gradient(135deg, #1a0a00 0%, #0f0f0f 50%, #1a0a00 100%)",
            border: "1px solid rgba(255,69,0,0.2)",
          }}
        >
          {/* Glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(255,69,0,0.15), transparent)" }} />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-5 h-5 text-ember-DEFAULT animate-pulse-slow" />
                <span className="font-heading text-sm uppercase tracking-[0.3em] text-ember-DEFAULT">
                  {t("home.dropLabel")}
                </span>
              </div>
              <h2 className="font-heading text-3xl md:text-5xl font-700 text-white mb-3">
                {t("home.dropTitle1")}<br />
                <span style={{ color: "var(--ember)" }}>{t("home.dropTitle2")}</span>
              </h2>
              <p className="text-white/40 max-w-md font-300">
                {t("home.dropCopy")}
              </p>
            </div>
            <Link href="/drops" className="btn-ember whitespace-nowrap text-base px-8 py-4 flex-shrink-0">
              {t("home.viewDrops")} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Category Grid ────────────────────────────────────────────
export function CategoryGrid() {
  const { t } = useStoreLocale();
  const { data: site } = useQuery({ queryKey: ["site-state", "categories"], queryFn: () => dropApi.siteState().then(r => r.data) });
  const { data: categories = [] } = useQuery({ queryKey: ["public-categories"], queryFn: () => api<any[]>("/categories") });
  if (site?.publicSettings?.showCategories === false || !categories.length) return null;
  return (
    <section className="py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal>
          <p className="font-heading text-xs uppercase tracking-[0.3em] text-ember-DEFAULT mb-2">{t("home.explore")}</p>
          <h2 className="font-heading text-4xl md:text-5xl font-700 text-white mb-10">{t("home.categories")}</h2>
        </ScrollReveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat: any, i: number) => (
            <ScrollReveal
              key={cat.slug}
              delay={Math.min(i * 0.07, 0.28)}
              distance={30}
              amount={0.16}
            >
              <Link href={`/catalogo?categoria=${cat.slug}`} className="group relative flex aspect-[4/3] flex-col items-center justify-center gap-3 overflow-hidden p-5 text-center transition-all duration-300 [&>span]:relative [&>span]:z-10" style={{ background: "#141414", border: "1px solid #2a2a2a" }}>
                {cat.imageUrl && <img src={cat.imageUrl} alt={cat.name} className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105 group-hover:opacity-85" loading="lazy" />}
                {cat.imageUrl && <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/15" />}
                <span className="text-4xl">{cat.icon || "🕶️"}</span>
                <span className="relative z-10 font-heading text-lg text-white group-hover:text-ember-DEFAULT transition-colors uppercase tracking-wider">{cat.name}</span>
                <span className="relative z-10 text-xs text-white/55">{cat._count?.products || 0} {t("home.products")}</span>
                <ArrowRight className="relative z-10 w-4 h-4 text-white/30 group-hover:text-ember-DEFAULT group-hover:translate-x-1 transition-all" />
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────
export function Footer() {
  const { t } = useStoreLocale();
  const whatsappUrl = STORE_WHATSAPP_URL;
  const { data: site } = useQuery({ queryKey: ["site-state", "footer"], queryFn: () => dropApi.siteState().then(r => r.data) });
  const { data: support = [] } = useQuery({ queryKey: ["footer-support"], queryFn: () => api<any[]>("/content?area=FOOTER_SUPPORT") });
  if (site?.publicSettings?.showFooter === false) return null;
  const knownTitle = (title: string) => {
    const key = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const map: Record<string, string> = {
      envios: t('footer.shipping'),
      faq: 'FAQ',
      contacto: t('content.contact'),
      privacidad: t('footer.privacy'),
      terminos: t('footer.terms'),
    };
    return map[key] || title;
  };
  const visibleSupport = support.filter((item:any)=>{
    const title = String(item.title||'').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const url = String(item.url||'').toLowerCase();
    return title !== 'devoluciones' && !url.includes('/devoluciones');
  });
  const supportLinks = visibleSupport.length ? visibleSupport : [
    { title: t('footer.shipping'), url: '/envios' }, { title: 'FAQ', url: '/faq' }, { title: t('content.contact'), url: '/contacto' }
  ];
  const legalLinks = [
    { title: t('footer.privacy'), url: '/privacidad' },
    { title: t('footer.terms'), url: '/terminos' },
  ];
  return (
    <footer className="border-t border-white/10 py-16 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="soft-title text-3xl tracking-[0.2em] text-white mb-4">MAGMA BLAZE</div>
            <p className="text-white/30 text-sm leading-relaxed max-w-xs">{t("footer.copy")}</p>
            <div className="flex gap-4 mt-6"><a href="https://instagram.com/magmablazelv" target="_blank" rel="noopener noreferrer" aria-label="Instagram Magma Blaze" className="text-white/30 hover:text-white"><Instagram className="w-5 h-5" /></a><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Magma Blaze" className="text-white/30 hover:text-white"><MessageCircle className="w-5 h-5" /></a></div>
          </div>
          <div><h4 className="text-sm uppercase tracking-[0.2em] text-white/40 mb-4">{t("footer.shop")}</h4><ul className="space-y-2">{[{href:'/catalogo',label:t('nav.catalog')},{href:'/novedades',label:t('nav.news')},{href:'/drops',label:t('nav.drops')},{href:'/modelos',label:t('nav.models')}].map(l=><li key={l.href}><Link href={l.href} className="text-sm text-white/50 hover:text-white">{l.label}</Link></li>)}</ul></div>
          <div><h4 className="text-sm uppercase tracking-[0.2em] text-white/40 mb-4">{t("footer.support")}</h4><ul className="space-y-2">{supportLinks.map((l:any)=><li key={l.id||l.url||l.title}><Link href={l.url||'#'} className="text-sm text-white/50 hover:text-white">{knownTitle(l.title)}</Link></li>)}</ul></div>
        </div>
        <div className="divider-ember mb-8" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/20"><p>© {new Date().getFullYear()} Magma Blaze. {t("footer.rights")}</p><div className="flex gap-6">{legalLinks.map((l:any)=><Link key={l.id||l.url||l.title} href={l.url||'#'} className="hover:text-white/50">{knownTitle(l.title)}</Link>)}</div></div>
      </div>
    </footer>
  );
}
