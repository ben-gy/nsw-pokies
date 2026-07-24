// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.

import 'leaflet/dist/leaflet.css';
import './styles.css';
import type { PokiesData, Sector, Metric, ViewId, Area } from './types';
import { SECTOR_LABEL } from './analysis';
import { initGlossary, openAbout } from './ui';
import { initTooltip } from './tooltip';
import {
  renderLeaderboard, renderTrend, renderTable, renderTreemap,
  renderDistribution, renderInsights, kpiStrip, type ViewCtx,
} from './views';
import { renderMap, type MapHandle } from './map';
import { openDrilldown, closeDrilldown } from './drilldown';

const STORE_KEY = 'nsw-pokies-prefs';

interface State {
  view: ViewId;
  sector: Sector;
  metric: Metric;
  search: string;
}

const VIEWS: { id: ViewId; label: string; needsSector: boolean; needsMetric: boolean }[] = [
  { id: 'leaderboard', label: 'Leaderboard', needsSector: true, needsMetric: true },
  { id: 'map', label: 'Map', needsSector: true, needsMetric: true },
  { id: 'trend', label: 'Trend', needsSector: false, needsMetric: false },
  { id: 'table', label: 'Table', needsSector: true, needsMetric: false },
  { id: 'treemap', label: 'Treemap', needsSector: true, needsMetric: false },
  { id: 'distribution', label: 'Distribution', needsSector: true, needsMetric: false },
  { id: 'insights', label: 'Insights', needsSector: false, needsMetric: false },
];

let data: PokiesData;
let state: State = { view: 'leaderboard', sector: 'combined', metric: 'total', search: '' };
let mapHandle: MapHandle | null = null;
let searchTimer: number | undefined;

function loadPrefs(): void {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.view && VIEWS.some((v) => v.id === p.view)) state.view = p.view;
      if (p.sector) state.sector = p.sector;
      if (p.metric) state.metric = p.metric;
    }
  } catch { /* ignore */ }
}
function savePrefs(): void {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ view: state.view, sector: state.sector, metric: state.metric })); } catch { /* ignore */ }
}

function areaBySlug(slug: string): Area | undefined {
  return data.areas.find((a) => a.slug === slug);
}

function select(slug: string): void {
  const a = areaBySlug(slug);
  if (!a) return;
  history.replaceState(null, '', `#lga=${slug}`);
  openDrilldown(a, data, () => { /* closed */ });
}

function currentCtx(): ViewCtx {
  return { data, sector: state.sector, metric: state.metric, search: state.search, select };
}

function renderControls(): void {
  const vdef = VIEWS.find((v) => v.id === state.view)!;
  const sectorSel = document.getElementById('sectorCtl');
  const metricSel = document.getElementById('metricCtl');
  if (sectorSel) sectorSel.style.display = vdef.needsSector ? '' : 'none';
  if (metricSel) metricSel.style.display = vdef.needsMetric ? '' : 'none';
  document.querySelectorAll<HTMLElement>('.tab').forEach((t) =>
    t.classList.toggle('active', t.dataset.view === state.view));
  document.querySelectorAll<HTMLElement>('[data-sector]').forEach((b) =>
    b.classList.toggle('active', b.dataset.sector === state.sector));
  document.querySelectorAll<HTMLElement>('[data-metric]').forEach((b) =>
    b.classList.toggle('active', b.dataset.metric === state.metric));
}

async function renderView(): Promise<void> {
  const root = document.getElementById('view')!;
  if (mapHandle) { mapHandle.destroy(); mapHandle = null; }
  renderControls();
  const ctx = currentCtx();
  switch (state.view) {
    case 'leaderboard': renderLeaderboard(root, ctx); break;
    case 'trend': renderTrend(root, ctx); break;
    case 'table': renderTable(root, ctx); break;
    case 'treemap': renderTreemap(root, ctx); break;
    case 'distribution': renderDistribution(root, ctx); break;
    case 'insights': renderInsights(root, ctx); break;
    case 'map':
      root.innerHTML = '<div class="map-shell"></div>';
      try {
        mapHandle = await renderMap(root.querySelector('.map-shell') as HTMLElement, data.areas, state.sector, state.metric, select);
      } catch {
        root.innerHTML = '<p class="empty">Could not load the map. Try another view.</p>';
      }
      break;
  }
}

