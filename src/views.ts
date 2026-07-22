// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// View renderers. Each mounts into a root element and wires interactions.
import type { Area, PokiesData, Sector, Metric } from './types';
import {
  filterAreas, rankAreas, metricValue, sectorLoss, sectorPerAdult,
  median, makeColorScale, histogram, quantile, SECTOR_LABEL, LOSS_RAMP,
} from './analysis';
import { money, dollars, num, signedPct } from './format';
import { gloss } from './ui';
import { trendSVG, squarify, esc } from './charts';

export interface ViewCtx {
  data: PokiesData;
  sector: Sector;
  metric: Metric;
  search: string;
  select: (slug: string) => void;
}

function sectorBadge(a: Area): string {
  if (a.hasClubs && a.hasHotels) return '';
  const label = a.hasClubs ? 'Clubs only' : 'Hotels only';
  return `<span class="badge badge-partial" data-tip="Reported by Liquor & Gaming NSW as a single-sector group" aria-label="Reported by Liquor & Gaming NSW as a single-sector group">${label}</span>`;
}

function yoyPill(a: Area): string {
  if (a.yoyPct == null) return '';
  const cls = a.yoyPct > 0 ? 'up' : a.yoyPct < 0 ? 'down' : 'flat';
  const arrow = a.yoyPct > 0 ? '▲' : a.yoyPct < 0 ? '▼' : '■';
  return `<span class="yoy yoy-${cls}" data-tip="Change vs previous year: ${signedPct(a.yoyPct)}" aria-label="Change vs previous year: ${signedPct(a.yoyPct)}">${arrow} ${signedPct(a.yoyPct)}</span>`;
}

// ---- Leaderboard ----------------------------------------------------------
export function renderLeaderboard(root: HTMLElement, ctx: ViewCtx): void {
  const { sector, metric, search } = ctx;
  const filtered = filterAreas(ctx.data.areas, search, sector);
  const ranked = rankAreas(filtered, sector, metric);
  const values = ranked.map((a) => metricValue(a, sector, metric) as number);
  const max = Math.max(1, ...values);
  const med = median(values);
  const secondaryLabel = metric === 'perAdult' ? 'total' : 'per adult';

  const rows = ranked.map((a, i) => {
    const v = metricValue(a, sector, metric) as number;
    const w = Math.max(1.5, (v / max) * 100);
    const aboveMed = v >= med;
    const secondary = metric === 'perAdult' ? money(sectorLoss(a, sector)) : (sectorPerAdult(a, sector) == null ? '—' : dollars(sectorPerAdult(a, sector)) + '/adult');
    const barTip = `${a.name}: ${metric === 'perAdult' ? dollars(v) + '/adult' : money(v)} · ${secondary}`;
    return `
      <button class="lb-row" data-slug="${a.slug}" aria-label="${esc(a.name)} details">
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-main">
          <span class="lb-name">${esc(a.name)} ${sectorBadge(a)}</span>
          <span class="lb-bar-wrap" data-tip="${esc(barTip)}"><span class="lb-bar ${aboveMed ? 'hot' : 'cool'}" style="width:${w.toFixed(1)}%"></span></span>
        </span>
        <span class="lb-val">
          <span class="lb-primary">${metric === 'perAdult' ? dollars(v) : money(v)}</span>
          <span class="lb-secondary">${esc(secondary)}</span>
        </span>
        <span class="lb-yoy">${yoyPill(a)}</span>
      </button>`;
  }).join('');

  root.innerHTML = `
    <div class="view-head">
      <div>
        <h2>Leaderboard — ${metric === 'perAdult' ? gloss('loss-per-adult', 'loss per adult') : 'total losses'}</h2>
        <p class="view-sub">${SECTOR_LABEL[sector]} · ${ranked.length} council areas · median ${metric === 'perAdult' ? dollars(med) + ' per adult' : money(med)}. Tap any area to drill in.</p>
      </div>
    </div>
    <div class="lb-legend"><span>Longer, redder bars = higher ${metric === 'perAdult' ? 'loss per adult' : 'total loss'}. Grey means below the state median. Secondary figure is ${secondaryLabel}.</span></div>
    <div class="lb-list">${rows || '<p class="empty">No council areas match your search.</p>'}</div>`;

  root.querySelectorAll<HTMLElement>('.lb-row').forEach((el) =>
    el.addEventListener('click', () => ctx.select(el.dataset.slug!)));
}

