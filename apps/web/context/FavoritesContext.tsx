'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export type FavoriteProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  priceUsd?: number;
  description?: string | null;
  imageUrl?: string | null;
  mainImage?: string | null;
};

type FavoriteSyncStatus = 'local' | 'syncing' | 'synced' | 'error';

type FavoritesContextValue = {
  favorites: FavoriteProduct[];
  syncStatus: FavoriteSyncStatus;
  lastSyncedAt: string | null;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (product: FavoriteProduct) => void;
  removeFavorite: (id: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);
const STORAGE_KEY = 'mb_favorites';
const IDS_STORAGE_KEY = 'mb_favorite_ids';
const isInlineImage = (value?: string | null) => Boolean(value?.startsWith('data:'));
const safeImage = (value?: string | null) => isInlineImage(value) ? null : value || null;

const normalizeFavorite = (item: any): FavoriteProduct | null => {
  const product = item?.product || item;
  if (!product?.id) return null;
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price || 0),
    priceUsd: Number(product.priceUsd || 0),
    description: product.description || null,
    imageUrl: product.imageUrl || product.mainImage || null,
    mainImage: product.mainImage || product.imageUrl || null,
  };
};

const compactFavorite = (product: FavoriteProduct): FavoriteProduct => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  price: Number(product.price || 0),
  priceUsd: Number(product.priceUsd || 0),
  description: product.description || null,
  imageUrl: safeImage(product.imageUrl || product.mainImage),
  mainImage: safeImage(product.mainImage || product.imageUrl),
});

function uniqueFavorites(items: FavoriteProduct[]) {
  return items.filter((item, index, all) => all.findIndex(other => other.id === item.id) === index);
}

function readStoredFavorites() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return uniqueFavorites(parsed.map(normalizeFavorite).filter(Boolean) as FavoriteProduct[]);
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  try {
    const ids = JSON.parse(localStorage.getItem(IDS_STORAGE_KEY) || '[]');
    if (Array.isArray(ids)) return ids.filter(Boolean).map((id: string) => ({ id, name: 'Producto guardado', slug: id, price: 0, imageUrl: null, mainImage: null }));
  } catch {
    localStorage.removeItem(IDS_STORAGE_KEY);
  }
  return [];
}

function persistFavorites(items: FavoriteProduct[]) {
  const compact = uniqueFavorites(items).map(compactFavorite);
  const ids = compact.map(item => item.id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
    localStorage.setItem(IDS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    try {
      localStorage.setItem(IDS_STORAGE_KEY, JSON.stringify(ids));
    } catch {
      localStorage.removeItem(IDS_STORAGE_KEY);
    }
  }
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<FavoriteSyncStatus>('local');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    setFavorites(readStoredFavorites());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistFavorites(favorites);
  }, [favorites, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      setSyncStatus('local');
      return;
    }
    let cancelled = false;
    async function syncFavorites() {
      setSyncStatus('syncing');
      try {
        const serverItems = await api<any[]>('/account/favorites');
        const serverFavorites = serverItems.map(normalizeFavorite).filter(Boolean) as FavoriteProduct[];
        const localFavorites = readStoredFavorites();
        const missingLocal = localFavorites.filter(local => !serverFavorites.some(server => server.id === local.id));
        await Promise.all(missingLocal.map(item => api('/account/favorites', { method: 'POST', body: JSON.stringify({ productId: item.id }) }).catch(() => null)));
        if (!cancelled) {
          setFavorites(uniqueFavorites([...missingLocal, ...serverFavorites]));
          setSyncStatus('synced');
          setLastSyncedAt(new Date().toISOString());
        }
      } catch {
        if (!cancelled) setSyncStatus('error');
      }
    }
    syncFavorites();
    return () => { cancelled = true; };
  }, [user, hydrated]);

  const isFavorite = useCallback((id: string) => favorites.some((product) => product.id === id), [favorites]);

  const toggleFavorite = useCallback((product: FavoriteProduct) => {
    if (!user) {
      toast('Inicia sesion para guardar favoritos', {
        description: 'Tus favoritos quedaran guardados en tu cuenta y podras verlos desde tu perfil.',
        action: {
          label: 'Entrar',
          onClick: () => {
            window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          },
        },
      });
      return;
    }
    const exists = favorites.some((item) => item.id === product.id);
    setFavorites((current) => {
      if (current.some((item) => item.id === product.id)) return current.filter((item) => item.id !== product.id);
      const nextFavorite = normalizeFavorite(product);
      return nextFavorite ? [nextFavorite, ...current] : current;
    });
    setSyncStatus('syncing');
    const path = exists ? `/account/favorites/${product.id}` : '/account/favorites';
    const options = exists ? { method: 'DELETE' } : { method: 'POST', body: JSON.stringify({ productId: product.id }) };
    api(path, options)
      .then(() => {
        setSyncStatus('synced');
        setLastSyncedAt(new Date().toISOString());
        if (exists) {
          toast('Producto quitado de favoritos', { description: product.name });
        } else {
          toast.success('Producto agregado a favoritos', {
            description: product.name,
            action: {
              label: 'Cuenta',
              onClick: () => {
                window.location.href = '/cuenta';
              },
            },
          });
        }
      })
      .catch(() => {
        setSyncStatus('error');
        toast.error('No se pudo sincronizar favoritos', {
          description: 'El cambio quedo local por ahora. Intenta de nuevo si no aparece en tu cuenta.',
        });
      });
  }, [favorites, user]);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((current) => current.filter((item) => item.id !== id));
    if (user) {
      setSyncStatus('syncing');
      api(`/account/favorites/${id}`, { method: 'DELETE' })
        .then(() => { setSyncStatus('synced'); setLastSyncedAt(new Date().toISOString()); })
        .catch(() => setSyncStatus('error'));
    }
  }, [user]);

  const value = useMemo(() => ({ favorites, syncStatus, lastSyncedAt, isFavorite, toggleFavorite, removeFavorite }), [favorites, syncStatus, lastSyncedAt, isFavorite, toggleFavorite, removeFavorite]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites debe usarse dentro de FavoritesProvider');
  return context;
}
