'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { LocaleProvider } from '@/context/LocaleContext';
import SiteGate from '@/components/drop/SiteGate';

function mutationMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'No pudimos guardar el cambio. Revisa los datos e intenta nuevamente.';
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    mutationCache: new MutationCache({
      onError(error, _variables, _context, mutation) {
        if (mutation.options.onError) return;
        toast.error(mutationMessage(error));
      },
    }),
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocaleProvider>
          <CartProvider>
            <FavoritesProvider>
              <SiteGate>{children}</SiteGate>
            </FavoritesProvider>
            <Toaster
              richColors
              position="top-right"
              toastOptions={{
                classNames: {
                  toast: 'mb-toast',
                  title: 'mb-toast-title',
                  description: 'mb-toast-description',
                  actionButton: 'mb-toast-action',
                  cancelButton: 'mb-toast-cancel',
                },
              }}
            />
          </CartProvider>
        </LocaleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
