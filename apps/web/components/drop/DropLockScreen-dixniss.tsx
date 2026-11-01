"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, Instagram, MessageCircle } from "lucide-react";
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
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    mins: Math.floor((diff % 3_600_000) / 60_000),
    secs: Math.floor((diff % 60_000) / 1_000),
  };
}

function CountUnit({ value, label }: { value: number; label: string }) {
  const [previous, setPrevious] = useState(value);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (value === previous) return;
    setChanging(true);
    const timeout = window.setTimeout(() => {
      setPrevious(value);
      setChanging(false);
    }, 260);
    return () => window.clearTimeout(timeout);
  }, [previous, value]);

  return (
    <div className="drop-count-unit">
      <div className="drop-count-value">
        <motion.span
          key={value}
          initial={{ opacity: 0, y: changing ? -12 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
        >
          {String(value).padStart(2, "0")}
        </motion.span>
      </div>
      <span>{label}</span>
    </div>
  );
}

export default function DropLockScreen({ drop, showBack = false }: { drop: Drop; showBack?: boolean }) {
  const { t } = useStoreLocale();
  const [time, setTime] = useState<TimeLeft>(() => getTimeLeft(drop.startsAt));
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setTime(getTimeLeft(drop.startsAt)), 1000);
    return () => window.clearInterval(interval);
  }, [drop.startsAt]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 42 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      velocityX: (Math.random() - 0.5) * 0.25,
      velocityY: -(0.18 + Math.random() * 0.58),
      radius: 0.6 + Math.random() * 1.7,
      opacity: 0.12 + Math.random() * 0.45,
    }));

    let frame = 0;
    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle) => {
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(255, 91, 20, ${particle.opacity})`;
        context.fill();
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        if (particle.y < -5) {
          particle.x = Math.random() * canvas.width;
          particle.y = canvas.height + 5;
        }
      });
      frame = window.requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const handleSubscribe = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await dropApi.subscribe(drop.id, email);
      setSubscribed(true);
      toast.success(t("drop.toastSuccess"));
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(message || t("drop.toastError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`drop-locked-page ${drop.bannerImage ? "has-banner" : ""}`}>
      {drop.bannerImage ? (
        <img className="drop-lock-background" src={drop.bannerImage} alt="" aria-hidden="true" />
      ) : null}
      <div className="drop-lock-shade" aria-hidden="true" />
      <div className="drop-lock-lines" aria-hidden="true" />
      <canvas ref={canvasRef} className="drop-lock-particles" aria-hidden="true" />

      {showBack ? (
        <Link href="/" className="drop-lock-back">
          <ArrowLeft size={17} />
          Volver a la tienda
        </Link>
      ) : null}

      <div className="drop-lock-shell">
        <motion.header
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="drop-lock-header"
        >
          <span>MAGMA BLAZE</span>
          <span>Lanzamiento limitado</span>
        </motion.header>

        <div className="drop-lock-layout">
          <motion.section
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="drop-lock-copy"
          >
            <p>Próxima edición</p>
            <h1>{drop.name}</h1>
            <div className="drop-lock-rule" />
            <span>
              {drop.description || "Una edición creada para aparecer una sola vez. Cuando se agote, no habrá reposición."}
            </span>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.16 }}
            className="drop-lock-timing"
          >
            <p>La espera termina en</p>
            <div className="drop-countdown" aria-label="Tiempo restante para el drop">
              <CountUnit value={time.days} label={t("drop.days")} />
              <CountUnit value={time.hours} label={t("drop.hours")} />
              <CountUnit value={time.mins} label={t("drop.minutes")} />
              <CountUnit value={time.secs} label={t("drop.seconds")} />
            </div>

            <div className="drop-lock-subscribe">
              {subscribed ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="drop-lock-success"
                >
                  <Bell size={19} />
                  <span>{t("drop.subscribed")}</span>
                </motion.div>
              ) : (
                <form onSubmit={handleSubscribe}>
                  <label htmlFor="drop-email">Recibe el aviso de apertura</label>
                  <div>
                    <input
                      id="drop-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="tu@email.com"
                      required
                    />
                    <button type="submit" disabled={loading}>
                      <Bell size={17} />
                      {loading ? "Enviando..." : t("drop.notify")}
                    </button>
                  </div>
                </form>
              )}
              <small>{t("drop.noSpam")}</small>
            </div>
          </motion.section>
        </div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="drop-lock-footer"
        >
          <span>Unidades limitadas · Sin reposición garantizada</span>
          <nav aria-label="Redes de Magma Blaze">
            <a href="https://instagram.com/magmablazelv" target="_blank" rel="noopener noreferrer">
              <Instagram size={17} /> @magmablazelv
            </a>
            <a href={STORE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={17} /> WhatsApp
            </a>
          </nav>
        </motion.footer>
      </div>
    </main>
  );
}