// ---- Trend ----------------------------------------------------------------
export function renderTrend(root: HTMLElement, ctx: ViewCtx): void {
  const periods = ctx.data.periods;
  const labels = periods.map((p) => p.label);
  const series = [
    { label: 'Clubs + Hotels', color: '#0f766e', points: periods.map((p) => p.combined) },
    { label: 'Clubs', color: '#b45309', points: periods.map((p) => p.clubs) },
    { label: 'Hotels', color: '#7c3aed', points: periods.map((p) => p.hotels) },
  ];
  const chart = trendSVG(labels, series, { yFmt: (n) => money(n), width: 780, height: 360 });

  const lowest = periods.reduce((m, p) => (p.combined < m.combined ? p : m), periods[0]);
  const highest = periods.reduce((m, p) => (p.combined > m.combined ? p : m), periods[0]);
  const first = periods[0], last = periods[periods.length - 1];
  const changePct = ((last.combined - first.combined) / first.combined) * 100;

  // Stacked bars clubs/hotels per year
  const maxBar = Math.max(...periods.map((p) => p.combined));
  const bars = periods.map((p) => {
    const ch = (p.clubs / maxBar) * 100;
    const ho = (p.hotels / maxBar) * 100;
    return `<div class="tb-col"><div class="tb-stack" data-tip="${esc(p.label)}: ${money(p.combined)}" aria-label="${esc(p.label)}: ${money(p.combined)}">
        <div class="tb-seg tb-hotels" style="height:${ho.toFixed(1)}%" data-tip="${esc(p.label)} hotels: ${money(p.hotels)}" aria-label="${esc(p.label)} hotels: ${money(p.hotels)}"></div>
        <div class="tb-seg tb-clubs" style="height:${ch.toFixed(1)}%" data-tip="${esc(p.label)} clubs: ${money(p.clubs)}" aria-label="${esc(p.label)} clubs: ${money(p.clubs)}"></div>
      </div><div class="tb-lab">${esc(p.label)}</div><div class="tb-tot">${money(p.combined)}</div></div>`;
  }).join('');

  root.innerHTML = `
    <div class="view-head"><div>
      <h2>Six-year trend — statewide ${gloss('loss', 'player losses')}</h2>
      <p class="view-sub">Total NSW pokies losses by reporting year. Losses collapsed during COVID venue closures, then rebounded to record highs.</p>
    </div></div>
    <div class="legend-row">
      <span class="lg-item"><span class="lg-swatch" style="background:#0f766e"></span>Clubs + Hotels</span>
      <span class="lg-item"><span class="lg-swatch" style="background:#b45309"></span>Clubs</span>
      <span class="lg-item"><span class="lg-swatch" style="background:#7c3aed"></span>Hotels</span>
    </div>
    <div class="chart-card">${chart}</div>
    <div class="trend-cards">
      <div class="tc"><div class="tc-k">${esc(highest.label)}</div><div class="tc-v">${money(highest.combined)}</div><div class="tc-l">record year</div></div>
      <div class="tc"><div class="tc-k">${esc(lowest.label)}</div><div class="tc-v">${money(lowest.combined)}</div><div class="tc-l">COVID low</div></div>
      <div class="tc"><div class="tc-k">${signedPct(changePct)}</div><div class="tc-v">${money(last.combined)}</div><div class="tc-l">now, vs ${esc(first.label)}</div></div>
      <div class="tc"><div class="tc-k">${num(last.egms)}</div><div class="tc-v">machines</div><div class="tc-l">operating in ${esc(last.label)}</div></div>
    </div>
    <h3 class="sub-h">Clubs vs hotels each year</h3>
    <p class="view-sub">Clubs (darker) hold most of the machines; hotels (lighter) pay a higher tax rate.</p>
    <div class="tbars">${bars}</div>
    <div class="legend-row"><span class="lg-item"><span class="lg-swatch" style="background:#0f766e"></span>Clubs</span><span class="lg-item"><span class="lg-swatch" style="background:#5eead4"></span>Hotels</span></div>`;
}

