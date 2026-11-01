"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ChevronDown, ChevronUp, Flame } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useStoreLocale } from "@/context/LocaleContext";
import { usePublicSettings } from "@/hooks/usePublicSettings";

const BRAND_WORDS = [
  { text: "MAGMA", className: "hero-brand-magma" },
  { text: "BLAZE", className: "hero-brand-blaze" },
];
const HERO_OFFERS = [
  { label: "lentes deportivos", detail: "con bolsa y paño de limpieza" },
  { label: "lentes Y2K", detail: "con su bolsa para guardarlos" },
  { label: "AirPods", detail: "incluyen cable de carga; estuche de carga no incluido" },
  { label: "gorras picantes", detail: "ese detalle que remata el look" },
  { label: "collares de mariposa", detail: "un toque especial para llevar tu estilo" },
  { label: "accesorios", detail: "pequeños detalles que hacen tuyo el momento" },
];

export default function HeroSection() {
  const { scrollY } = useScroll();
  const reduceMotion = useReducedMotion();
  const { t } = useStoreLocale();
  const { settings, isError: settingsError } = usePublicSettings();
  const y = useTransform(scrollY, [0, 600], [0, 120]);
  const opacity = useTransform(scrollY, [0, 520], [1, 0.42]);
  const [showTop, setShowTop] = useState(false);
  const [heroOfferIndex, setHeroOfferIndex] = useState(0);
  const mascotSourceRef = useRef<HTMLPictureElement>(null);
  const currentHeroOffer = HERO_OFFERS[heroOfferIndex];
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500);
    onScroll(); window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setHeroOfferIndex((current) => (current + 1) % HERO_OFFERS.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <motion.div className="absolute inset-0" style={{ y: reduceMotion ? 0 : y, opacity: reduceMotion ? 1 : opacity }}>
        <img src="/images/hero-principal.png" alt="Magma Blaze" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 52% 36%, rgba(255,89,18,.16), transparent 34%), linear-gradient(to bottom, rgba(5,4,3,.18), #050403 98%)" }} />
      </motion.div>
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, backgroundSize:'200px'}} />
      <div className="relative z-10 text-center px-6 pt-24 pb-16 max-w-5xl mx-auto">
        <motion.div className="hero-mascot" initial={reduceMotion ? false : { opacity: 0, scale: 0.82, y: 12 }} animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}>
          <picture ref={mascotSourceRef} className="hero-mascot-source">
            <source media="(prefers-reduced-motion: reduce)" srcSet="/images/magmablaze-mascota-circular-estatico.svg" />
            <img src="/images/magmablaze-mascota-circular-animado.svg" alt="La mascota de Magma Blaze" />
          </picture>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="inline-flex items-center gap-2 mb-8 rounded-full border border-orange-400/30 bg-orange-500/10 px-5 py-2">
          <Flame className="w-4 h-4 text-orange-300" />
          <span className="text-sm uppercase tracking-[0.25em] text-white/70">{t("hero.badge")}</span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 34, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.95, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className={`hero-brand-title ${reduceMotion ? "hero-brand-reduced" : ""}`}
          aria-label="Magma Blaze"
        >
          {BRAND_WORDS.map((word, wordIndex) => (
            <span key={word.text} className={`hero-brand-word ${word.className}`} aria-hidden="true">
              {word.text.split("").map((letter, letterIndex) => (
                <span
                  key={`${word.text}-${letterIndex}`}
                  className="hero-brand-letter"
                  style={{ "--brand-letter-index": wordIndex * 5 + letterIndex } as CSSProperties}
                >
                  {letter}
                </span>
              ))}
            </span>
          ))}
          <span className="hero-brand-flare" aria-hidden="true" />
        </motion.h1>
        <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: 0.7, delay: 0.46 }} className="hero-brand-divider" />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.4 }} className="hero-experience-copy">
          <h2 className="hero-experience-headline">No vienes solo por un accesorio.<span>Vienes por esa versión de ti que se siente lista para salir.</span></h2>
          <h3 className="hero-offer-line">
            <span>Encuentra</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={currentHeroOffer.label}
                className="hero-offer-current"
                initial={reduceMotion ? false : { opacity: 0, y: 10, filter: "blur(5px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: reduceMotion ? 0 : 0.32, ease: "easeOut" }}
              >
                <span className="hero-offer-product">{currentHeroOffer.label}</span>
                <span>({currentHeroOffer.detail})</span>
              </motion.span>
            </AnimatePresence>
            <span className="hero-experience-ending">y detalles que encienden tu estilo.</span>
          </h3>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/catalogo" className="btn-ember text-base px-8 py-4">{t("hero.collection")} <ArrowRight className="w-4 h-4" /></Link>
          {settingsError || settings?.showDrops === true ? (
            <Link href="/drops" className="btn-ghost text-base px-8 py-4"><Flame className="w-4 h-4" /> {t("hero.drops")}</Link>
          ) : null}
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="hero-scroll-cue pointer-events-none mt-10 flex flex-col items-center gap-1">
          <span className="text-xs text-white/25 uppercase tracking-widest">{t("hero.scroll")}</span>
          <motion.div animate={reduceMotion ? undefined : { y: [0, 8, 0], opacity: [0.35, 1, 0.35] }} transition={{ repeat: Infinity, duration: 1.7, ease: "easeInOut" }} className="hero-scroll-chevron">
            <ChevronDown size={18} />
            <ChevronDown size={18} />
          </motion.div>
        </motion.div>
      </div>
      <AnimatePresence>
        {showTop ? (
          <motion.button
            initial={{ opacity: 0, y: 18, scale: 0.84 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.84 }}
            whileHover={reduceMotion ? undefined : { y: -4, scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })}
            className="hero-back-to-top"
            aria-label="Volver arriba"
          >
            <ChevronUp />
            <span>Subir</span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
