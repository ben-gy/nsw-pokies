// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Domain glossary. Every jargon term used in the UI should have an entry here so
// it can be surfaced via an inline info tooltip.
export interface GlossaryTerm {
  term: string;
  definition: string;
}

export const GLOSSARY: Record<string, GlossaryTerm> = {
  pokies: {
    term: 'Pokies',
    definition:
      'Australian slang for poker machines (also called electronic gaming machines or EGMs) — the coin/card-operated gambling machines found in clubs and hotels.',
  },
  egm: {
    term: 'EGM (poker machine)',
    definition:
      'Electronic Gaming Machine. NSW has around 88,000 of them in clubs and hotels — more than any other Australian state and among the highest per person in the world.',
  },
  'net-profit': {
    term: 'Net gaming machine profit',
    definition:
      'The amount venues keep from poker machines after paying out winnings. It equals the total amount players lost, so on this site "net profit" and "player losses" are the same number.',
  },
  loss: {
    term: 'Player losses',
    definition:
      'Money players put into the machines and did not get back — reported officially as venues’ net gaming machine profit. It is the headline figure on this site.',
  },
  'loss-per-adult': {
    term: 'Loss per adult',
    definition:
      'Total pokies losses in an area divided by its estimated adult (18+) population. This is the fairest way to compare areas of different sizes. Adults are estimated as 79% of the resident population reported by Liquor & Gaming NSW (the NSW 18+ share from ABS data).',
  },
  lga: {
    term: 'LGA (council area)',
    definition:
      'Local Government Area — the council district you live in (e.g. Blacktown, Fairfield, Wollongong). NSW has 128 of them. Liquor & Gaming NSW reports pokies data at this level.',
  },
  clubs: {
    term: 'Clubs',
    definition:
      'Registered/licensed clubs (RSL, leagues, bowling, sports and community clubs). They hold the majority of NSW poker machines and pay a lower tax rate than hotels.',
  },
  hotels: {
    term: 'Hotels',
    definition:
      'Pubs and hotels licensed to operate poker machines (capped at 30 machines each). They pay a higher gaming tax rate than clubs.',
  },
  'grouped-area': {
    term: 'Grouped council areas',
    definition:
      'Where only a few venues operate in a council area, Liquor & Gaming NSW combines neighbouring councils into one reporting group to protect commercial privacy. Clubs and hotels are sometimes grouped differently, so a few rows here show only one sector (marked with a badge).',
  },
  'per-machine': {
    term: 'Loss per machine',
    definition:
      'Average player losses per poker machine per year in an area — a measure of how hard the machines are working. High values point to intensive, high-turnover venues.',
  },
  yoy: {
    term: 'Year-on-year change',
    definition:
      'The percentage change in total losses versus the previous reporting year. Positive means losses grew; negative means they fell.',
  },
  'machines-per-1k': {
    term: 'Machines per 1,000 adults',
    definition:
      'The number of poker machines in an area for every 1,000 adult residents — a measure of how saturated an area is with gambling machines.',
  },
};
