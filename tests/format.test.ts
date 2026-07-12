import { describe, expect, it } from 'vitest';
import { money, dollars, num, signedPct, pct, joinMembers } from '../src/format';

describe('money', () => {
  it('formats billions', () => expect(money(9_059_000_000)).toBe('$9.06bn'));
  it('formats millions', () => expect(money(766_000_000)).toBe('$766.0M'));
  it('formats thousands', () => expect(money(12_300)).toBe('$12.3k'));
  it('formats small numbers', () => expect(money(540)).toBe('$540'));
  it('handles negatives', () => expect(money(-1_500_000)).toBe('-$1.5M'));
  it('handles null/NaN', () => { expect(money(null)).toBe('—'); expect(money(NaN)).toBe('—'); });
});

describe('dollars', () => {
  it('adds thousands separators', () => expect(dollars(766000000)).toBe('$766,000,000'));
  it('rounds', () => expect(dollars(1234.7)).toBe('$1,235'));
  it('handles null', () => expect(dollars(null)).toBe('—'));
});

describe('num', () => {
  it('formats integers', () => expect(num(87855)).toBe('87,855'));
  it('handles null', () => expect(num(undefined)).toBe('—'));
});

describe('signedPct', () => {
  it('adds + for positive', () => expect(signedPct(12.4)).toBe('+12.4%'));
  it('keeps - for negative', () => expect(signedPct(-3)).toBe('-3.0%'));
  it('handles null', () => expect(signedPct(null)).toBe('—'));
});

describe('pct & joinMembers', () => {
  it('formats pct', () => expect(pct(50)).toBe('50.0%'));
  it('joins members', () => expect(joinMembers(['A', 'B'])).toBe('A · B'));
});
