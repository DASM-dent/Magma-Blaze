"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  const pathname = usePathname();
  const skipGate = pathname?.startsWith("/admin") || pathname?.startsWith("/dixnissowner") || pathname?.startsWith("/login") || pathname?.startsWith("/cuenta");
  const [state, setState] = useState<SiteState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (skipGate) {
      setState({ mode: "OPEN" });
      setReady(true);
      return;
    }

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

  if (skipGate) return <>{children}</>;

  if (!ready) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center z-50">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6">
          <div className="soft-title text-5xl text-white">Magma Blaze</div>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className="w-2 h-2 rounded-full bg-ember-DEFAULT" animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }} />
            ))}
          </div>
        </motion.div>
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
      <motion.div key="site" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
