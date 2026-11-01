"use client";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { type PointerEvent } from "react";
import { productApi } from "@/services/api";

type TickerEntry = { id: string; title: string; detail: string; href: string; kind: "category" | "product"; imageUrl?: string };
const categories: TickerEntry[] = [
  { id: "sport", title: "Lentes deportivos", detail: "Bolsa + paño de limpieza", href: "/catalogo", kind: "category" },
  { id: "y2k", title: "Lentes Y2K", detail: "Bolsa para guardarlos", href: "/catalogo", kind: "category" },
  { id: "airpods", title: "AirPods", detail: "Cable de carga; estuche no incluido", href: "/catalogo", kind: "category" },
  { id: "caps", title: "Gorras picantes", detail: "El detalle que cambia el look", href: "/catalogo", kind: "category" },
  { id: "butterfly", title: "Collares de mariposa", detail: "Un toque propio", href: "/catalogo", kind: "category" },
  { id: "accessories", title: "Accesorios", detail: "Encuentra tu siguiente favorito", href: "/catalogo", kind: "category" },
];
function updateSpotlight(event: PointerEvent<HTMLElement>, visible: boolean) {
  const element = event.currentTarget;
  const bounds = element.getBoundingClientRect();
  element.style.setProperty("--cursor-x", (event.clientX - bounds.left) + "px");
  element.style.setProperty("--cursor-y", (event.clientY - bounds.top) + "px");
  element.style.setProperty("--cursor-opacity", visible ? "0.18" : "0");
}
export default function ExperienceTicker() {
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["products", "experience-ticker"],
    queryFn: () => productApi.list({ limit: 8 }).then((response: any) => Array.isArray(response.data?.items) ? response.data.items : []),
    staleTime: 60_000,
  });
  const entries = products.length
    ? [...categories, ...products.slice(0, 8).map((product: any) => ({
        id: "product-" + product.id, title: product.name, detail: "Pieza disponible",
        href: "/producto?slug=" + encodeURIComponent(product.slug), kind: "product" as const,
        imageUrl: product.mainImage || product.images?.[0]?.url || product.imageUrl || undefined,
      }))]
    : categories;
  const renderGroup = (hidden: boolean) => (
    <div className="experience-ticker-group" aria-hidden={hidden ? "true" : undefined}>
      {entries.map((entry) => (
        <Link key={entry.id} tabIndex={hidden ? -1 : undefined} href={entry.href} className="experience-ticker-item">
          <span className="experience-ticker-icon" aria-hidden="true">
            {entry.imageUrl
              ? <Image src={entry.imageUrl} alt="" width={52} height={52} sizes="52px" className="experience-ticker-image" />
              : entry.kind === "product" ? <ArrowUpRight size={16} /> : <Sparkles size={16} />}
          </span>
          <span className="experience-ticker-copy"><strong>{entry.title}</strong><small>{entry.detail}</small></span>
        </Link>
      ))}
    </div>
  );
  return (
    <section className="experience-strip" aria-label="Explora el universo de productos Magma Blaze" onPointerMove={(event) => updateSpotlight(event, true)} onPointerLeave={(event) => updateSpotlight(event, false)}>
      <div className="experience-strip-content">
        <div className="experience-strip-heading">
          <p>MUCHO MÁS QUE LENTES</p>
          <h2>Lo que llevas también cuenta tu historia.</h2>
          <span>Una pieza para cada plan, cada mood y cada versión de ti.</span>
        </div>
        <div className="experience-ticker-window">
          <div className="experience-ticker-track">{renderGroup(false)}{renderGroup(true)}</div>
        </div>
      </div>
    </section>
  );
}