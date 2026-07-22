// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Number and currency formatting helpers (AU locale).

/** Abbreviated money: 9_059_000_000 -> "$9.06bn", 766_000_000 -> "$766M", 12_300 -> "$12.3k". */
export function money(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—';
  const neg = n < 0 ? '-' : '';
  const v = Math.abs(n);
  if (v >= 1e9) return `${neg}$${(v / 1e9).toFixed(2)}bn`;
  if (v >= 1e6) return `${neg}$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${neg}$${(v / 1e3).toFixed(1)}k`;
  return `${neg}$${Math.round(v)}`;
}

/** Full money with thousands separators: 766000000 -> "$766,000,000". */
export function dollars(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—';
  return '$' + Math.round(n).toLocaleString('en-AU');
}

/** Plain integer with separators. */
export function num(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-AU');
}

/** Signed percentage: 12.4 -> "+12.4%", -3 -> "-3.0%". */
export function signedPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !isFinite(n)) return '—';
  const s = n > 0 ? '+' : '';
  return `${s}${n.toFixed(digits)}%`;
}

export function pct(n: number | null | undefined, digits = 1): string {
  if (n == null || !isFinite(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

/** "Canterbury-Bankstown\nGreater Hume" style member joins for display. */
export function joinMembers(members: string[]): string {
  return members.join(' · ');
}