function setView(v: ViewId): void { state.view = v; savePrefs(); renderView(); }
function setSector(s: Sector): void { state.sector = s; savePrefs(); renderView(); }
function setMetric(m: Metric): void { state.metric = m; savePrefs(); renderView(); }

function shell(): string {
  return `
    <header class="site-header">
      <div class="hdr-inner">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24"><rect x="3" y="4" width="18" height="12" rx="2" fill="currentColor" opacity="0.15"/><rect x="3" y="4" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 17v4M12 21l-2.4-2.4M12 21l2.4-2.4" stroke="#dc2626" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>
          </span>
          <div>
            <h1>Pokies Losses <span class="brand-cc">NSW</span></h1>
            <p class="brand-sub">Poker machine losses by council area</p>
          </div>
        </div>
        <div class="hdr-actions">
          <div class="search-box">
            <input id="search" type="search" placeholder="Find your council…" aria-label="Search council areas" autocomplete="off" />
          </div>
          <button class="icon-btn" id="aboutBtn" aria-label="About & data sources" data-tip="About & data sources">?</button>
        </div>
      </div>
    </header>

    <div class="kpi-strip">${kpiStrip(data)}</div>

    <div class="controls">
      <nav class="tabs" role="tablist" aria-label="Views">
        ${VIEWS.map((v) => `<button class="tab" role="tab" data-view="${v.id}">${v.label}</button>`).join('')}
      </nav>
      <div class="toggles">
        <div class="seg" id="sectorCtl" role="group" aria-label="Sector">
          ${(['combined', 'clubs', 'hotels'] as Sector[]).map((s) => `<button data-sector="${s}">${SECTOR_LABEL[s]}</button>`).join('')}
        </div>
        <div class="seg" id="metricCtl" role="group" aria-label="Metric">
          <button data-metric="total">Total loss</button>
          <button data-metric="perAdult">Per adult</button>
        </div>
      </div>
    </div>

    <main class="main-content"><div id="view" class="view" role="tabpanel"></div></main>

    <footer class="site-footer">
      <div class="foot-inner">
        <div class="foot-main">
          <strong>Pokies Losses (NSW)</strong> — player losses to poker machines in every NSW council area.
          Source: <span class="nolink">${data.meta.source}</span>. Boundaries: ${data.meta.boundaries.replace(/,.*/, '')}.
        </div>
        <div class="foot-help">Gambling harm support: <strong>National Gambling Helpline 1800 858 858</strong> · gamblinghelponline.org.au</div>
        <div class="foot-by">Built by <a href="https://benrichardson.dev/" target="_blank" rel="noopener">benrichardson.dev</a> · <a href="https://hub.benrichardson.dev" target="_blank" rel="noopener">more tools &amp; sites</a> · Data ${new Date(data.meta.generatedAt).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}</div>
      </div>
    </footer>`;
}

function wire(): void {
  document.querySelectorAll<HTMLElement>('.tab').forEach((t) =>
    t.addEventListener('click', () => setView(t.dataset.view as ViewId)));
  document.querySelectorAll<HTMLElement>('[data-sector]').forEach((b) =>
    b.addEventListener('click', () => setSector(b.dataset.sector as Sector)));
  document.querySelectorAll<HTMLElement>('[data-metric]').forEach((b) =>
    b.addEventListener('click', () => setMetric(b.dataset.metric as Metric)));
  document.getElementById('aboutBtn')?.addEventListener('click', () => openAbout(data));
  const search = document.getElementById('search') as HTMLInputElement;
  search?.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => { state.search = search.value; renderView(); }, 250);
  });
  window.addEventListener('hashchange', handleHash);
}

function handleHash(): void {
  const m = location.hash.match(/^#lga=(.+)$/);
  if (m) {
    const a = areaBySlug(decodeURIComponent(m[1]));
    if (a) { openDrilldown(a, data, () => {}); return; }
  }
  closeDrilldown();
}

async function boot(): Promise<void> {
  const app = document.getElementById('app')!;
  app.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading NSW pokies data…</p></div>';
  try {
    const res = await fetch('data/pokies.json');
    if (!res.ok) throw new Error('data');
    data = await res.json();
  } catch {
    app.innerHTML = '<div class="loading err"><p>Sorry — the data failed to load. Please refresh to try again.</p></div>';
    return;
  }
  loadPrefs();
  initGlossary();
  initTooltip();
  app.removeAttribute('aria-busy');
  app.innerHTML = shell();
  wire();
  await renderView();
  handleHash();
}

boot();
