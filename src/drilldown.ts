// Slide-in per-area detail panel.
import type { Area, PokiesData } from './types';
import { money, dollars, num, signedPct, joinMembers } from './format';
import { sparklineSVG, esc } from './charts';
import { gloss } from './ui';

let panel: HTMLDivElement | null = null;

export function closeDrilldown(): void {
  if (panel) { panel.remove(); panel = null; }
  if (location.hash.startsWith('#lga=')) history.replaceState(null, '', location.pathname + location.search);
}

export function openDrilldown(area: Area, data: PokiesData, onClose: () => void): void {
  if (panel) panel.remove();
  const s = data.summary;
  const medPA = s.medianPerAdult;
  const pa = area.lossPerAdult;
  const vsMed = pa != null && medPA ? (pa / medPA) : null;

  const clubsPct = area.combined ? (area.clubs / area.combined) * 100 : 0;
  const hotelsPct = area.combined ? (area.hotels / area.combined) * 100 : 0;

  const hist = area.history;
  const spark = hist.length > 1
    ? `<div class="dd-trend">
         ${sparklineSVG(hist.map((h) => h.combined), '#0f766e', 260, 60)}
         <div class="dd-trend-axis"><span>${esc(hist[0].key)}</span><span>${esc(hist[hist.length - 1].key)}</span></div>
       </div>`
    : '<p class="muted">Not enough history for a trend (grouping changed between years).</p>';

  const badge = (area.hasClubs && area.hasHotels) ? '' :
    `<span class="badge badge-partial">${area.hasClubs ? 'Clubs only' : 'Hotels only'}</span>`;

  const grouped = area.members.length > 1
    ? `<div class="dd-note">${gloss('grouped-area', 'Grouped reporting area')}: ${esc(joinMembers(area.members))}.</div>` : '';

  const stat = (label: string, value: string, sub = '') =>
    `<div class="dd-stat"><div class="dd-stat-v">${value}</div><div class="dd-stat-l">${label}${sub ? ` <span class="muted">${sub}</span>` : ''}</div></div>`;

  panel = document.createElement('div');
  panel.className = 'dd-overlay';
  panel.innerHTML = `
    <div class="dd-panel" role="dialog" aria-modal="true" aria-label="${esc(area.name)} details">
      <div class="dd-head">
        <div>
          <div class="dd-rank">Rank #${area.rank} of ${s.lgaCount} by total loss${area.rankPerAdult ? ` · #${area.rankPerAdult} per adult` : ''}</div>
          <h2>${esc(area.name)} ${badge}</h2>
        </div>
        <button class="dd-close" aria-label="Close">×</button>
      </div>
      <div class="dd-scroll">
        <div class="dd-hero">
          <div class="dd-hero-v">${money(area.combined)}</div>
          <div class="dd-hero-l">lost to ${gloss('pokies', 'pokies')} in ${esc(s.latestPeriod)} — about ${money(area.lossPerDay)} a day</div>
        </div>

        <div class="dd-split">
          <div class="dd-split-bar">
            <div class="dd-seg dd-clubs" style="width:${clubsPct.toFixed(1)}%" title="Clubs ${money(area.clubs)}"></div>
            <div class="dd-seg dd-hotels" style="width:${hotelsPct.toFixed(1)}%" title="Hotels ${money(area.hotels)}"></div>
          </div>
          <div class="dd-split-key">
            <span><span class="sw sw-clubs"></span>${gloss('clubs', 'Clubs')} ${money(area.clubs)} (${clubsPct.toFixed(0)}%)</span>
            <span><span class="sw sw-hotels"></span>${gloss('hotels', 'Hotels')} ${money(area.hotels)} (${hotelsPct.toFixed(0)}%)</span>
          </div>
        </div>

        <div class="dd-stats">
          ${stat(`${gloss('loss-per-adult', 'Loss per adult')}`, pa == null ? '—' : dollars(pa), pa != null && vsMed ? `${vsMed.toFixed(1)}× median` : '')}
          ${stat('Adults (est.)', num(area.adults), area.population ? `of ${num(area.population)} residents` : '')}
          ${stat(`${gloss('egm', 'Poker machines')}`, num(area.egm), `in ${num(area.premises)} venues`)}
          ${stat(`${gloss('machines-per-1k', 'Machines / 1k adults')}`, area.egmPer1kAdults == null ? '—' : String(area.egmPer1kAdults))}
          ${stat(`${gloss('per-machine', 'Loss per machine')}`, area.lossPerEgm == null ? '—' : dollars(area.lossPerEgm), 'per year')}
          ${stat('Share of NSW total', area.shareOfState + '%')}
          ${stat(`${gloss('yoy', 'Year-on-year')}`, area.yoyPct == null ? '—' : signedPct(area.yoyPct), area.prevCombined ? `from ${money(area.prevCombined)}` : '')}
        </div>

        <h3 class="dd-h">Losses over time</h3>
        ${spark}
        ${grouped}

        <div class="dd-compare">
          ${pa != null
            ? `<p>Someone in <strong>${esc(area.name)}</strong> lost about <strong>${dollars(pa)}</strong> per adult to the pokies in ${esc(s.latestPeriod)} — ${vsMed && vsMed >= 1 ? `<strong>${vsMed.toFixed(1)}×</strong> the state median` : `below the state median`} of ${dollars(medPA)}.</p>`
            : ''}
        </div>

        <div class="dd-help">Worried about gambling? Free 24/7 support: <strong>1800 858 858</strong>.</div>
      </div>
    </div>`;

  document.body.appendChild(panel);
  requestAnimationFrame(() => panel?.classList.add('open'));
  const close = () => { closeDrilldown(); onClose(); };
  panel.addEventListener('click', (e) => {
    if (e.target === panel || (e.target as HTMLElement).closest('.dd-close')) close();
  });
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
  (panel.querySelector('.dd-close') as HTMLElement)?.focus();
}
