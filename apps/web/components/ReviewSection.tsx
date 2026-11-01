"use client";
import { type FormEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Sparkles, Star, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { productApi, reviewApi } from "@/services/api";
import { useStoreLocale } from "@/context/LocaleContext";

type ProductContext = { slug: string; name: string };
type ReviewSectionProps = { product?: ProductContext };
type ReviewKind = "SITE" | "PRODUCT";
type PublicReview = {
  id: string; kind: ReviewKind; name: string; rating: number; comment: string;
  product?: { name: string; slug: string } | null; productName?: string | null;
  publishedAt?: string | null; createdAt: string;
};
type ReviewFeed = { items: PublicReview[]; total: number; average: number };

function Stars({ rating, interactive = false, onChange }: { rating: number; interactive?: boolean; onChange?: (value: number) => void }) {
  return (
    <div className="flex items-center gap-1" aria-label={rating + " de 5 estrellas"}>
      {[1, 2, 3, 4, 5].map((value) => {
        const star = <Star size={17} aria-hidden="true" className={value <= rating ? "fill-orange-400 text-orange-400" : "text-white/20"} />;
        return interactive
          ? <button key={value} type="button" aria-label={"Calificar con " + value + " estrellas"} aria-pressed={value === rating} onClick={() => onChange?.(value)} className="rounded p-1 transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400">{star}</button>
          : <span key={value}>{star}</span>;
      })}
    </div>
  );
}
function ReviewSummary({ average, total }: { average: number; total: number }) {
  const reduceMotion = useReducedMotion();
  const ratingRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ratingRef.current || !countRef.current) return;
    if (reduceMotion) {
      ratingRef.current.textContent = average.toFixed(1);
      countRef.current.textContent = new Intl.NumberFormat("es-DO").format(total);
      return;
    }
    const ratingControl = animate(0, average, {
      duration: 1.25, ease: "easeOut",
      onUpdate: (value) => { if (ratingRef.current) ratingRef.current.textContent = value.toFixed(1); },
    });
    const countControl = animate(0, total, {
      duration: 1.25, ease: "easeOut",
      onUpdate: (value) => { if (countRef.current) countRef.current.textContent = new Intl.NumberFormat("es-DO").format(Math.round(value)); },
    });
    return () => { ratingControl.stop(); countControl.stop(); };
  }, [average, total, reduceMotion]);
  return (
    <motion.div className="review-summary-card" initial={reduceMotion ? false : { opacity: 0, y: 16 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.45 }} transition={{ duration: 0.45, ease: "easeOut" }} aria-label={"Calificación promedio de " + average.toFixed(1) + " sobre 5, basada en " + total + " reseñas publicadas"}>
      <div className="review-summary-stars" role="img" aria-label={average.toFixed(1) + " de 5 estrellas"}>
        {[0, 1, 2, 3, 4].map((index) => {
          const fill = Math.max(0, Math.min(1, average - index));
          return (
            <motion.span key={index} className="review-summary-star" initial={reduceMotion ? false : { opacity: 0, scale: 0.62 }} whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: reduceMotion ? 0 : 0.12 + index * 0.08 }}>
              <Star className="review-summary-star-base" size={22} aria-hidden="true" />
              <span className="review-summary-star-fill" style={{ width: (fill * 100) + "%" }}><Star size={22} aria-hidden="true" /></span>
            </motion.span>
          );
        })}
      </div>
      <p className="review-summary-rating"><span ref={ratingRef}>0.0</span><span className="review-summary-count">(<span ref={countRef}>0</span> reseñas)</span></p>
      <p className="review-summary-caption">Promedio de las reseñas publicadas</p>
    </motion.div>
  );
}
function ReviewCard({ review }: { review: PublicReview }) {
  const date = new Date(review.publishedAt || review.createdAt);
  const dateLabel = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("es-DO", { year: "numeric", month: "short" });
  return (
    <article className="review-marquee-card">
      <Stars rating={review.rating} />
      <blockquote className="mt-4 whitespace-pre-line text-sm leading-relaxed text-white/75">{review.comment}</blockquote>
      <div className="mt-auto border-t border-white/10 pt-4">
        <p className="font-bold text-white">{review.name}</p>
        {review.kind === "PRODUCT" && <p className="mt-1 text-xs text-orange-200/70">{review.product?.name || review.productName || "Producto Magma Blaze"}</p>}
        {dateLabel && <p className="mt-1 text-xs text-white/35">{dateLabel}</p>}
      </div>
    </article>
  );
}
function updateFormSpotlight(event: PointerEvent<HTMLFormElement>, visible: boolean) {
  const form = event.currentTarget;
  const bounds = form.getBoundingClientRect();
  form.style.setProperty("--cursor-x", (event.clientX - bounds.left) + "px");
  form.style.setProperty("--cursor-y", (event.clientY - bounds.top) + "px");
  form.style.setProperty("--cursor-opacity", visible ? "0.17" : "0");
}
export default function ReviewSection({ product }: ReviewSectionProps) {
  const { t } = useStoreLocale();
  const [kind, setKind] = useState<ReviewKind>(product ? "PRODUCT" : "SITE");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [productSlug, setProductSlug] = useState("");
  const [website, setWebsite] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const reduceMotion = useReducedMotion();
  const reviewDialogRef = useRef<HTMLDialogElement>(null);
  const activeKind: ReviewKind = product ? "PRODUCT" : kind;
  const { data: feed, isLoading, isError } = useQuery<ReviewFeed>({
    queryKey: ["public-reviews", product?.slug || "all"],
    queryFn: () => reviewApi.list({ productSlug: product?.slug, limit: 20 }).then((response: any) => response.data as ReviewFeed),
    staleTime: 60_000,
  });
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["review-product-options"],
    queryFn: () => productApi.list({ limit: 50 }).then((response: any) => Array.isArray(response.data?.items) ? response.data.items : []),
    enabled: !product && activeKind === "PRODUCT",
    staleTime: 5 * 60_000,
  });
  const submit = useMutation({
    mutationFn: (payload: any) => reviewApi.submit(payload).then((response: any) => response.data),
    onSuccess: (response: any) => {
      setName(""); setEmail(""); setRating(5); setComment(""); setProductSlug(""); setWebsite("");
      setSuccessMessage(response?.message || "¡Gracias! Tu reseña quedó pendiente de aprobación.");
      setSubmitted(true);
    },
  });
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit.reset();
    submit.mutate({ kind: activeKind, name, email: email || undefined, rating, comment, productSlug: product?.slug || (activeKind === "PRODUCT" ? productSlug : undefined), website });
  }
  function writeAnotherReview() { setSubmitted(false); setSuccessMessage(""); setRating(5); }
  function openReviewForm() { if (!reviewDialogRef.current?.open) reviewDialogRef.current?.showModal(); }
  function closeReviewForm() { reviewDialogRef.current?.close(); }

  const reviews = Array.isArray(feed?.items) ? feed.items : [];
  const total = Number(feed?.total || 0);
  const average = Number(feed?.average || 0);
  const heading = product ? "Opiniones sobre " + product.name : "Historias que siguen encendiendo el estilo";
  const repeatedReviews = reviews.length ? Array.from({ length: Math.max(1, Math.ceil(6 / reviews.length)) }, () => reviews).flat() : [];

  return (
    <section id={product ? "resenas-producto" : "resenas"} className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="font-heading text-3xl font-bold text-white md:text-5xl">{heading}</h2>
          {!product && (
            <Link href="/catalogo" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[.12em] text-orange-200/80 transition hover:text-orange-300">
              {t("home.viewAll")} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50">
            {total > 0 ? "Opiniones reales de quienes ya eligieron una pieza y vivieron la experiencia Magma Blaze." : "Cada gran historia empieza con una primera reseña. Cuéntanos la tuya."}
          </p>
        </div>
        <motion.button
          type="button"
          onClick={openReviewForm}
          aria-haspopup="dialog"
          aria-controls="review-dialog"
          whileHover={reduceMotion ? undefined : { scale: 1.045, y: -2 }}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          className="review-open-button"
        >
          <Star size={17} fill="currentColor" aria-hidden="true" />
          <span>Dejar una reseña</span>
          <span className="review-open-button-hint" aria-hidden="true">+</span>
        </motion.button>
      </div>
      {!isLoading && !isError && feed && <div className="mb-8 flex justify-center"><ReviewSummary average={average} total={total} /></div>}
      {isLoading && <p className="mb-6 rounded-3xl border border-white/10 bg-white/[.03] p-6 text-sm text-white/50">Cargando reseñas publicadas...</p>}
      {isError && <p role="status" className="mb-6 rounded-3xl border border-white/10 bg-white/[.03] p-6 text-sm text-white/50">Ahora mismo no pudimos cargar las reseñas. Puedes intentarlo de nuevo más tarde.</p>}
      {!isLoading && !isError && !reviews.length && (
        <div className="mb-8 rounded-3xl border border-dashed border-white/15 bg-white/[.025] p-8">
          <p className="text-lg font-semibold text-white">La primera historia puede ser la tuya.</p>
          <p className="mt-2 text-sm text-white/45">Todavía no hay reseñas publicadas. Las opiniones aparecen aquí después de su aprobación.</p>
        </div>
      )}
      {reviews.length > 0 && (product ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div>
      ) : (
        <div className="review-marquee mb-8" role="region" aria-label="Reseñas reales publicadas por clientes">
          <div className="review-marquee-track">
            <div className="review-marquee-group" role="list">{repeatedReviews.map((review, index) => <div role={index < reviews.length ? "listitem" : undefined} aria-hidden={index >= reviews.length ? "true" : undefined} key={review.id + "-" + index}><ReviewCard review={review} /></div>)}</div>
            <div className="review-marquee-group" aria-hidden="true">{repeatedReviews.map((review, index) => <div key={review.id + "-loop-" + index}><ReviewCard review={review} /></div>)}</div>
          </div>
        </div>
      ))}
      <dialog id="review-dialog" ref={reviewDialogRef} className="review-dialog" aria-labelledby="review-dialog-title" onClick={(event) => { if (event.target === event.currentTarget) closeReviewForm(); }}>
        <button type="button" className="review-dialog-close" onClick={closeReviewForm} aria-label="Cerrar formulario"><X size={20} aria-hidden="true" /></button>
      <AnimatePresence mode="wait" initial={false}>
        {submitted ? (
          <motion.div id="formulario-resena" key="review-success" className="review-success-card" initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? undefined : { opacity: 0, y: -12 }} transition={{ duration: 0.42, ease: "easeOut" }} role="status" aria-live="polite">
            <span className="review-success-icon"><Check size={25} aria-hidden="true" /></span>
            <Sparkles className="review-success-spark" size={22} aria-hidden="true" />
            <h3 id="review-dialog-title">¡Tu voz ya llegó a Magma Blaze!</h3><p>{successMessage}</p>
            <p className="review-success-note">El contador y la galería se actualizan cuando la reseña se aprueba y se publica.</p>
            <button type="button" className="btn-ghost mt-5" onClick={writeAnotherReview}>Compartir otra experiencia</button>
          </motion.div>
        ) : (
          <motion.form key="review-form" id="formulario-resena" onSubmit={handleSubmit} onPointerMove={(event) => updateFormSpotlight(event, true)} onPointerLeave={(event) => updateFormSpotlight(event, false)} className="review-form-card mx-auto max-w-3xl rounded-[2rem] border border-orange-400/20 p-5 md:p-7" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -10 }} transition={{ duration: 0.28 }}>
            <p className="text-xs font-black uppercase tracking-[.2em] text-orange-300">Tu opinión cuenta</p>
            <h3 id="review-dialog-title" className="mt-2 text-2xl font-bold text-white">Cuéntanos cómo te fue</h3>
            <p className="mt-2 text-sm text-white/55">Leemos cada reseña antes de publicarla para mantener la comunidad auténtica.</p>
            {!product && <label className="mt-5 block text-sm font-semibold text-white/80">¿Qué quieres calificar?
              <select value={kind} onChange={(event) => setKind(event.target.value as ReviewKind)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#16110f] px-4 py-3 text-white outline-none focus:border-orange-400">
                <option value="SITE">Mi experiencia con Magma Blaze</option><option value="PRODUCT">Un producto</option>
              </select>
            </label>}
            {activeKind === "PRODUCT" && !product && <label className="mt-4 block text-sm font-semibold text-white/80">Producto
              <select required value={productSlug} onChange={(event) => setProductSlug(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#16110f] px-4 py-3 text-white outline-none focus:border-orange-400">
                <option value="">Selecciona un producto</option>{products.map((item: any) => <option key={item.id} value={item.slug}>{item.name}</option>)}
              </select>
            </label>}
            <label className="mt-4 block text-sm font-semibold text-white/80">Tu nombre o apodo
              <input required minLength={2} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-orange-400" placeholder="¿Cómo te llamamos?" />
            </label>
            <label className="mt-4 block text-sm font-semibold text-white/80">Correo <span className="font-normal text-white/45">(opcional y privado)</span>
              <input type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-orange-400" placeholder="tu@correo.com" />
            </label>
            <div className="mt-5"><p className="mb-2 text-sm font-semibold text-white/80">Calificación</p><Stars rating={rating} interactive onChange={setRating} /></div>
            <label className="mt-5 block text-sm font-semibold text-white/80">Tu reseña
              <textarea required minLength={10} maxLength={1000} rows={4} value={comment} onChange={(event) => setComment(event.target.value)} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-orange-400" placeholder="Comparte tu experiencia..." />
            </label>
            <label aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">No llenar
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
            </label>
            {submit.isError && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">{(submit.error as Error)?.message || "No pudimos enviar tu reseña. Inténtalo de nuevo."}</p>}
            <button type="submit" disabled={submit.isPending || (activeKind === "PRODUCT" && !product && !products.length)} className="btn-ember mt-5 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50">{submit.isPending ? "Enviando tu reseña..." : "Enviar reseña"}</button>
          </motion.form>
        )}
      </AnimatePresence>
      </dialog>
    </section>
  );
}