// ---- Table ----------------------------------------------------------------
type SortKey = 'rank' | 'name' | 'combined' | 'clubs' | 'hotels' | 'lossPerAdult' | 'egm' | 'lossPerEgm' | 'yoyPct';
let tableSort: { key: SortKey; dir: 1 | -1 } = { key: 'combined', dir: -1 };

export function renderTable(root: HTMLElement, ctx: ViewCtx): void {
  const filtered = filterAreas(ctx.data.areas, ctx.search, ctx.sector);
  const { key, dir } = tableSort;
  const sorted = [...filtered].sort((a, b) => {
    if (key === 'name') return a.name.localeCompare(b.name) * dir;
    const av = (a[key] as number) ?? -Infinity;
    const bv = (b[key] as number) ?? -Infinity;
    return (av - bv) * dir;
  });

  const cols: { key: SortKey; label: string; help?: string }[] = [
    { key: 'rank', label: '#' },
    { key: 'name', label: 'Council area' },
    { key: 'combined', label: 'Total loss' },
    { key: 'clubs', label: 'Clubs' },
    { key: 'hotels', label: 'Hotels' },
    { key: 'lossPerAdult', label: 'Per adult' },
    { key: 'egm', label: 'Machines' },
    { key: 'lossPerEgm', label: 'Per machine' },
    { key: 'yoyPct', label: 'YoY' },
  ];
  const head = cols.map((c) => {
    const active = tableSort.key === c.key ? (tableSort.dir === -1 ? ' sort-desc' : ' sort-asc') : '';
    const align = c.key === 'name' ? 'l' : 'r';
    return `<th class="col-${align}${active}" data-key="${c.key}"><span>${c.label}</span></th>`;
  }).join('');

  const body = sorted.map((a) => `
    <tr data-slug="${a.slug}">
      <td class="col-r muted">${a.rank}</td>
      <td class="col-l"><span class="td-name">${esc(a.name)}</span> ${sectorBadge(a)}</td>
      <td class="col-r num strong">${money(a.combined)}</td>
      <td class="col-r num">${a.hasClubs ? money(a.clubs) : '—'}</td>
      <td class="col-r num">${a.hasHotels ? money(a.hotels) : '—'}</td>
      <td class="col-r num">${a.lossPerAdult == null ? '—' : dollars(a.lossPerAdult)}</td>
      <td class="col-r num">${num(a.egm)}</td>
      <td class="col-r num">${a.lossPerEgm == null ? '—' : dollars(a.lossPerEgm)}</td>
      <td class="col-r num">${yoyPill(a)}</td>
    </tr>`).join('');

  root.innerHTML = `
    <div class="view-head"><div>
      <h2>Full data table</h2>
      <p class="view-sub">Every reporting area in ${ctx.data.summary.latestPeriod}. Click a column to sort, a row to drill in. ${gloss('net-profit', 'What is “loss”?')} ${gloss('per-machine', 'Per machine?')}</p>
    </div></div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>${head}</tr></thead>
        <tbody>${body || '<tr><td colspan="9" class="empty">No areas match your search.</td></tr>'}</tbody>
      </table>
    </div>`;

  root.querySelectorAll<HTMLElement>('th[data-key]').forEach((th) =>
    th.addEventListener('click', () => {
      const k = th.dataset.key as SortKey;
      if (tableSort.key === k) tableSort.dir = (tableSort.dir === -1 ? 1 : -1) as 1 | -1;
      else tableSort = { key: k, dir: k === 'name' ? 1 : -1 };
      renderTable(root, ctx);
    }));
  root.querySelectorAll<HTMLElement>('tr[data-slug]').forEach((tr) =>
    tr.addEventListener('click', () => ctx.select(tr.dataset.slug!)));
}

