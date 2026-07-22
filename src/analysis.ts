// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Pure data helpers — all unit-tested. No DOM access here.
import type { Area, Sector, Metric } from './types';

/** Loss (net gaming machine profit) for the selected sector. */
export function sectorLoss(a: Area, sector: Sector): number {
  if (sector === 'clubs') return a.clubs;
  if (sector === 'hotels') return a.hotels;
  return a.combined;
}

/** Loss per adult for the selected sector, or null when population is unknown. */
export function sectorPerAdult(a: Area, sector: Sector): number | null {
  if (!a.adults) return null;
  return sectorLoss(a, sector) / a.adults;
}

/** The value an area contributes for a given metric+sector (null if not computable). */
export function metricValue(a: Area, sector: Sector, metric: Metric): number | null {
  if (metric === 'perAdult') return sectorPerAdult(a, sector);
  const v = sectorLoss(a, sector);
  return v > 0 ? v : null;
}

/** Does this area report any data for the selected sector? */
export function hasSector(a: Area, sector: Sector): boolean {
  if (sector === 'clubs') return a.hasClubs;
  if (sector === 'hotels') return a.hasHotels;
  return a.hasClubs || a.hasHotels;
}

export function median(nums: number[]): number {
  const s = nums.filter((n) => isFinite(n)).sort((a, b) => a - b);
  const n = s.length;
  if (!n) return 0;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

/** p in [0,1] quantile via linear interpolation. */
export function quantile(nums: number[], p: number): number {
  const s = nums.filter((n) => isFinite(n)).sort((a, b) => a - b);
  if (!s.length) return 0;
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

/** Filter by free-text search (matches area name or any member LGA) and sector presence. */
export function filterAreas(areas: Area[], search: string, sector: Sector): Area[] {
  const q = search.trim().toLowerCase();
  return areas.filter((a) => {
    if (!hasSector(a, sector)) return false;
    if (sectorLoss(a, sector) <= 0) return false;
    if (!q) return true;
    if (a.name.toLowerCase().includes(q)) return true;
    return a.members.some((m) => m.toLowerCase().includes(q));
  });
}

/** Rank areas by the chosen metric, descending, dropping areas with no value. */
export function rankAreas(areas: Area[], sector: Sector, metric: Metric): Area[] {
  return areas
    .map((a) => ({ a, v: metricValue(a, sector, metric) }))
    .filter((x) => x.v != null && (x.v as number) > 0)
    .sort((x, y) => (y.v as number) - (x.v as number))
    .map((x) => x.a);
}

// Sequential amber -> red ramp (money leaving the community). Six stops.
export const LOSS_RAMP = ['#fef3c7', '#fde68a', '#fbbf24', '#f59e0b', '#ea580c', '#b91c1c'];

/**
 * Map a value to a ramp colour using quantile breakpoints so colour reflects
 * rank position rather than being dominated by a few extreme outliers.
 */
export function makeColorScale(values: number[], ramp: string[] = LOSS_RAMP) {
  const clean = values.filter((v) => isFinite(v) && v > 0);
  const breaks = ramp.map((_, i) => quantile(clean, (i + 1) / ramp.length));
  return (v: number | null): string => {
    if (v == null || !isFinite(v)) return '#e5e7eb';
    for (let i = 0; i < breaks.length; i++) {
      if (v <= breaks[i]) return ramp[i];
    }
    return ramp[ramp.length - 1];
  };
}

/** Simple histogram binning: returns bin counts + edges over [min,max]. */
export function histogram(values: number[], bins: number): { count: number; x0: number; x1: number }[] {
  const clean = values.filter((v) => isFinite(v));
  if (!clean.length) return [];
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const width = (max - min) / bins || 1;
  const out = Array.from({ length: bins }, (_, i) => ({ count: 0, x0: min + i * width, x1: min + (i + 1) * width }));
  for (const v of clean) {
    let idx = Math.floor((v - min) / width);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    out[idx].count++;
  }
  return out;
}

export const SECTOR_LABEL: Record<Sector, string> = {
  combined: 'Clubs + Hotels',
  clubs: 'Clubs',
  hotels: 'Hotels',
};

export const METRIC_LABEL: Record<Metric, string> = {
  total: 'Total loss',
  perAdult: 'Loss per adult',
};
