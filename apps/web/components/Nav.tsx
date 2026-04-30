'use client';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/store';
import { useStoreLocale } from '@/context/LocaleContext';
export function Nav() {
  const { t } = useStoreLocale();
  const count = useCart(s=>s.items.reduce((n,i)=>n+i.quantity,0));
  return <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-xl">
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
      <Link href="/" className="text-xl font-black tracking-tight">MAGMA <span className="text-magma">BLAZE</span></Link>
      <div className="flex items-center gap-4 text-sm text-white/80">
        <Link href="/shop">{t('footer.shop')}</Link><Link href="/drops">Drops</Link><Link href="/login">Login</Link>
        <Link href="/cart" className="relative rounded-full bg-white/10 p-3"><ShoppingBag size={18}/>{count>0 && <span className="absolute -right-2 -top-2 rounded-full bg-magma px-2 text-xs font-bold text-white">{count}</span>}</Link>
      </div>
    </nav>
  </header>
}
