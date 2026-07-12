import { describe, expect, it } from 'vitest';
import { squarify, esc, trendSVG, sparklineSVG } from '../src/charts';

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

describe('esc', () => {
  it('escapes html', () => expect(esc('<a>&"')).toBe('&lt;a&gt;&amp;&quot;'));
});

describe('svg builders return svg', () => {
  it('trendSVG', () => {
    const out = trendSVG(['a', 'b'], [{ label: 'L', color: '#000', points: [1, 2] }], { yFmt: (n) => String(n) });
    expect(out.startsWith('<svg')).toBe(true);
  });
  it('sparklineSVG', () => {
    expect(sparklineSVG([1, 2, 3], '#000').startsWith('<svg')).toBe(true);
    expect(sparklineSVG([], '#000')).toBe('');
  });
});
