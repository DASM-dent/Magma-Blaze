'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { productApi } from '@/services/api';

export type CartProduct = { id: string; name: string; slug: string; price: number; image?: string };
export type CartItem = { id: string; productId: string; product: CartProduct; quantity: number; unitPrice: number; variant?: { id?: string; name: string } };
export type CartSnapshotItem = Omit<CartItem, 'id'> & { id?: string };

type CartContextValue = {
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  addItem: (productId: string, variantId?: string, quantity?: number) => Promise<void> | void;
  addSnapshotItems: (items: CartSnapshotItem[]) => void;
  updateItem: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const CART_STORAGE_KEY = 'mb_cart';
const isInlineImage = (value?: string | null) => Boolean(value?.startsWith('data:'));
const safeImage = (value?: string | null) => isInlineImage(value) ? undefined : value || undefined;
const compactCartItem = (item: CartItem): CartItem => ({
  ...item,
  product: { ...item.product, image: safeImage(item.product.image) },
});

const normalizeSnapshotItem = (item: CartSnapshotItem, index: number): CartItem | null => {
  const productId = String(item.productId || item.product?.id || '').trim();
  const name = String(item.product?.name || '').trim();
  if (!productId || !name) return null;

  const quantity = Math.max(1, Math.min(99, Number(item.quantity || 1)));
  const unitPrice = Math.max(0, Number(item.unitPrice || item.product?.price || 0));
  const slug = String(item.product?.slug || productId).trim();
  const variantName = item.variant?.name ? String(item.variant.name).trim() : '';

  return {
    id: item.id || `${productId}-${Date.now()}-${index}`,
    productId,
    product: {
      id: item.product?.id || productId,
      name,
      slug,
      price: unitPrice,
      image: safeImage(item.product?.image),
    },
    quantity,
    unitPrice,
    variant: variantName ? { id: (item.variant as any)?.id, name: variantName } : undefined,
  };
};

function readStoredCart() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.map(compactCartItem) : [];
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY);
    return [];
  }
}

function persistCart(items: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items.map(compactCartItem)));
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY);
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistCart(items);
  }, [items, hydrated]);

  const addItem = async (productId: string, variantId?: string, quantity = 1) => {
    const existing = items.find((i) => i.productId === productId && (i.variant?.id || '') === (variantId || ''));
    if (existing) {
      setItems((prev) => prev.map((i) => i.id === existing.id ? { ...i, quantity: i.quantity + quantity } : i));
      setIsOpen(true);
      return;
    }
    const { data } = await productApi.detail(productId).catch(async () => productApi.detail(productId));
    const product = data.product ?? data;
    const variant = variantId ? product.variants?.find((item:any)=>item.id===variantId) : null;
    const unitPrice = variant?.price || product.price;
    const item: CartItem = {
      id: `${product.id}-${variant?.id || 'base'}-${Date.now()}`,
      productId: product.id,
      product: { id: product.id, name: product.name, slug: product.slug, price: unitPrice, image: variant?.imageUrl || product.mainImage || product.imageUrl },
      quantity,
      unitPrice,
      variant: variant ? { id: variant.id, name: variant.name } : undefined,
    };
    setItems((prev) => [...prev, item]);
    setIsOpen(true);
  };

  const updateItem = (id: string, quantity: number) => {
    if (quantity <= 0) return removeItem(id);
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity } : i));
  };
  const addSnapshotItems = (snapshotItems: CartSnapshotItem[]) => {
    const normalized = snapshotItems
      .map((item, index) => normalizeSnapshotItem(item, index))
      .filter((item): item is CartItem => Boolean(item));

    if (!normalized.length) return;

    setItems((prev) => {
      const next = [...prev];
      normalized.forEach((item) => {
        const existingIndex = next.findIndex(
          (candidate) => candidate.productId === item.productId && (candidate.variant?.name || '') === (item.variant?.name || ''),
        );

        if (existingIndex >= 0) {
          const existing = next[existingIndex];
          next[existingIndex] = { ...existing, quantity: Math.min(99, existing.quantity + item.quantity) };
          return;
        }

        next.push({ ...item, id: `${item.productId}-${Date.now()}-${next.length}` });
      });
      return next;
    });
    setIsOpen(true);
  };
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clearCart = () => setItems([]);

  const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const value = useMemo(() => ({ isOpen, openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false), items, subtotal, itemCount, addItem, addSnapshotItems, updateItem, removeItem, clearCart }), [isOpen, items, subtotal, itemCount]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}
