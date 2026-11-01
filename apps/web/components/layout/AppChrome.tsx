"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MarketingPopup from "@/components/layout/MarketingPopup";
import { ScrollDirectionProvider } from "@/components/ui/ScrollDirectionProvider";

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") || pathname?.startsWith("/dixnissowner");
  const reduceMotion = useReducedMotion();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const main = mainRef.current;
    if (isAdmin || reduceMotion || !main || typeof IntersectionObserver === "undefined") return;

    const candidates = Array.from(main.querySelectorAll<HTMLElement>(
      ":scope > section, :scope > article, :scope > div > section, :scope > div > article"
    ));
    const homeHero = pathname === "/" ? main.querySelector("section") : null;
    const revealElements = candidates.filter((element) => element !== homeHero && !element.hasAttribute("data-no-reveal"));
    revealElements.forEach((element, index) => {
      element.classList.add("mb-scroll-reveal");
      element.style.setProperty("--mb-reveal-delay", Math.min(index * 55, 220) + "ms");
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -7% 0px" });
    revealElements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      revealElements.forEach((element) => {
        element.classList.remove("mb-scroll-reveal", "is-visible");
        element.style.removeProperty("--mb-reveal-delay");
      });
    };
  }, [pathname, isAdmin, reduceMotion]);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <ScrollDirectionProvider>
      <Navbar />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={pathname}
          ref={mainRef}
          className="public-main"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: reduceMotion ? 0 : 0.28, ease: "easeOut" }}
        >
          {children}
        </motion.main>
      </AnimatePresence>
      <Footer />
      <MarketingPopup />
    </ScrollDirectionProvider>
  );
}