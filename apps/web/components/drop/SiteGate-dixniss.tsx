"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { dropApi } from "@/services/api";
import { api } from "@/lib/api";
import DropLockScreen from "./DropLockScreen";
import { useStoreLocale } from "@/context/LocaleContext";

type SiteMode = "OPEN" | "DROP_LOCKED" | "NO_DROP" | "NO_STOCK" | "MAINTENANCE" | "BLOCKED";

interface SiteState {
  mode: SiteMode;
  drop?: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    startsAt: string;
    bannerImage?: string;
  };
  message?: string;
}

export default function SiteGate({ children }: { children: React.ReactNode }) {
  const { t } = useStoreLocale();
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const skipGate = pathname?.startsWith("/admin") || pathname?.startsWith("/dixnissowner") || pathname?.startsWith("/login") || pathname?.startsWith("/cuenta");
  const [state, setState] = useState<SiteState | null>(null);
  const [ready, setReady] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const introStartedAt = useRef(Date.now());

  useEffect(() => {
    if (skipGate) {
      setState({ mode: "OPEN" });
      setReady(true);
      return;
    }

    setReady(false);
    setIntroComplete(false);
    introStartedAt.current = Date.now();
    let active = true;
    async function loadState() {
      try {
        const security = await api<{ banned?: boolean }>('/security/status');
        if (active && security?.banned) {
          setState({ mode: "BLOCKED" });
          setReady(true);
          return;
        }
      } catch {
        // If the security check is unreachable, do not break public browsing.
      }

      dropApi
        .siteState()
        .then(({ data }) => { if (active) setState(data); })
        .catch(() => { if (active) setState({ mode: "OPEN" }); })
        .finally(() => { if (active) setReady(true); });
    }

    loadState();
    return () => { active = false; };
  }, [skipGate]);

  useEffect(() => {
    if (!ready) return;
    const elapsed = Date.now() - introStartedAt.current;
    const minimumDuration = reduceMotion ? 180 : 1450;
    const timer = window.setTimeout(() => setIntroComplete(true), Math.max(0, minimumDuration - elapsed));
    return () => window.clearTimeout(timer);
  }, [ready, reduceMotion]);

  if (skipGate) return <>{children}</>;

  if (!ready || !introComplete) {
    return (
      <div className="magma-intro" role="status" aria-label="Cargando Magma Blaze">
        <div className="magma-intro-grid" />
        <div className="magma-intro-sweep magma-intro-sweep-one" />
        <div className="magma-intro-sweep magma-intro-sweep-two" />
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="magma-intro-core"
        >
          <motion.div
            className="magma-intro-mark"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.55, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          />
          <div className="magma-intro-name">
            <motion.span
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
            >
              MAGMA
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: -26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.32 }}
            >
              BLAZE
            </motion.span>
          </div>
          <div className="magma-intro-progress"><span /></div>
          <div className="magma-intro-status">
            <span className="magma-intro-spinner" aria-hidden="true"><i /></span>
            <p>Cargando Magma Blaze</p>
          </div>
        </motion.div>
        <span className="magma-intro-corner magma-intro-corner-tl" />
        <span className="magma-intro-corner magma-intro-corner-br" />
      </div>
    );
  }

  if (state?.mode === "DROP_LOCKED" && state.drop) return <DropLockScreen drop={state.drop} />;

  if (state?.mode === "NO_DROP") {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-[#050505] p-6 text-white">
        <div className="max-w-xl text-center">
          <div className="mb-6 inline-flex rounded-full border border-orange-400/30 bg-orange-500/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.25em] text-orange-200">Drop mode</div>
          <h1 className="text-4xl md:text-6xl font-black">{t('gate.noDropTitle')}</h1>
          <p className="mx-auto mt-5 max-w-md text-white/55">{state.message || t('gate.noDropCopy')}</p>
        </div>
      </div>
    );
  }

  if (state?.mode === "MAINTENANCE") {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center z-50 p-6">
        <div className="text-center max-w-md">
          <div className="soft-title text-5xl text-white mb-8">Magma Blaze</div>
          <div className="divider-ember mb-8" />
          <p className="font-heading text-2xl text-white/70 font-300 mb-4">{t('gate.maintenance')}</p>
          <p className="text-white/50 text-sm">{state.message || t('gate.maintenanceCopy')}</p>
        </div>
      </div>
    );
  }

  if (state?.mode === "BLOCKED") {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-[#050505] p-6 text-white">
        <div className="max-w-md text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-300">Acceso restringido</p>
          <h1 className="mt-4 text-4xl font-black">Acceso no disponible</h1>
          <p className="mx-auto mt-5 max-w-sm text-sm text-white/50">No podemos mostrar esta pagina desde esta conexion.</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="site"
        initial={{ opacity: 0, clipPath: reduceMotion ? "none" : "inset(0 0 100% 0)" }}
        animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
        transition={{ duration: reduceMotion ? 0.01 : 0.82, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