// ---- Treemap --------------------------------------------------------------
export function renderTreemap(root: HTMLElement, ctx: ViewCtx): void {
  const { sector } = ctx;
  const filtered = filterAreas(ctx.data.areas, ctx.search, sector)
    .filter((a) => sectorLoss(a, sector) > 0)
    .sort((a, b) => sectorLoss(b, sector) - sectorLoss(a, sector))
    .slice(0, 60);
  const W = 1000, H = 560;
  const rects = squarify(filtered.map((a) => sectorLoss(a, sector)), W, H);
  const paValues = filtered.map((a) => sectorPerAdult(a, sector)).filter((v): v is number => v != null);
  const scale = makeColorScale(paValues);

  const cells = rects.map((r, i) => {
    const a = filtered[i];
    const pa = sectorPerAdult(a, sector);
    const fill = scale(pa);
    const showLabel = r.w > 68 && r.h > 30;
    const dark = ['#ea580c', '#b91c1c'].includes(fill);
    const label = showLabel
      ? `<text x="${(r.x + 6).toFixed(1)}" y="${(r.y + 16).toFixed(1)}" class="tm-name ${dark ? 'on-dark' : ''}">${esc(a.name.length > 22 ? a.name.slice(0, 20) + '…' : a.name)}</text>
         <text x="${(r.x + 6).toFixed(1)}" y="${(r.y + 31).toFixed(1)}" class="tm-val ${dark ? 'on-dark' : ''}">${esc(money(sectorLoss(a, sector)))}</text>`
      : '';
    const tip = `${esc(a.name)}: ${money(sectorLoss(a, sector))}${pa != null ? ' · ' + dollars(pa) + '/adult' : ''}`;
    return `<g class="tm-cell" data-slug="${a.slug}" data-tip="${tip}" aria-label="${tip}"><rect x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" width="${Math.max(0, r.w - 1).toFixed(1)}" height="${Math.max(0, r.h - 1).toFixed(1)}" fill="${fill}" rx="2"/>${label}</g>`;
  }).join('');

  root.innerHTML = `
    <div class="view-head"><div>
      <h2>Where the money goes — treemap</h2>
      <p class="view-sub">${SECTOR_LABEL[sector]}. Each rectangle is a council area, sized by total losses and shaded by ${gloss('loss-per-adult', 'loss per adult')} (paler = lower, red = higher). Top 60 areas shown.</p>
    </div></div>
    <div class="legend-row"><span class="lg-item">Loss per adult:</span>${LOSS_RAMP.map((c, i) => `<span class="lg-item"><span class="lg-swatch" style="background:${c}"></span>${i === 0 ? 'low' : i === LOSS_RAMP.length - 1 ? 'high' : ''}</span>`).join('')}</div>
    <div class="treemap-card"><svg viewBox="0 0 ${W} ${H}" class="treemap-svg" preserveAspectRatio="xMidYMid meet">${cells}</svg></div>`;

  root.querySelectorAll<SVGGElement>('.tm-cell').forEach((g) =>
    g.addEventListener('click', () => ctx.select((g as any).dataset.slug)));
}

