// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Hand-rolled SVG chart builders. Pure string/geometry functions — no DOM, no libs.

export interface Rect { x: number; y: number; w: number; h: number; index: number }

/**
 * Squarified treemap layout. Returns a rectangle per value (same order as input).
 * Values must be positive. Based on Bruls, Huizing & van Wijk (2000).
 */
export function squarify(values: number[], width: number, height: number): Rect[] {
  const total = values.reduce((a, b) => a + b, 0);
  const items = values.map((v, index) => ({ index, area: total > 0 ? (v / total) * width * height : 0 }));
  const rects: Rect[] = new Array(values.length);
  let x = 0, y = 0, w = width, h = height;
  let row: typeof items = [];
  const worst = (r: typeof items, side: number): number => {
    if (!r.length || side === 0) return Infinity;
    const areas = r.map((i) => i.area);
    const sum = areas.reduce((a, b) => a + b, 0);
    const max = Math.max(...areas);
    const min = Math.min(...areas);
    const s2 = sum * sum;
    return Math.max((side * side * max) / s2, s2 / (side * side * min));
  };
  const layoutRow = (r: typeof items) => {
    const sum = r.reduce((a, b) => a + b.area, 0);
    const vertical = w >= h; // fill along the shorter side
    if (vertical) {
      const rw = h > 0 ? sum / h : 0;
      let cy = y;
      for (const it of r) {
        const rh = rw > 0 ? it.area / rw : 0;
        rects[it.index] = { x, y: cy, w: rw, h: rh, index: it.index };
        cy += rh;
      }
      x += rw; w -= rw;
    } else {
      const rh = w > 0 ? sum / w : 0;
      let cx = x;
      for (const it of r) {
        const rwid = rh > 0 ? it.area / rh : 0;
        rects[it.index] = { x: cx, y, w: rwid, h: rh, index: it.index };
        cx += rwid;
      }
      y += rh; h -= rh;
    }
  };
  const queue = [...items];
  while (queue.length) {
    const side = Math.min(w, h);
    const next = queue[0];
    if (row.length === 0 || worst(row, side) >= worst([...row, next], side)) {
      row.push(next);
      queue.shift();
    } else {
      layoutRow(row);
      row = [];
    }
  }
  if (row.length) layoutRow(row);
  // guard against NaN/undefined
  return rects.map((r, i) => r || { x: 0, y: 0, w: 0, h: 0, index: i });
}

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Multi-series trend chart: an array of series {label,color,points:number[]} over shared x labels. */
export function trendSVG(
  xLabels: string[],
  series: { label: string; color: string; points: number[] }[],
  opts: { width?: number; height?: number; yFmt: (n: number) => string } ,
): string {
  const W = opts.width ?? 720;
  const H = opts.height ?? 340;
  const m = { top: 18, right: 18, bottom: 40, left: 62 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const allY = series.flatMap((s) => s.points);
  const maxY = Math.max(1, ...allY);
  const xOf = (i: number) => m.left + (xLabels.length === 1 ? iw / 2 : (i / (xLabels.length - 1)) * iw);
  const yOf = (v: number) => m.top + ih - (v / maxY) * ih;
  const gridN = 4;
  let g = '';
  for (let i = 0; i <= gridN; i++) {
    const v = (maxY / gridN) * i;
    const yy = yOf(v);
    g += `<line x1="${m.left}" y1="${yy.toFixed(1)}" x2="${m.left + iw}" y2="${yy.toFixed(1)}" class="grid"/>`;
    g += `<text x="${m.left - 8}" y="${(yy + 4).toFixed(1)}" text-anchor="end" class="axis">${esc(opts.yFmt(v))}</text>`;
  }
  let xa = '';
  xLabels.forEach((lb, i) => {
    xa += `<text x="${xOf(i).toFixed(1)}" y="${H - 14}" text-anchor="middle" class="axis">${esc(lb)}</text>`;
  });
  let paths = '';
  for (const s of series) {
    const d = s.points.map((v, i) => `${i ? 'L' : 'M'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
    paths += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    paths += s.points
      .map((v, i) => {
        const tip = `${esc(s.label)} — ${esc(xLabels[i])}: ${esc(opts.yFmt(v))}`;
        return `<circle cx="${xOf(i).toFixed(1)}" cy="${yOf(v).toFixed(1)}" r="3.5" fill="${s.color}" data-tip="${tip}" aria-label="${tip}"/>`;
      })
      .join('');
  }
  return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" preserveAspectRatio="xMidYMid meet">${g}${xa}${paths}</svg>`;
}

/** Compact sparkline for the drill-down panel. Optional per-point tooltip texts. */
export function sparklineSVG(points: number[], color: string, width = 240, height = 56, tips?: string[]): string {
  if (!points.length) return '';
  const max = Math.max(1, ...points);
  const min = Math.min(...points, 0);
  const xOf = (i: number) => (points.length === 1 ? width / 2 : (i / (points.length - 1)) * (width - 6) + 3);
  const yOf = (v: number) => height - 4 - ((v - min) / (max - min || 1)) * (height - 8);
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  const dots = points.map((v, i) => {
    const tip = tips?.[i] ? ` data-tip="${esc(tips[i])}" aria-label="${esc(tips[i])}"` : '';
    return `<circle cx="${xOf(i).toFixed(1)}" cy="${yOf(v).toFixed(1)}" r="2.4" fill="${color}"${tip}/>`;
  }).join('');
  return `<svg viewBox="0 0 ${width} ${height}" class="spark" preserveAspectRatio="none">${`<path d="${d}" fill="none" stroke="${color}" stroke-width="2"/>`}${dots}</svg>`;
}
