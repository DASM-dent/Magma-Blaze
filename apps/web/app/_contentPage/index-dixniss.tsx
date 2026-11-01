'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  HelpCircle,
  Instagram,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import { contentApi, dropApi } from '@/services/api';
import { STORE_WHATSAPP_URL } from '@/lib/whatsapp';
import { DOMINICAN_PROVINCES, municipalitiesFor, normalizeLocation } from '@/lib/locations';
import ScrollReveal from '@/components/ui/ScrollReveal';

type ContentKind = 'envios' | 'faq' | 'contacto' | 'privacidad' | 'terminos' | 'nosotros';
type ShippingZone = {
  id: string;
  country: 'RD' | 'US';
  province?: string | null;
  city?: string | null;
  price: number;
  currency: 'DOP' | 'USD';
  requiresConfirmation: boolean;
};

const PAGE_CONFIG: Record<ContentKind, {
  area: string;
  title: string;
  description?: string;
  icon: typeof Truck;
}> = {
  envios: {
    area: 'SHIPPING_INFO',
    title: 'Envíos',
    description: 'Entrega coordinada para que recibas tus productos con información clara sobre cobertura, tiempo y tarifa.',
    icon: Truck,
  },
  faq: {
    area: 'FAQ',
    title: 'Preguntas frecuentes',
    description: 'Respuestas rápidas sobre disponibilidad, pedidos, pagos y entregas de nuestra tienda virtual.',
    icon: HelpCircle,
  },
  contacto: {
    area: 'CONTACT',
    title: 'Contacto',
    description: 'Escríbenos para consultar disponibilidad, elegir un modelo o recibir ayuda con tu pedido.',
    icon: MessageCircle,
  },
  privacidad: {
    area: 'PRIVACY',
    title: 'Privacidad',
    description: 'Conoce cómo usamos y protegemos la información necesaria para atenderte.',
    icon: ShieldCheck,
  },
  terminos: {
    area: 'TERMS',
    title: 'Términos y políticas',
    icon: FileText,
  },
  nosotros: {
    area: 'ABOUT',
    title: 'Nosotros',
    description: 'La historia, la visión y la intención detrás de cada selección de Magma Blaze.',
    icon: Sparkles,
  },
};

function PageIntro({ kind }: { kind: ContentKind }) {
  const config = PAGE_CONFIG[kind];
  const Icon = config.icon;
  return <header className="info-page-hero">
    <div className="info-page-hero-inner">
      <div className="info-page-icon"><Icon size={26} /></div>
      <div>
        <h1>{config.title}</h1>
        {config.description && <p>{config.description}</p>}
      </div>
    </div>
  </header>;
}

