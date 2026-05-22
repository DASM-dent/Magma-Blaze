"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { STORE_WHATSAPP_URL } from "@/lib/whatsapp";

type PopupAction = "LINK" | "CLOSE" | "HOME" | "WHATSAPP";

type MarketingPopupData = {
  id: string;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  imageUrl?: string | null;
  backgroundColor: string;
  overlayColor: string;
  titleColor: string;
  subtitleColor: string;
  bodyColor: string;
  width: number;
  height: number;
  titleX: number;
  titleY: number;
  titleAlign?: "left" | "center" | "right";
  subtitleX: number;
  subtitleY: number;
  subtitleAlign?: "left" | "center" | "right";
  bodyX: number;
  bodyY: number;
  bodyAlign?: "left" | "center" | "right";
  buttonsX: number;
  buttonsY: number;
  buttonsAlign?: "left" | "center" | "right";
  primaryLabel: string;
  primaryAction: PopupAction;
  primaryUrl?: string | null;
  primaryBgColor: string;
  primaryTextColor: string;
  secondaryLabel?: string | null;
  secondaryAction: PopupAction;
  secondaryUrl?: string | null;
  secondaryBgColor: string;
  secondaryTextColor: string;
  delaySeconds: number;
  showOnce: boolean;
};

const seenKey = (id: string) => `mb_marketing_popup_seen_${id}`;

function percentStyle(x: number, y: number) {
  return {
    left: `${Math.max(0, Math.min(100, Number(x || 0)))}%`,
    top: `${Math.max(0, Math.min(100, Number(y || 0)))}%`,
  };
}

function alignStyle(align?: "left" | "center" | "right") {
  if (align === "left") return { textAlign: "left" as const, transform: "translateY(-50%)", justifyContent: "flex-start" as const };
  if (align === "right") return { textAlign: "right" as const, transform: "translate(-100%, -50%)", justifyContent: "flex-end" as const };
  return { textAlign: "center" as const, transform: "translate(-50%, -50%)", justifyContent: "center" as const };
}

function buttonAlignClass(align?: "left" | "center" | "right") {
  if (align === "left") return "items-start sm:justify-start";
  if (align === "right") return "items-end sm:justify-end";
  return "items-center sm:justify-center";
}

export default function MarketingPopup() {
  const [visible, setVisible] = useState(false);
  const { data: popup } = useQuery({
    queryKey: ["marketing-popup-active"],
    queryFn: () => api<MarketingPopupData | null>("/content/popups/active"),
    retry: false,
    staleTime: 60_000,
  });

  const modalSize = useMemo(() => {
    if (!popup) return {};
    return {
      width: `min(${popup.width || 760}px, calc(100vw - 24px))`,
      height: `min(${popup.height || 520}px, calc(100vh - 48px))`,
    };
  }, [popup]);

  useEffect(() => {
    if (!popup?.id) return;
    const testId = new URLSearchParams(window.location.search).get("mb_popup_test");
    const isTest = testId === "1" || testId === popup.id;
    if (!isTest && popup.showOnce && localStorage.getItem(seenKey(popup.id))) return;
    const delay = isTest ? 0 : Math.max(0, Number(popup.delaySeconds || 0)) * 1000;
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [popup]);

  if (!popup || !visible) return null;

  const markSeen = () => {
    if (popup.showOnce) localStorage.setItem(seenKey(popup.id), new Date().toISOString());
  };
  const close = () => {
    markSeen();
    setVisible(false);
  };
  const runAction = (action: PopupAction, url?: string | null) => {
    markSeen();
    if (action === "CLOSE") {
      setVisible(false);
      return;
    }
    if (action === "HOME") {
      window.location.href = "/";
      return;
    }
    if (action === "WHATSAPP") {
      window.open(url || STORE_WHATSAPP_URL, "_blank", "noopener,noreferrer");
      setVisible(false);
      return;
    }
    if (url) {
      window.location.href = url;
      return;
    }
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 px-3 py-6 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="relative overflow-hidden rounded-[1.35rem] border border-orange-200/25 shadow-[0_30px_120px_rgba(0,0,0,.65)] animate-in zoom-in-95 duration-300"
        style={{ ...modalSize, backgroundColor: popup.backgroundColor || "#120d0a" }}
        role="dialog"
        aria-modal="true"
        aria-label={popup.title}
      >
        {popup.imageUrl && (
          <img
            src={popup.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        )}
        <div className="absolute inset-0" style={{ background: popup.overlayColor || "rgba(0,0,0,0.38)" }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,.18),transparent_42%),linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.44))]" />

        <button
          type="button"
          onClick={close}
          className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/35 text-white transition hover:bg-white hover:text-black"
          aria-label="Cerrar novedad"
        >
          <X size={24} />
        </button>

        <div
          className="absolute z-10 w-[88%] min-w-0 break-words"
          style={{ ...percentStyle(popup.titleX, popup.titleY), ...alignStyle(popup.titleAlign), color: popup.titleColor }}
        >
          <h2 className="text-balance text-[clamp(2rem,6vw,4.4rem)] font-black uppercase leading-[.95] tracking-normal drop-shadow-[0_4px_18px_rgba(0,0,0,.45)]">
            {popup.title}
          </h2>
        </div>

        {popup.subtitle && (
          <p
            className="absolute z-10 w-[82%] min-w-0 break-words text-[clamp(1.05rem,3vw,2rem)] font-extrabold leading-tight drop-shadow-[0_4px_16px_rgba(0,0,0,.5)]"
            style={{ ...percentStyle(popup.subtitleX, popup.subtitleY), ...alignStyle(popup.subtitleAlign), color: popup.subtitleColor }}
          >
            {popup.subtitle}
          </p>
        )}

        {popup.body && (
          <p
            className="absolute z-10 w-[78%] min-w-0 break-words whitespace-pre-line text-[clamp(.95rem,2.15vw,1.45rem)] font-bold leading-snug drop-shadow-[0_4px_16px_rgba(0,0,0,.55)]"
            style={{ ...percentStyle(popup.bodyX, popup.bodyY), ...alignStyle(popup.bodyAlign), color: popup.bodyColor }}
          >
            {popup.body}
          </p>
        )}

        <div
          className={`absolute z-10 flex w-[86%] min-w-0 flex-col gap-3 sm:flex-row ${buttonAlignClass(popup.buttonsAlign)}`}
          style={{ ...percentStyle(popup.buttonsX, popup.buttonsY), ...alignStyle(popup.buttonsAlign) }}
        >
          <button
            type="button"
            onClick={() => runAction(popup.primaryAction, popup.primaryUrl)}
            className="min-w-[190px] rounded-xl px-7 py-4 text-sm font-black uppercase tracking-[.16em] shadow-[0_16px_42px_rgba(0,0,0,.35)] transition hover:-translate-y-0.5 hover:brightness-110"
            style={{ background: popup.primaryBgColor, color: popup.primaryTextColor }}
          >
            {popup.primaryLabel}
          </button>
          {popup.secondaryLabel && (
            <button
              type="button"
              onClick={() => runAction(popup.secondaryAction, popup.secondaryUrl)}
              className="min-w-[150px] rounded-xl border border-white/25 px-6 py-3 text-sm font-bold transition hover:-translate-y-0.5 hover:bg-white/10"
              style={{ background: popup.secondaryBgColor, color: popup.secondaryTextColor }}
            >
              {popup.secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
