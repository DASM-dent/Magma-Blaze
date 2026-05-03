"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Globe2, Search, ShoppingBag, User, X, Menu } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { productApi } from "@/services/api";
import CartDrawer from "@/components/cart/CartDrawer";
import SearchResults from "@/components/ui/SearchResults";
import { useStoreLocale } from "@/context/LocaleContext";

export default function Navbar() {
  const { itemCount, openCart } = useCart();
  const { user } = useAuth();
  const { country, currency, symbol, setCountry, setCurrency, t } = useStoreLocale();
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<unknown[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const localeRef = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await productApi.autocomplete(query);
        setResults(data);
      } catch (_) {}
      setSearching(false);
    }, 280);
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!localeRef.current?.contains(event.target as Node)) setLocaleOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLocaleOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const navLinks = [
    { href: "/catalogo", label: t("nav.catalog") },
    { href: "/novedades", label: t("nav.news") },
    { href: "/drops", label: t("nav.drops") },
    { href: "/modelos", label: t("nav.models") },
    { href: "/sobre-nosotros", label: t("nav.about") },
  ];

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(10,10,10,0.96)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(42,42,42,0.8)" : "1px solid transparent",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span
              className="font-display text-2xl md:text-3xl tracking-[0.15em] text-white"
              style={{ textShadow: scrolled ? "none" : "0 0 30px rgba(255,69,0,0.4)" }}
            >
              MAGMA BLAZE
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-heading text-sm uppercase tracking-[0.15em] text-white/60 hover:text-white transition-colors duration-200"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Search toggle */}
            <button
              onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 100); }}
              className="p-2 text-white/60 hover:text-white transition-colors"
              aria-label={t("nav.search")}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* User */}
            <Link
              href={user ? "/cuenta" : "/login"}
              className="p-2 text-white/60 hover:text-white transition-colors"
              aria-label={t("nav.account")}
            >
              <User className="w-5 h-5" />
            </Link>

            {/* Cart */}
            <button
              onClick={openCart}
              className="relative p-2 text-white/60 hover:text-white transition-colors"
              aria-label={t("nav.cart")}
            >
              <ShoppingBag className="w-5 h-5" />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-700 flex items-center justify-center text-white"
                    style={{ background: "var(--ember)" }}
                  >
                    {itemCount > 9 ? "9+" : itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Ubicación / moneda */}
            <div ref={localeRef} className="relative hidden sm:block">
              <button
                onClick={() => setLocaleOpen((open) => !open)}
                className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 text-xs font-bold text-white/75 transition hover:border-white/20 hover:text-white"
                aria-label={t("nav.locale")}
                aria-expanded={localeOpen}
              >
                <Globe2 className="h-4 w-4 text-white/45" />
                <span>{country} / {symbol}</span>
                <ChevronDown className={`h-4 w-4 text-white/45 transition ${localeOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {localeOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 top-12 w-64 rounded-2xl border border-white/10 bg-[#090909]/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl"
                  >
                    <div className="space-y-3">

                      <div>
                        <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">{t("locale.country")}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(["RD", "US"] as const).map((c) => (
                            <button
                              key={c}
                              onClick={() => setCountry(c)}
                              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${country === c ? "bg-white text-black" : "bg-white/[.05] text-white/65 hover:bg-white/10 hover:text-white"}`}
                            >
                              {c}
                              {country === c && <Check className="h-4 w-4" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">{t("locale.currency")}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(["DOP", "USD"] as const).map((c) => (
                            <button
                              key={c}
                              onClick={() => setCurrency(c)}
                              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${currency === c ? "bg-orange-500 text-black" : "bg-white/[.05] text-white/65 hover:bg-white/10 hover:text-white"}`}
                            >
                              {c === "DOP" ? "RD$" : "US$"}
                              {currency === c && <Check className="h-4 w-4" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile menu */}
            <button
              onClick={() => setMenuOpen((p) => !p)}
              className="md:hidden p-2 text-white/60 hover:text-white transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ background: "#0f0f0f", borderTop: "1px solid #1e1e1e", overflow: "hidden" }}
            >
              <nav className="flex flex-col px-4 py-4 gap-4">
                {navLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="font-heading text-base uppercase tracking-[0.15em] text-white/70 hover:text-white"
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
                  {(["DOP", "USD"] as const).map((c) => (
                    <button key={c} onClick={() => setCurrency(c)} className={`rounded-full px-3 py-2 text-sm font-bold ${currency === c ? "bg-orange-500 text-black" : "bg-white/10 text-white/70"}`}>{c === "DOP" ? "RD$" : "US$"}</button>
                  ))}
                  {(["RD", "US"] as const).map((c) => (
                    <button key={c} onClick={() => setCountry(c)} className={`rounded-full px-3 py-2 text-sm font-bold ${country === c ? "bg-white text-black" : "bg-white/10 text-white/70"}`}>{c}</button>
                  ))}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: "rgba(5,5,5,0.97)", backdropFilter: "blur(20px)" }}
          >
            <div className="flex items-center gap-4 p-4 md:p-6 border-b border-white/10">
              <Search className="w-5 h-5 text-white/40 flex-shrink-0" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search.placeholder")}
                className="flex-1 bg-transparent text-white text-lg placeholder-white/25 outline-none"
              />
              <button onClick={() => { setSearchOpen(false); setQuery(""); setResults([]); }}>
                <X className="w-5 h-5 text-white/40 hover:text-white transition-colors" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <SearchResults
                query={query}
                results={results as { id: string; name: string; slug: string; price: number; images: { url: string }[] }[]}
                searching={searching}
                onClose={() => { setSearchOpen(false); setQuery(""); setResults([]); }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer />
    </>
  );
}
