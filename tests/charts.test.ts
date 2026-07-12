import { describe, expect, it } from 'vitest';
import { squarify, esc, trendSVG, sparklineSVG, type Rect } from '../src/charts';

const EPS = 1e-6;

function overlapArea(a: Rect, b: Rect): number {
  const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return ox * oy;
}

// Deterministic pseudo-random values — no Math.random() in tests.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('squarify', () => {
  it('returns one rect per value', () => {
    const rects = squarify([10, 20, 30, 40], 100, 100);
    expect(rects.length).toBe(4);
  });
  it('keeps rects within bounds', () => {
    const rects = squarify([5, 3, 2, 8, 1], 200, 120);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(-0.01);
      expect(r.y).toBeGreaterThanOrEqual(-0.01);
      expect(r.x + r.w).toBeLessThanOrEqual(200.5);
      expect(r.y + r.h).toBeLessThanOrEqual(120.5);
    }
  });
  it('total rect area approximates the canvas area', () => {
    const rects = squarify([1, 1, 1, 1], 100, 100);
    const area = rects.reduce((a, r) => a + r.w * r.h, 0);
    expect(area).toBeGreaterThan(9500); // ~10000
    expect(area).toBeLessThan(10500);
  });
  it('handles a single value', () => {
    const rects = squarify([42], 80, 60);
    expect(rects.length).toBe(1);
    expect(Math.round(rects[0].w * rects[0].h)).toBe(80 * 60);
  });
});

// Position-asserting layout tests: area-only tests pass on visually broken
// layouts (e.g. every cell stacked at the same origin). Positions, bounds and
// pairwise overlap are what catch that.
describe('squarify — positional correctness', () => {
  const boxes: Array<[number, number]> = [[1000, 560], [200, 900], [500, 500]];
  const rand = mulberry32(7);
  const valueSets: number[][] = [
    [5, 3, 2, 1],
    [100],
    Array.from({ length: 9 }, () => 1),
    Array.from({ length: 50 }, () => 1 + Math.floor(rand() * 200)),
  ];

  for (const [W, H] of boxes) {
    for (const values of valueSets) {
      it(`lays out ${values.length} values in ${W}×${H}: in-bounds, no overlap, no NaN, area conserved`, () => {
        const rects = squarify(values, W, H);
        const total = values.reduce((a, b) => a + b, 0);
        expect(rects).toHaveLength(values.length);
        for (const r of rects) {
          // no NaN / negatives
          expect(Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.w) && Number.isFinite(r.h)).toBe(true);
          expect(r.w).toBeGreaterThanOrEqual(0);
          expect(r.h).toBeGreaterThanOrEqual(0);
          // within bounds
          expect(r.x).toBeGreaterThanOrEqual(-EPS);
          expect(r.y).toBeGreaterThanOrEqual(-EPS);
          expect(r.x + r.w).toBeLessThanOrEqual(W + EPS * W);
          expect(r.y + r.h).toBeLessThanOrEqual(H + EPS * H);
        }
        // no pairwise overlap (>0.5px² fails)
        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            expect(overlapArea(rects[i], rects[j])).toBeLessThan(0.5);
          }
        }
        // area conservation + per-cell proportionality
        const sumArea = rects.reduce((s, r) => s + r.w * r.h, 0);
        expect(Math.abs(sumArea - W * H)).toBeLessThan(W * H * 1e-6);
        rects.forEach((r, i) => {
          const expected = (values[i] / total) * W * H;
          expect(Math.abs(r.w * r.h - expected)).toBeLessThan(Math.max(1e-6, expected * 1e-6));
        });
      });
    }
  }

  it('handles degenerates: empty, single fills box, zero-total has no NaN', () => {
    expect(squarify([], 100, 100)).toEqual([]);
    const [single] = squarify([42], 100, 80);
    expect(single.w * single.h).toBeCloseTo(8000, 6);
    for (const r of squarify([0, 0, 0], 100, 100)) {
      expect(Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.w) && Number.isFinite(r.h)).toBe(true);
      expect(r.w * r.h).toBe(0);
    }
  });
});

describe('esc', () => {
  it('escapes html', () => expect(esc('<a>&"')).toBe('&lt;a&gt;&amp;&quot;'));
});

describe('svg builders return svg', () => {
  it('trendSVG', () => {
    const out = trendSVG(['a', 'b'], [{ label: 'L', color: '#000', points: [1, 2] }], { yFmt: (n) => String(n) });
    expect(out.startsWith('<svg')).toBe(true);
  });
  it('trendSVG dots use data-tip, not native <title>', () => {
    const out = trendSVG(['a', 'b'], [{ label: 'L', color: '#000', points: [1, 2] }], { yFmt: (n) => String(n) });
    expect(out).toContain('data-tip="L — a: 1"');
    expect(out).toContain('aria-label="L — a: 1"');
    expect(out).not.toContain('<title>');
  });
  it('sparklineSVG', () => {
    expect(sparklineSVG([1, 2, 3], '#000').startsWith('<svg')).toBe(true);
    expect(sparklineSVG([], '#000')).toBe('');
  });
  it('sparklineSVG dots carry data-tip when tips are provided', () => {
    const out = sparklineSVG([1, 2], '#000', 240, 56, ['FY23: $1', 'FY24: $2']);
    expect(out).toContain('data-tip="FY23: $1"');
    expect(out).toContain('aria-label="FY24: $2"');
    expect(sparklineSVG([1, 2], '#000')).not.toContain('data-tip');
  });
});
