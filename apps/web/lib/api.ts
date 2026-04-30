const DEFAULT_API_PORT = '4000';
const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';

const messages = {
  es: {
    offline: 'No se pudo conectar con la API. Verifica que npm run dev tenga la API activa en el puerto 4000.',
    timeout: 'La API tardo demasiado en responder. Intenta nuevamente.',
    generic: 'No pudimos completar la solicitud. Intenta nuevamente.',
    invalid: 'La API respondio con un formato inesperado.',
  },
  en: {
    offline: 'Could not connect to the API. Make sure npm run dev has the API running on port 4000.',
    timeout: 'The API took too long to respond. Please try again.',
    generic: 'We could not complete the request. Please try again.',
    invalid: 'The API returned an unexpected response.',
  },
};

function currentLanguage() {
  if (typeof window === 'undefined') return 'es';
  return localStorage.getItem('mb_language') === 'en' ? 'en' : 'es';
}

function msg(key: keyof typeof messages.es) {
  return messages[currentLanguage()][key];
}

function getApiBaseUrl() {
  if (CONFIGURED_API_URL) return CONFIGURED_API_URL;
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '::1') {
      return `${protocol}//${hostname}:${DEFAULT_API_PORT}`;
    }
  }
  return `http://localhost:${DEFAULT_API_PORT}`;
}

export const API_URL = getApiBaseUrl();

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mb_token') || localStorage.getItem('magma_token');
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function canRetry(options: RequestInit) {
  const method = String(options.method || 'GET').toUpperCase();
  return method === 'GET' || method === 'HEAD';
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: options.signal || controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function parseResponse(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(msg('invalid'));
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const replayable = canRetry(options);
  const attempts = replayable ? 3 : 1;
  const url = `${getApiBaseUrl()}${path}`;
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url, { ...options, headers });
      const data = await parseResponse(res);
      if (!res.ok) {
        if (replayable && attempt < attempts && [429, 502, 503, 504].includes(res.status)) {
          await sleep(250 * attempt);
          continue;
        }
        throw new Error(data?.message || msg('generic'));
      }
      return data as T;
    } catch (error: any) {
      lastError = error;
      if (!replayable || attempt === attempts) break;
      await sleep(250 * attempt);
    }
  }

  if ((lastError as { name?: string } | undefined)?.name === 'AbortError') throw new Error(msg('timeout'));
  if (lastError instanceof Error && lastError.message && lastError.message !== 'Failed to fetch') throw lastError;
  throw new Error(msg('offline'));
}
