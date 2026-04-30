"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Instagram, Bell, MessageCircle } from "lucide-react";
import { dropApi } from "@/services/api";
import { toast } from "sonner";
import { useStoreLocale } from "@/context/LocaleContext";
import { STORE_WHATSAPP_URL } from "@/lib/whatsapp";

interface Drop {
  id: string;
  name: string;
  description?: string;
  startsAt: string;
  bannerImage?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  mins: number;
  secs: number;
}

function getTimeLeft(target: string): TimeLeft {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    days:  Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    mins:  Math.floor((diff % 3_600_000) / 60_000),
    secs:  Math.floor((diff % 60_000) / 1_000),
  };
}

function CountUnit({ value, label }: { value: number; label: string }) {
  const [prev, setPrev] = useState(value);
  const [flip, setFlip] = useState(false);
  const display = String(value).padStart(2, "0");

  useEffect(() => {
    if (value !== prev) {
      setFlip(true);
      const t = setTimeout(() => { setPrev(value); setFlip(false); }, 300);
      return () => clearTimeout(t);
    }
  }, [value, prev]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-24 md:w-28 md:h-32 overflow-hidden" style={{ background: "rgba(255,69,0,0.08)", border: "1px solid rgba(255,69,0,0.25)" }}>
        {/* Top half static */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-5xl md:text-7xl text-white leading-none tracking-tight" style={{ textShadow: "0 0 40px rgba(255,69,0,0.6)" }}>
            {display}
          </span>
        </div>
        {/* Flip animation */}
        {flip && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ y: "-100%", opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ background: "rgba(255,69,0,0.12)" }}
          >
            <span className="font-display text-5xl md:text-7xl text-white leading-none">
              {String(prev).padStart(2, "0")}
            </span>
          </motion.div>
        )}
        {/* Center line */}
        <div className="absolute top-1/2 left-0 right-0 h-px" style={{ background: "rgba(255,69,0,0.3)" }} />
        {/* Top shine */}
        <div className="absolute top-0 left-0 right-0 h-1/3" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.04), transparent)" }} />
      </div>
      <span className="font-heading text-xs md:text-sm uppercase tracking-[0.25em] text-white/40">
        {label}
      </span>
    </div>
  );
}

export default function DropLockScreen({ drop, showBack = false }: { drop: Drop; showBack?: boolean }) {
  const { t } = useStoreLocale();
  const [time, setTime] = useState<TimeLeft>(getTimeLeft(drop.startsAt));
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const whatsappUrl = STORE_WHATSAPP_URL;

  // Countdown
  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft(drop.startsAt)), 1000);
    return () => clearInterval(id);
  }, [drop.startsAt]);

  // Particle canvas (embers)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const particles: { x: number; y: number; vy: number; vx: number; r: number; a: number; decay: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vy: -(0.3 + Math.random() * 0.8),
        vx: (Math.random() - 0.5) * 0.4,
        r: 1 + Math.random() * 2.5,
        a: Math.random(),
        decay: 0.003 + Math.random() * 0.005,
      });
    }

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${60 + Math.random() * 80}, 0, ${p.a})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        p.a -= p.decay;
        if (p.a <= 0 || p.y < 0) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + 10;
          p.a = Math.random() * 0.7 + 0.3;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await dropApi.subscribe(drop.id, email);
      setSubscribed(true);
      toast.success(t("drop.toastSuccess"));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg || t("drop.toastError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ background: "#050505" }}>
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Radial gradient bg */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(255,69,0,0.15) 0%, transparent 70%)"
      }} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, #ff4500, transparent)" }} />
      {showBack && (
        <Link
          href="/"
          className="absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/65 backdrop-blur transition hover:border-orange-400/40 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <div
            className="font-display text-6xl md:text-8xl lg:text-9xl tracking-[0.2em] text-white"
            style={{ textShadow: "0 0 60px rgba(255,69,0,0.5), 0 0 120px rgba(255,69,0,0.2)" }}
          >
            MAGMA BLAZE
          </div>
        </motion.div>

        {/* Drop name */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-4"
        >
          <div className="inline-flex items-center gap-3 px-4 py-2" style={{ border: "1px solid rgba(255,69,0,0.4)", background: "rgba(255,69,0,0.08)" }}>
            <div className="w-2 h-2 rounded-full bg-ember-DEFAULT animate-pulse-slow" style={{ boxShadow: "0 0 8px #ff4500" }} />
            <span className="font-heading text-sm uppercase tracking-[0.3em] text-ember-DEFAULT">
              Drop: {drop.name}
            </span>
          </div>
        </motion.div>

        {drop.description && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="max-w-md text-white/50 text-sm mb-12 leading-relaxed font-300"
          >
            {drop.description}
          </motion.p>
        )}

        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mb-12"
        >
          <div className="flex items-end gap-3 md:gap-6">
            <CountUnit value={time.days} label={t("drop.days")} />
            <div className="font-display text-4xl md:text-6xl text-ember-DEFAULT pb-8" style={{ textShadow: "0 0 20px rgba(255,69,0,0.5)" }}>:</div>
            <CountUnit value={time.hours} label={t("drop.hours")} />
            <div className="font-display text-4xl md:text-6xl text-ember-DEFAULT pb-8" style={{ textShadow: "0 0 20px rgba(255,69,0,0.5)" }}>:</div>
            <CountUnit value={time.mins} label={t("drop.minutes")} />
            <div className="font-display text-4xl md:text-6xl text-ember-DEFAULT pb-8" style={{ textShadow: "0 0 20px rgba(255,69,0,0.5)" }}>:</div>
            <CountUnit value={time.secs} label={t("drop.seconds")} />
          </div>
        </motion.div>

        {/* Subscribe form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="w-full max-w-md mb-8"
        >
          {subscribed ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center justify-center gap-3 p-4"
              style={{ background: "rgba(255,69,0,0.1)", border: "1px solid rgba(255,69,0,0.3)" }}
            >
              <Bell className="w-5 h-5 text-ember-DEFAULT" />
              <span className="font-heading text-white/80">{t("drop.subscribed")}</span>
            </motion.div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-0">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="flex-1 px-4 py-3 text-sm text-white placeholder-white/25 outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRight: "none" }}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 font-heading font-700 text-sm uppercase tracking-widest text-white transition-all"
                style={{ background: "var(--ember)", border: "1px solid var(--ember)" }}
              >
                {loading ? "..." : t("drop.notify")}
              </button>
            </form>
          )}
          <p className="text-white/25 text-xs mt-2 text-center">
            {t("drop.noSpam")}
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.8, duration: 0.5 }} className="w-32 h-px mb-6" style={{ background: "rgba(255,69,0,0.3)" }} />

        {/* Social links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <a href="https://instagram.com/magmablazelv" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors text-sm">
            <Instagram className="w-4 h-4" />
            <span>@magmablazelv</span>
          </a>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors text-sm">
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
        </motion.div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, rgba(255,69,0,0.4), transparent)" }} />
    </div>
  );
}
