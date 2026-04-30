'use client';
import { create } from 'zustand';
type CartItem = { id:string; name:string; price:number; imageUrl:string; quantity:number };
type CartStore = { items:CartItem[]; add:(p:any)=>void; remove:(id:string)=>void; clear:()=>void; total:()=>number };
export const useCart = create<CartStore>((set, get) => ({
  items: [],
  add: (p) => set(s => { const found = s.items.find(i=>i.id===p.id); return { items: found ? s.items.map(i=>i.id===p.id?{...i,quantity:i.quantity+1}:i) : [...s.items,{ id:p.id, name:p.name, price:p.price, imageUrl:p.imageUrl, quantity:1 }] }; }),
  remove: (id) => set(s => ({ items:s.items.filter(i=>i.id!==id) })),
  clear: () => set({ items:[] }),
  total: () => get().items.reduce((sum,i)=>sum+i.price*i.quantity,0)
}));
