import { Suspense } from 'react';
import ProductoPageClient from './ProductoPageClient';

export default function ProductoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen px-6 pt-32 text-white/50">Cargando producto...</div>}>
      <ProductoPageClient />
    </Suspense>
  );
}