// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Glossary tooltips + modal dialogs.
import { GLOSSARY } from './glossary';
import type { PokiesData } from './types';
import { esc } from './charts';

/** Inline glossary link: <span class="gloss" data-term="egm">EGM</span> with a ? affordance. */
export function gloss(key: string, label?: string): string {
  const t = GLOSSARY[key];
  const text = label ?? (t ? t.term : key);
  return `<span class="gloss" data-term="${key}" tabindex="0" role="button" aria-label="${esc(text)} — definition">${esc(text)}<span class="gloss-i" aria-hidden="true">?</span></span>`;
}

let tip: HTMLDivElement | null = null;

export function initGlossary(): void {
  tip = document.createElement('div');
  tip.className = 'glossary-tip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.appendChild(tip);

  const show = (target: HTMLElement) => {
    const key = target.dataset.term;
    if (!key || !tip) return;
    const t = GLOSSARY[key];
    if (!t) return;
    tip.innerHTML = `<strong>${esc(t.term)}</strong><p>${esc(t.definition)}</p>`;
    tip.hidden = false;
    const r = target.getBoundingClientRect();
    const tw = Math.min(320, window.innerWidth - 24);
    tip.style.width = tw + 'px';
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - tw - 12));
    let top = r.bottom + 8;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    // flip above if overflowing bottom
    const th = tip.getBoundingClientRect().height;
    if (top + th > window.innerHeight - 12) {
      top = r.top - th - 8;
      tip.style.top = Math.max(12, top) + 'px';
    }
  };
  const hide = () => { if (tip) tip.hidden = true; };

  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('.gloss');
    if (target) {
      e.stopPropagation();
      if (!tip!.hidden && tip!.dataset.for === target.dataset.term) { hide(); return; }
      tip!.dataset.for = target.dataset.term || '';
      show(target);
    } else if (!(e.target as HTMLElement).closest('.glossary-tip')) {
      hide();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
    if ((e.key === 'Enter' || e.key === ' ') && (e.target as HTMLElement).classList?.contains('gloss')) {
      e.preventDefault();
      (e.target as HTMLElement).click();
    }
  });
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
}

// ---- Modal ----------------------------------------------------------------
let modalEl: HTMLDivElement | null = null;

export function openModal(title: string, bodyHtml: string): void {
  closeModal();
  modalEl = document.createElement('div');
  modalEl.className = 'modal-overlay';
  modalEl.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head">
        <h2>${esc(title)}</h2>
        <button class="modal-close" aria-label="Close">×</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
    </div>`;
  document.body.appendChild(modalEl);
  document.body.style.overflow = 'hidden';
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl || (e.target as HTMLElement).closest('.modal-close')) closeModal();
  });
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
  (modalEl.querySelector('.modal-close') as HTMLElement)?.focus();
}

export function closeModal(): void {
  if (modalEl) { modalEl.remove(); modalEl = null; document.body.style.overflow = ''; }
}

export function openAbout(data: PokiesData): void {
  const m = data.meta;
  const s = data.summary;
  const generated = new Date(m.generatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  openModal('About this site', `
    <p><strong>Pokies Losses (NSW)</strong> shows how much money is lost to poker machines in every New South Wales council area — the clubs and hotels combined — so anyone can see the toll of gambling where they live.</p>
    <h3>What the numbers mean</h3>
    <p>The headline figure is <em>net gaming machine profit</em>: the money venues keep after paying out winnings. That is exactly equal to what players lost. In ${esc(s.latestPeriod)}, players across NSW lost <strong>${esc(fmtBn(s.totalLoss))}</strong> — about ${esc('$' + Math.round(s.lossPerHour).toLocaleString('en-AU'))} every hour of every day.</p>
    <h3>Loss per adult</h3>
    <p>To compare areas fairly, we divide each area's losses by its estimated adult population. Liquor &amp; Gaming NSW publishes each area's resident population; we multiply it by ${(m.adultShare * 100).toFixed(0)}% (the NSW 18-and-over share from ABS data) to estimate adults.</p>
    <h3>Data source</h3>
    <p>${esc(m.source)}. Reports are published quarterly and annually and cover clubs and hotels licensed to operate poker machines. Boundaries: ${esc(m.boundaries)}.</p>
    <h3>Caveats</h3>
    <p>${esc(m.note)}</p>
    <p class="muted">Data last processed ${esc(generated)}. Casinos (e.g. The Star) are licensed separately and are not included.</p>
    <h3>Need help?</h3>
    <p>Gambling can cause serious harm. Free, confidential support is available 24/7 in Australia via the <strong>National Gambling Helpline on 1800 858 858</strong> or at <span class="nolink">gamblinghelponline.org.au</span>.</p>
  `);
}

function fmtBn(n: number): string {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + ' billion';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(0) + ' million';
  return '$' + n.toLocaleString('en-AU');
}
