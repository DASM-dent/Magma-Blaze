'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { productApi } from '@/services/api';

type CartProduct = { id: string; name: string; slug: string; price: number; image?: string };
type CartItem = { id: string; productId: string; product: CartProduct; quantity: number; unitPrice: number; variant?: { name: string } };

type CartContextValue = {
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  addItem: (productId: string, variantId?: string, quantity?: number) => Promise<void> | void;
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

  const addItem = async (productId: string, _variantId?: string, quantity = 1) => {
    const existing = items.find((i) => i.productId === productId);
    if (existing) {
      setItems((prev) => prev.map((i) => i.id === existing.id ? { ...i, quantity: i.quantity + quantity } : i));
      setIsOpen(true);
      return;
    }
    const { data } = await productApi.detail(productId).catch(async () => productApi.detail(productId));
    const product = data.product ?? data;
    const item: CartItem = {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      product: { id: product.id, name: product.name, slug: product.slug, price: product.price, image: product.mainImage || product.imageUrl },
      quantity,
      unitPrice: product.price,
    };
    setItems((prev) => [...prev, item]);
    setIsOpen(true);
  };

  const updateItem = (id: string, quantity: number) => {
    if (quantity <= 0) return removeItem(id);
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity } : i));
  };
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clearCart = () => setItems([]);

  const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const value = useMemo(() => ({ isOpen, openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false), items, subtotal, itemCount, addItem, updateItem, removeItem, clearCart }), [isOpen, items, subtotal, itemCount]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}
