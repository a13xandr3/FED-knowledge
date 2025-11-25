/**
 * Common utility helpers shared across the app.
 * Centraliza funções auxiliares para reduzir repetição.
 */

export const isBlank = (v: unknown): boolean =>
  v === null || v === undefined || (typeof v === 'string' && v.trim().length === 0);

export const normalizeText = (s: string | null | undefined): string =>
  (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export const trackById = <T extends { id?: number | string }>(_idx: number, item: T) => item?.id ?? _idx;

export const toISODate = (d: Date | string | number): string => {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString();
};

export function assertNever(x: never): never {
  throw new Error('Unexpected object: ' + x);
}

export function parseNumberSafe(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function handleHttpError(error: any): never {
  // Centraliza tratamento de erro HTTP
  const message = error?.error?.message ?? error?.message ?? 'Erro inesperado';
  throw new Error(message);
}
