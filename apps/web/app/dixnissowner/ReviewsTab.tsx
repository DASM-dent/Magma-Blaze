'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, EyeOff, Star } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'ALL';
const statusLabels: Record<ReviewStatus, string> = { PENDING: 'Pendientes', PUBLISHED: 'Publicadas', REJECTED: 'Ocultas', ALL: 'Todas' };
const kindLabels: Record<string, string> = { SITE: 'Experiencia de marca', PRODUCT: 'Reseña de producto' };

export default function ReviewsTab() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReviewStatus>('PENDING');
  const { data, isLoading, error } = useQuery<any>({
    queryKey: ['admin-reviews', status],
    queryFn: () => api<any>('/reviews/admin?status=' + status),
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: Exclude<ReviewStatus, 'ALL'> }) => api('/reviews/admin/' + id, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) }),
    onSuccess: (_response, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-notifications-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-topbar-notifications'] });
      toast.success(variables.nextStatus === 'PUBLISHED' ? 'Reseña publicada en la tienda.' : variables.nextStatus === 'REJECTED' ? 'Reseña ocultada.' : 'Reseña devuelta a pendientes.');
    },
    onError: (reason: Error) => toast.error(reason.message || 'No pudimos actualizar la reseña.'),
  });
  const items = data?.items || [];
  const filters: ReviewStatus[] = ['PENDING', 'PUBLISHED', 'REJECTED', 'ALL'];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[.2em] text-orange-400">Opiniones de clientes</p>
        <h1 className="mt-2 text-3xl font-black text-white">Reseñas</h1>
        <p className="mt-2 text-sm text-white/50">{data?.pendingCount || 0} reseñas esperan tu revisión. Solo las publicadas aparecen en la tienda.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => <button key={filter} type="button" onClick={() => setStatus(filter)} className={'rounded-full border px-4 py-2 text-sm font-bold transition ' + (status === filter ? 'border-orange-400 bg-orange-500 text-black' : 'border-white/10 bg-white/[.04] text-white/65 hover:border-white/25')}>{statusLabels[filter]}{filter === 'PENDING' ? ' · ' + (data?.pendingCount || 0) : ''}</button>)}
      </div>

      {isLoading && <p className="rounded-2xl border border-white/10 bg-white/[.03] p-5 text-white/50">Cargando reseñas...</p>}
      {error && <p role="alert" className="rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-red-100">{(error as Error).message || 'No pudimos cargar las reseñas.'}</p>}
      {!isLoading && !error && !items.length && <div className="rounded-3xl border border-dashed border-white/15 bg-white/[.025] p-8 text-center"><Star className="mx-auto text-orange-400" /><p className="mt-3 font-bold text-white">No hay reseñas en esta lista.</p><p className="mt-1 text-sm text-white/45">Cuando un cliente envíe una opinión, llegará aquí para que la revises.</p></div>}

      <div className="space-y-4">
        {items.map((review: any) => (
          <article key={review.id} className="rounded-3xl border border-white/10 bg-white/[.035] p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-bold text-white">{review.name}</h2>
                  <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-200">{kindLabels[review.kind] || review.kind}</span>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/55">{statusLabels[review.status as ReviewStatus] || review.status}</span>
                </div>
                {review.email && <p className="mt-1 text-sm text-white/40">{review.email} · privado</p>}
                {(review.product?.name || review.productName) && <p className="mt-2 text-sm text-orange-100/70">Producto: {review.product?.name || review.productName}</p>}
                <div className="mt-3 flex items-center gap-1" aria-label={review.rating + ' estrellas'}>{[1, 2, 3, 4, 5].map((value: number) => <Star key={value} size={16} className={value <= review.rating ? 'fill-orange-400 text-orange-400' : 'text-white/20'} />)}</div>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-white/75">{review.comment}</p>
                <p className="mt-4 text-xs text-white/35">Recibida {new Date(review.createdAt).toLocaleString('es-DO')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {review.status !== 'PUBLISHED' && <button type="button" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: review.id, nextStatus: 'PUBLISHED' })} className="rounded-full bg-green-500/15 px-4 py-2 text-sm font-bold text-green-100 disabled:opacity-50"><Check size={15} className="mr-1 inline" />Publicar</button>}
                {review.status === 'PUBLISHED' && <button type="button" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: review.id, nextStatus: 'REJECTED' })} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/70 disabled:opacity-50"><EyeOff size={15} className="mr-1 inline" />Ocultar</button>}
                {review.status === 'REJECTED' && <button type="button" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: review.id, nextStatus: 'PENDING' })} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/70 disabled:opacity-50">Devolver a pendientes</button>}
                {review.status === 'PENDING' && <button type="button" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: review.id, nextStatus: 'REJECTED' })} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/70 disabled:opacity-50"><EyeOff size={15} className="mr-1 inline" />Ocultar</button>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}