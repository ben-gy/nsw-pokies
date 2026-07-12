import { describe, expect, it } from 'vitest';
import {
  sectorLoss, sectorPerAdult, metricValue, hasSector, median, quantile,
  filterAreas, rankAreas, makeColorScale, histogram,
} from '../src/analysis';
import type { Area } from '../src/types';

function mk(p: Partial<Area>): Area {
  return {
    name: 'X', slug: 'x', members: ['X'], geoIds: ['X'],
    clubs: 0, hotels: 0, combined: 0, egm: 0, egmClubs: 0, egmHotels: 0, premises: 0,
    population: null, adults: null, lossPerAdult: null, lossPerDay: 0,
    egmPer1kAdults: null, lossPerEgm: null, sectors: 'clubs+hotels', hasClubs: true, hasHotels: true,
    shareOfState: 0, prevCombined: null, yoyPct: null, history: [], rank: 0,
    ...p,
  };
}

describe('sector helpers', () => {
  const a = mk({ clubs: 100, hotels: 40, combined: 140, adults: 10 });
  it('sectorLoss picks the right field', () => {
    expect(sectorLoss(a, 'combined')).toBe(140);
    expect(sectorLoss(a, 'clubs')).toBe(100);
    expect(sectorLoss(a, 'hotels')).toBe(40);
  });
  it('sectorPerAdult divides by adults', () => {
    expect(sectorPerAdult(a, 'combined')).toBe(14);
    expect(sectorPerAdult(a, 'clubs')).toBe(10);
  });
  it('sectorPerAdult null when no adults', () => expect(sectorPerAdult(mk({ combined: 5 }), 'combined')).toBeNull());
  it('metricValue respects metric', () => {
    expect(metricValue(a, 'combined', 'total')).toBe(140);
    expect(metricValue(a, 'combined', 'perAdult')).toBe(14);
  });
  it('metricValue total is null when zero', () => expect(metricValue(mk({ combined: 0 }), 'combined', 'total')).toBeNull());
  it('hasSector reflects flags', () => {
    expect(hasSector(mk({ hasClubs: true, hasHotels: false }), 'hotels')).toBe(false);
    expect(hasSector(mk({ hasClubs: true, hasHotels: false }), 'combined')).toBe(true);
  });
});

describe('median & quantile', () => {
  it('median odd', () => expect(median([3, 1, 2])).toBe(2));
  it('median even', () => expect(median([1, 2, 3, 4])).toBe(2.5));
  it('median empty', () => expect(median([])).toBe(0));
  it('quantile 0/0.5/1', () => {
    expect(quantile([0, 10], 0)).toBe(0);
    expect(quantile([0, 10], 0.5)).toBe(5);
    expect(quantile([0, 10], 1)).toBe(10);
  });
});

describe('filterAreas', () => {
  const areas = [
    mk({ name: 'Fairfield', slug: 'fairfield', members: ['Fairfield'], clubs: 100, combined: 100, hasHotels: false }),
    mk({ name: 'Blacktown', slug: 'blacktown', members: ['Blacktown'], hotels: 50, combined: 50, hasClubs: false }),
    mk({ name: 'Empty', slug: 'empty', combined: 0 }),
  ];
  it('matches by name (case-insensitive)', () => {
    expect(filterAreas(areas, 'fair', 'combined').map((a) => a.slug)).toEqual(['fairfield']);
  });
  it('drops areas without the selected sector', () => {
    expect(filterAreas(areas, '', 'hotels').map((a) => a.slug)).toEqual(['blacktown']);
  });
  it('drops zero-loss areas', () => {
    expect(filterAreas(areas, '', 'combined').some((a) => a.slug === 'empty')).toBe(false);
  });
  it('matches member LGAs', () => {
    const grouped = [mk({ name: 'Albury / Greater Hume', slug: 'g', members: ['Albury', 'Greater Hume'], clubs: 5, combined: 5 })];
    expect(filterAreas(grouped, 'greater hume', 'combined').length).toBe(1);
  });
});

describe('rankAreas', () => {
  const areas = [
    mk({ slug: 'a', combined: 30, adults: 10 }),
    mk({ slug: 'b', combined: 100, adults: 10 }),
    mk({ slug: 'c', combined: 50, adults: 100 }),
  ];
  it('ranks by total desc', () => {
    expect(rankAreas(areas, 'combined', 'total').map((a) => a.slug)).toEqual(['b', 'c', 'a']);
  });
  it('ranks by per-adult desc', () => {
    // per adult: a=3, b=10, c=0.5
    expect(rankAreas(areas, 'combined', 'perAdult').map((a) => a.slug)).toEqual(['b', 'a', 'c']);
  });
});

describe('makeColorScale', () => {
  it('returns na colour for null', () => {
    const scale = makeColorScale([1, 2, 3, 4, 5, 6]);
    expect(scale(null)).toBe('#e5e7eb');
  });
  it('maps low values to early ramp and high to last', () => {
    const scale = makeColorScale([1, 2, 3, 4, 5, 100]);
    expect(scale(100)).toBe('#b91c1c');
    expect(typeof scale(1)).toBe('string');
  });
});

describe('histogram', () => {
  it('bins values and preserves total count', () => {
    const bins = histogram([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
    expect(bins.length).toBe(5);
    expect(bins.reduce((a, b) => a + b.count, 0)).toBe(10);
  });
  it('handles empty input', () => expect(histogram([], 5)).toEqual([]));
});