// ---- Distribution ---------------------------------------------------------
export function renderDistribution(root: HTMLElement, ctx: ViewCtx): void {
  const { sector } = ctx;
  const areas = filterAreas(ctx.data.areas, ctx.search, sector).filter((a) => sectorPerAdult(a, sector) != null);
  const values = areas.map((a) => sectorPerAdult(a, sector) as number);
  const bins = histogram(values, 14);
  const maxCount = Math.max(1, ...bins.map((b) => b.count));
  const med = median(values);
  const p90 = quantile(values, 0.9);
  const W = 820, H = 380, m = { top: 16, right: 16, bottom: 46, left: 40 };
  const iw = W - m.left - m.right, ih = H - m.top - m.bottom;
  const bw = iw / bins.length;
  const bars = bins.map((b, i) => {
    const h = (b.count / maxCount) * ih;
    const x = m.left + i * bw;
    const y = m.top + ih - h;
    const hot = b.x0 >= p90;
    const tip = `${dollars(b.x0)}–${dollars(b.x1)} per adult: ${b.count} area${b.count === 1 ? '' : 's'}`;
    return `<g data-tip="${tip}" aria-label="${tip}"><rect x="${(x + 2).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${h.toFixed(1)}" fill="${hot ? '#b91c1c' : '#0f766e'}" rx="2"/>
      ${b.count ? `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" class="hist-n">${b.count}</text>` : ''}</g>`;
  }).join('');
  const axis = bins.filter((_, i) => i % 2 === 0).map((b, i) => {
    const x = m.left + i * 2 * bw + bw / 2;
    return `<text x="${x.toFixed(1)}" y="${H - 22}" text-anchor="middle" class="axis">${money(b.x0)}</text>`;
  }).join('');
  const medX = m.left + ((med - bins[0].x0) / (bins[bins.length - 1].x1 - bins[0].x0)) * iw;
  const medLine = `<line x1="${medX.toFixed(1)}" y1="${m.top}" x2="${medX.toFixed(1)}" y2="${m.top + ih}" class="hist-median"/><text x="${(medX + 5).toFixed(1)}" y="${m.top + 12}" class="hist-median-lab">median ${dollars(med)}</text>`;

  const outliers = [...areas].sort((a, b) => (sectorPerAdult(b, sector) as number) - (sectorPerAdult(a, sector) as number)).slice(0, 5);

  root.innerHTML = `
    <div class="view-head"><div>
      <h2>Distribution of ${gloss('loss-per-adult', 'loss per adult')}</h2>
      <p class="view-sub">${SECTOR_LABEL[sector]}. How many council areas fall in each loss-per-adult band. The long red tail on the right is a handful of areas with extreme losses.</p>
    </div></div>
    <div class="chart-card"><svg viewBox="0 0 ${W} ${H}" class="chart-svg" preserveAspectRatio="xMidYMid meet">${bars}${axis}${medLine}</svg></div>
    <h3 class="sub-h">The outliers</h3>
    <div class="outliers">${outliers.map((a, i) => `<button class="outlier" data-slug="${a.slug}"><span class="ol-rank">${i + 1}</span><span class="ol-name">${esc(a.name)}</span><span class="ol-val">${dollars(sectorPerAdult(a, sector))}<small>/adult</small></span></button>`).join('')}</div>`;

  root.querySelectorAll<HTMLElement>('.outlier').forEach((el) =>
    el.addEventListener('click', () => ctx.select(el.dataset.slug!)));
}

// ---- Insights -------------------------------------------------------------
export function renderInsights(root: HTMLElement, ctx: ViewCtx): void {
  const icon = { alert: '⚠', warning: '◆', info: 'ℹ' } as const;
  const cards = ctx.data.insights.map((it) => `
    <div class="insight insight-${it.severity}">
      <div class="ins-icon">${icon[it.severity]}</div>
      <div class="ins-body"><h3>${esc(it.title)}</h3><p>${esc(it.body)}</p></div>
    </div>`).join('');
  root.innerHTML = `
    <div class="view-head"><div>
      <h2>Key findings</h2>
      <p class="view-sub">Automatically surfaced from the ${ctx.data.summary.latestPeriod} data — the headlines a journalist or councillor would look for first.</p>
    </div></div>
    <div class="insights-grid">${cards}</div>`;
}

// Small helper reused by main for KPI strip (kept here to share formatting).
export function kpiStrip(data: PokiesData): string {
  const s = data.summary;
  return `
    <div class="kpi"><div class="kpi-v">${money(s.totalLoss)}</div><div class="kpi-l">lost to ${gloss('pokies', 'pokies')} in ${esc(s.latestPeriod)}</div></div>
    <div class="kpi"><div class="kpi-v">${money(s.lossPerDay)}</div><div class="kpi-l">every day <span class="kpi-x">(${money(s.lossPerHour)}/hr)</span></div></div>
    <div class="kpi"><div class="kpi-v">${num(s.totalEgm)}</div><div class="kpi-l">${gloss('egm', 'poker machines')} in ${num(s.totalPremises)} venues</div></div>
    <div class="kpi"><div class="kpi-v">${signedPct(s.yoyPct)}</div><div class="kpi-l">vs ${esc(s.prevPeriod)}</div></div>
    <div class="kpi"><div class="kpi-v">${dollars(s.medianPerAdult)}</div><div class="kpi-l">median ${gloss('loss-per-adult', 'loss per adult')}</div></div>`;
}
