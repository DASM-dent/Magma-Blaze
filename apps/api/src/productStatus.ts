import { prisma } from './prisma.js';

export const NEW_PRODUCT_DAYS = 7;
export const NEW_PRODUCT_WINDOW_MS = NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000;
const SWEEP_COOLDOWN_MS = 15 * 1000;

let nextSweepAt = 0;
let currentSweep: Promise<{ count: number }> | null = null;

function createdAtTimestamp(createdAt: unknown) {
  const timestamp = createdAt instanceof Date
    ? createdAt.getTime()
    : new Date(String(createdAt ?? '')).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function isNewProductWindowOpen(createdAt: unknown, now = Date.now()) {
  const created = createdAtTimestamp(createdAt);
  if (created === null) return false;

  const age = now - created;
  return age >= 0 && age < NEW_PRODUCT_WINDOW_MS;
}

export function getEffectiveProductStatus(status: string, createdAt: unknown, now = Date.now()) {
  const created = createdAtTimestamp(createdAt);
  if (status === 'NEW' && created !== null && now - created >= NEW_PRODUCT_WINDOW_MS) {
    return 'ACTIVE';
  }
  return status;
}

export function activateExpiredNewProducts(now = Date.now()) {
  if (currentSweep) return currentSweep;
  if (now < nextSweepAt) return Promise.resolve({ count: 0 });

  nextSweepAt = now + SWEEP_COOLDOWN_MS;
  const sweep = prisma.product.updateMany({
    where: {
      status: 'NEW',
      createdAt: { lte: new Date(now - NEW_PRODUCT_WINDOW_MS) },
    },
    data: { status: 'ACTIVE' },
  }).catch((error) => {
    nextSweepAt = Date.now() + SWEEP_COOLDOWN_MS;
    throw error;
  }).finally(() => {
    currentSweep = null;
  });

  currentSweep = sweep;
  return sweep;
}