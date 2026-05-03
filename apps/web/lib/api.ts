const DEFAULT_API_PORT = '4000';
const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
type ApiErrorData = {
  message?: string;
  errors?: Record<string, string[]>;
  [key: string]: unknown;
};

export class ApiError extends Error {
  status: number;
  data: ApiErrorData | null;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, data: ApiErrorData | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.errors = data?.errors;
  }
}

const messages = {
  es: {
    offline: 'No se pudo conectar con la API.',
    timeout: 'La API tardo demasiado en responder. Intenta nuevamente.',
    generic: 'No pudimos completar la solicitud. Intenta nuevamente.',
    invalid: 'La API respondio con un formato inesperado.',
  },
};

function msg(key: keyof typeof messages.es) {
  return messages.es[key];
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

function isLocalApi(baseUrl: string) {
  return /\/\/(localhost|127\.0\.0\.1|\[::1\]|::1)(:|\/|$)/.test(baseUrl);
}

function offlineMessage() {
  const baseUrl = getApiBaseUrl();
  if (isLocalApi(baseUrl)) {
    return `No se pudo conectar con la API local en ${baseUrl}. Confirma que npm run dev siga corriendo y que el backend no se haya cerrado.`;
  }
  return `No se pudo conectar con la API publicada en ${baseUrl}. Revisa que el servicio de Render este activo, que el deploy no tenga errores y que permita conexiones desde tu dominio.`;
}

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

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30_000) {
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
        throw new ApiError(data?.message || msg('generic'), res.status, data as ApiErrorData | null);
      }
      return data as T;
    } catch (error: any) {
      lastError = error;
      if (!replayable || attempt === attempts) break;
      await sleep(250 * attempt);
    }
  }

  if ((lastError as { name?: string } | undefined)?.name === 'AbortError') throw new ApiError(msg('timeout'), 408);
  if (lastError instanceof Error && lastError.message && lastError.message !== 'Failed to fetch') throw lastError;
  throw new ApiError(offlineMessage(), 0);
}