function FaqContent({ blocks, isLoading }: { blocks: any[]; isLoading: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return <main className="info-page-shell">
    <PageIntro kind="faq" />
    <section className="info-page-body">
      {isLoading ? <p className="info-page-loading">Cargando preguntas...</p> : !blocks.length ? (
        <EmptyContent />
      ) : (
        <div className="info-faq-list">
          {blocks.map((item: any) => {
            const isOpen = openId === item.id;
            return <article key={item.id} className={isOpen ? 'is-open' : ''}>
              <button type="button" onClick={() => setOpenId(isOpen ? null : item.id)} aria-expanded={isOpen}>
                <span>{item.title}</span>
                <ArrowRight size={18} />
              </button>
              <div className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="info-faq-answer">
                    {item.subtitle && <p className="info-block-subtitle">{item.subtitle}</p>}
                    <p className="whitespace-pre-line">{item.body || ''}</p>
                    {item.url && <Link href={item.url} className="info-inline-link">Ver más <ArrowRight size={15} /></Link>}
                  </div>
                </div>
              </div>
            </article>;
          })}
        </div>
      )}
    </section>
  </main>;
}

function ContactMethods() {
  return <section className="info-contact-grid">
    <a href={STORE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="info-contact-method is-whatsapp">
      <span className="info-contact-method-icon"><MessageCircle size={25} /></span>
      <span>
        <small>Respuesta directa</small>
        <strong>WhatsApp</strong>
        <em>+1 (849) 275-7807</em>
      </span>
      <ArrowRight size={20} />
    </a>
    <a href="https://instagram.com/magmablazelv" target="_blank" rel="noopener noreferrer" className="info-contact-method">
      <span className="info-contact-method-icon"><Instagram size={25} /></span>
      <span>
        <small>Escríbenos por Instagram</small>
        <strong>@magmablazelv</strong>
        <em>Te contactaremos lo antes posible.</em>
      </span>
      <ArrowRight size={20} />
    </a>
  </section>;
}

function ShippingZones({ zones, isLoading }: { zones: ShippingZone[]; isLoading: boolean }) {
  const [query, setQuery] = useState('');
  const [province, setProvince] = useState('');
  const [municipality, setMunicipality] = useState('');
  const municipalityOptions = useMemo(() => {
    if (!province) return [];
    const configured = zones
      .filter(zone => zone.country === 'RD' && normalizeLocation(zone.province) === normalizeLocation(province))
      .map(zone => zone.city)
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set([...municipalitiesFor(province), ...configured])).sort((a, b) => a.localeCompare(b, 'es'));
  }, [province, zones]);
  const filteredZones = useMemo(() => {
    const needle = normalizeLocation(query);
    return zones.filter(zone => {
      const matchesProvince = !province || normalizeLocation(zone.province) === normalizeLocation(province);
      const matchesMunicipality = !municipality || !zone.city || normalizeLocation(zone.city) === normalizeLocation(municipality);
      const haystack = normalizeLocation(`${zone.country} ${zone.province ?? ''} ${zone.city ?? ''}`);
      return matchesProvince && matchesMunicipality && (!needle || haystack.includes(needle));
    });
  }, [municipality, province, query, zones]);
  const hasFilters = Boolean(query || province || municipality);
  const clearFilters = () => {
    setQuery('');
    setProvince('');
    setMunicipality('');
  };
  if (isLoading) return <p className="info-page-loading">Cargando zonas de envío...</p>;
  return <section className="info-shipping-section">
    <div className="info-section-heading">
      <div>
        <h2>Cobertura y tarifas</h2>
        <p>Estas son las zonas activas configuradas actualmente en la tienda.</p>
      </div>
      <Truck size={24} />
    </div>
    <div className="shipping-zone-filters">
      <div className="shipping-zone-search">
        <Search size={18} />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar provincia o municipio..." />
      </div>
      <label>
        <span>Provincia</span>
        <select value={province} onChange={event => { setProvince(event.target.value); setMunicipality(''); }}>
          <option value="">Todas las provincias</option>
          {DOMINICAN_PROVINCES.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>
        <span>Municipio</span>
        <select value={municipality} disabled={!province} onChange={event => setMunicipality(event.target.value)}>
          <option value="">{province ? 'Todos los municipios' : 'Selecciona una provincia'}</option>
          {municipalityOptions.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      {hasFilters && <button type="button" onClick={clearFilters}><X size={16} /> Limpiar</button>}
    </div>
    {!zones.length ? (
      <div className="info-notice"><Clock3 size={21} /><p>La tarifa se confirma directamente por WhatsApp según el destino.</p></div>
    ) : !filteredZones.length ? (
      <div className="info-notice"><Search size={21} /><p>No hay información de envío configurada para esa provincia o municipio.</p></div>
    ) : (
      <div className="info-zone-grid">
        {filteredZones.map(zone => {
          const symbol = zone.currency === 'USD' ? 'US$' : 'RD$';
          const location = [zone.city, zone.province].filter(Boolean).join(', ') || (zone.country === 'US' ? 'Estados Unidos' : 'República Dominicana');
          return <article key={zone.id}>
            <span className="info-zone-icon"><MapPin size={19} /></span>
            <div>
              <h3>{location}</h3>
              <p>{zone.country === 'US' ? 'Ciudad y estado · Estados Unidos' : 'Municipio y provincia · República Dominicana'}</p>
            </div>
            <strong>{zone.requiresConfirmation ? 'Por confirmar' : `${symbol} ${Number(zone.price).toLocaleString('es-DO', { maximumFractionDigits:2 })}`}</strong>
          </article>;
        })}
      </div>
    )}
    <div className="info-shipping-highlights">
      <span><Clock3 size={18} /><b>2 a 4 horas</b><small>Tiempo máximo estimado según destino.</small></span>
      <span><CheckCircle2 size={18} /><b>Envío gratis en La Vega</b><small>También en pedidos mayores de RD$1,250 dentro de la ciudad.</small></span>
    </div>
  </section>;
}

function EmptyContent() {
  return <div className="info-empty">
    <Sparkles size={22} />
    <div><h2>Información en preparación</h2><p>Estamos organizando esta sección. Puedes contactarnos para recibir ayuda ahora mismo.</p></div>
    <a href={STORE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Contactar <ArrowRight size={16} /></a>
  </div>;
}

function EditorialBlocks({ blocks }: { blocks: any[] }) {
  if (!blocks.length) return null;
  return <div className="info-editorial-list">
    {blocks.map((block, index) => (
      <ScrollReveal
        key={block.id}
        delay={Math.min(index * .04, .16)}
        distance={24}
        amount={0.14}
        className={block.imageUrl ? 'has-image' : ''}
      >
        {block.imageUrl && <img src={block.imageUrl} alt={block.title} />}
        <div className="info-editorial-number">{String(index + 1).padStart(2, '0')}</div>
        <div className="info-editorial-copy">
          <h2>{block.title}</h2>
          {block.subtitle && <p className="info-block-subtitle">{block.subtitle}</p>}
          {block.body && <p className="whitespace-pre-line">{block.body}</p>}
          {block.url && <Link href={block.url} className="info-inline-link">Más información <ArrowRight size={15} /></Link>}
        </div>
      </ScrollReveal>
    ))}
  </div>;
}

export default function ContentPage({ kind }: { kind: ContentKind }) {
  const config = PAGE_CONFIG[kind] || PAGE_CONFIG.terminos;
  const { data: site } = useQuery({ queryKey:['site-state', `content-${kind}`], queryFn:()=>dropApi.siteState().then(r=>r.data) });
  const { data = [], isLoading } = useQuery({
    queryKey: ['content', config.area, kind],
    queryFn: () => contentApi.list(config.area).then(r => r.data),
  });
  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey:['public-shipping-zones'],
    queryFn:()=>contentApi.shippingZones().then(r=>r.data),
    enabled:kind === 'envios',
  });
  const blocks = data as any[];

  if (kind === 'faq') return <FaqContent blocks={blocks} isLoading={isLoading} />;

  if (kind === 'envios' && site?.publicSettings?.showShippingInfo === false) {
    return <main className="info-page-shell"><PageIntro kind="envios" /><section className="info-page-body"><EmptyContent /></section></main>;
  }

  return <main className="info-page-shell">
    <PageIntro kind={kind} />
    <section className="info-page-body">
      {kind === 'contacto' && <ContactMethods />}
      {kind === 'envios' && <ShippingZones zones={zones as ShippingZone[]} isLoading={zonesLoading} />}
      {isLoading ? <p className="info-page-loading">Cargando información...</p> : (
        <>
          <EditorialBlocks blocks={blocks} />
          {!blocks.length && kind !== 'contacto' && kind !== 'envios' && <EmptyContent />}
        </>
      )}
    </section>
  </main>;
}
