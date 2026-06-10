import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import DropLockScreen from '@/components/drop/DropLockScreen';
import PublicSectionGuard from '@/components/layout/PublicSectionGuard';
import { dropApi } from '@/services/api';

export const metadata: Metadata = {
  title: 'Drops — Magma Blaze',
  description: 'Próximos lanzamientos limitados de Magma Blaze.',
};

async function getDrop() {
  try {
    const { data } = await dropApi.active();
    return data?.drop ?? null;
  } catch {
    return null;
  }
}

export default async function DropsPage() {
  const activeDrop = await getDrop();

  if (!activeDrop) {
    return (
      <PublicSectionGuard setting="showDrops">
        <main className="drop-empty-page">
        <div className="drop-empty-lines" aria-hidden="true" />
        <section className="drop-empty-content">
          <div className="drop-empty-mark"><Flame size={34} /></div>

          <div className="drop-empty-copy">
            <p>Ediciones limitadas</p>
            <h1>El próximo drop todavía está bajo llave.</h1>
            <span>
              Cuando la próxima edición tenga fecha, este espacio se transformará en el contador oficial del lanzamiento.
            </span>
          </div>

          <div className="drop-empty-actions">
            <Link href="/catalogo" className="btn-ember">
              Explorar catálogo <ArrowRight size={16} />
            </Link>
            <Link href="/" className="showcase-link">
              Volver al inicio <ArrowRight size={16} />
            </Link>
          </div>

          <div className="drop-empty-footer">
            <span>MAGMA BLAZE</span>
            <span>Una fecha. Un lanzamiento. Unidades limitadas.</span>
          </div>
        </section>
        </main>
      </PublicSectionGuard>
    );
  }

  return (
    <PublicSectionGuard setting="showDrops">
      <DropLockScreen drop={activeDrop} showBack />
    </PublicSectionGuard>
  );
}
