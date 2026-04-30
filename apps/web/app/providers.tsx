'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { LocaleProvider } from '@/context/LocaleContext';
import SiteGate from '@/components/drop/SiteGate';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocaleProvider>
          <CartProvider>
            <FavoritesProvider>
              <SiteGate>{children}</SiteGate>
            </FavoritesProvider>
            <Toaster richColors position="top-right" />
          </CartProvider>
        </LocaleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
