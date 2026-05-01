'use client';

import { useEffect } from 'react';
import { API_URL } from '@/lib/api';

export default function AdminTrapClient({ path }: { path: string }) {
  useEffect(() => {
    fetch(`${API_URL}/security/admin-trap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
      keepalive: true,
    }).catch(() => {});
  }, [path]);

  return null;
}