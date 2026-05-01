import ProductoPageClient from './ProductoPageClient';

export const dynamicParams = false;

export async function generateStaticParams() {
  return [];
}

export default function ProductoPage() {
  return <ProductoPageClient />;
}