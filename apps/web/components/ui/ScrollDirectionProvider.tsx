"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export type ScrollDirection = "up" | "down";

const ScrollDirectionContext = createContext<ScrollDirection>("down");

export function ScrollDirectionProvider({ children }: { children: ReactNode }) {
  const [direction, setDirection] = useState<ScrollDirection>("down");
  const lastY = useRef(0);
  const frame = useRef<number | null>(null);
  const directionRef = useRef<ScrollDirection>("down");

  useEffect(() => {
    lastY.current = window.scrollY;

    const updateDirection = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastY.current;

      if (Math.abs(delta) >= 5) {
        const nextDirection: ScrollDirection = delta > 0 ? "down" : "up";
        if (nextDirection !== directionRef.current) {
          directionRef.current = nextDirection;
          setDirection(nextDirection);
          document.documentElement.dataset.scrollDirection = nextDirection;
        }
        lastY.current = currentY;
      }

      frame.current = null;
    };

    const onScroll = () => {
      if (frame.current === null) frame.current = window.requestAnimationFrame(updateDirection);
    };

    document.documentElement.dataset.scrollDirection = directionRef.current;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
      delete document.documentElement.dataset.scrollDirection;
    };
  }, []);

  return <ScrollDirectionContext.Provider value={direction}>{children}</ScrollDirectionContext.Provider>;
}

export function useScrollDirection() {
  return useContext(ScrollDirectionContext);
}
