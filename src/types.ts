// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
export type Sector = 'combined' | 'clubs' | 'hotels';
export type Metric = 'total' | 'perAdult';
export type ViewId = 'leaderboard' | 'map' | 'trend' | 'table' | 'treemap' | 'distribution' | 'insights';

export interface Period {
  key: string;
  label: string;
  clubs: number;
  hotels: number;
  combined: number;
  egmClubs: number;
  egmHotels: number;
  egms: number;
}

export interface AreaHistory {
  key: string;
  clubs: number;
  hotels: number;
  combined: number;
}

export interface Area {
  name: string;
  slug: string;
  members: string[];
  geoIds: string[];
  clubs: number;
  hotels: number;
  combined: number;
  egm: number;
  egmClubs: number;
  egmHotels: number;
  premises: number;
  population: number | null;
  adults: number | null;
  lossPerAdult: number | null;
  lossPerDay: number;
  egmPer1kAdults: number | null;
  lossPerEgm: number | null;
  sectors: string;
  hasClubs: boolean;
  hasHotels: boolean;
  shareOfState: number;
  prevCombined: number | null;
  yoyPct: number | null;
  history: AreaHistory[];
  rank: number;
  rankPerAdult?: number;
}

export interface Insight {
  severity: 'alert' | 'warning' | 'info';
  title: string;
  body: string;
}

export interface Summary {
  latestPeriod: string;
  prevPeriod: string;
  totalLoss: number;
  clubsLoss: number;
  hotelsLoss: number;
  totalEgm: number;
  totalPremises: number;
  lgaCount: number;
  lossPerDay: number;
  lossPerHour: number;
  medianPerAdult: number;
  yoyPct: number;
}

export interface Meta {
  state: string;
  generatedAt: string;
  adultShare: number;
  source: string;
  sourceUrl: string;
  boundaries: string;
  note: string;
}

export interface PokiesData {
  meta: Meta;
  summary: Summary;
  periods: Period[];
  areas: Area[];
  insights: Insight[];
}
