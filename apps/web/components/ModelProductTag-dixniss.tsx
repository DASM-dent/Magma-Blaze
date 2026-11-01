'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Crosshair } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';

type ModelProductTagProps = {
  x: number;
  y: number;
  dotSize?: number;
  labelSize?: number;
  labelOffsetX?: number;
  labelOffsetY?: number;
  label: string;
  href?: string;
  animated?: boolean;
};

export function ModelProductTag({
  x,
  y,
  dotSize = 24,
  labelSize = 12,
  labelOffsetX = 0,
  labelOffsetY = 8,
  label,
  href,
  animated = true,
}: ModelProductTagProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [activation, setActivation] = useState<{ x: number; y: number } | null>(null);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safeDotSize = Math.max(12, Math.min(72, Number(dotSize) || 24));
  const safeLabelSize = Math.max(9, Math.min(28, Number(labelSize) || 12));
  const labelPaddingY = Math.max(5, Math.round(safeLabelSize * 0.55));
  const labelPaddingX = Math.max(10, Math.round(safeLabelSize * 1.2));

  const content = <>
    <span
      className="absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2"
      style={{ width: safeDotSize, height: safeDotSize }}
    >
      {animated && <span className="absolute inset-0 animate-ping rounded-full bg-orange-400 opacity-70" />}
      <span className="relative h-full w-full rounded-full border-2 border-white bg-orange-500 shadow-[0_0_25px_rgba(255,85,0,.7)]" />
    </span>
    <span
      className={`absolute block whitespace-nowrap rounded-full bg-black/80 font-black text-white shadow-lg backdrop-blur ${href ? 'hover:bg-orange-500 hover:text-black' : ''}`}
      style={{
        left: labelOffsetX,
        top: (safeDotSize / 2) + labelOffsetY,
        transform: 'translateX(-50%)',
        fontSize: safeLabelSize,
        lineHeight: 1.1,
        padding: `${labelPaddingY}px ${labelPaddingX}px`,
      }}
    >
      {label}
    </span>
  </>;

  const position = {
    left: `${Math.max(0, Math.min(100, Number(x) || 0))}%`,
    top: `${Math.max(0, Math.min(100, Number(y) || 0))}%`,
  };

  useEffect(() => {
    setMounted(true);
    return () => {
      if (navigationTimer.current) clearTimeout(navigationTimer.current);
    };
  }, []);

  const activateProduct = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!href || activation || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();

    if (reduceMotion) {
      router.push(href);
      return;
    }

    setActivation({
      x: event.clientX || window.innerWidth / 2,
      y: event.clientY || window.innerHeight / 2,
    });
    navigationTimer.current = setTimeout(() => router.push(href), 1080);
  };

  if (href) {
    return <>
      <Link
        href={href}
        aria-label={`Ver ${label}`}
        className={`model-product-tag absolute z-20 h-0 w-0 ${activation ? 'is-activating' : ''}`}
        style={position}
        onClick={activateProduct}
      >
        {content}
      </Link>
      {mounted ? createPortal(
        <AnimatePresence>
          {activation ? (
            <motion.div
              className="model-tag-transition"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: .2 }}
              aria-live="polite"
            >
              <motion.span
                className="model-tag-transition-origin"
                style={{ left: activation.x, top: activation.y }}
                initial={{ scale: 0, opacity: .95 }}
                animate={{ scale: 75, opacity: 0 }}
                transition={{ duration: .78, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.div
                className="model-tag-transition-scan"
                initial={{ x: '-120vw' }}
                animate={{ x: '120vw' }}
                transition={{ duration: .82, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.div
                className="model-tag-transition-content"
                initial={{ opacity: 0, y: 24, scale: .96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: .48, delay: .18, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.span
                  className="model-tag-transition-icon"
                  initial={{ rotate: -25, scale: .65 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ duration: .45, delay: .16 }}
                >
                  <Crosshair size={25} />
                </motion.span>
                <span className="model-tag-transition-kicker">Modelo identificado</span>
                <strong>{label}</strong>
                <span className="model-tag-transition-action">
                  Descubriendo el producto <ArrowRight size={16} />
                </span>
              </motion.div>
              <motion.div
                className="model-tag-transition-progress"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: .9, delay: .1, ease: [0.22, 1, 0.36, 1] }}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      ) : null}
    </>;
  }

  return <div className="pointer-events-none absolute z-20 h-0 w-0" style={position}>
    {content}
  </div>;
}
