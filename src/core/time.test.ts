import { describe, expect, it } from 'vitest';
import { DNF, effectiveTime, formatSolve, formatTime, parseTimeInput } from './time';

describe('formatTime', () => {
  it.each([
    [0, '0.00'],
    [12_345, '12.34'], // ořezává, nezaokrouhluje
    [12_349, '12.34'],
    [59_999, '59.99'],
    [60_000, '1:00.00'],
    [65_210, '1:05.21'],
    [3_725_000, '1:02:05.00'],
  ])('%i → %s', (ms, out) => {
    expect(formatTime(ms)).toBe(out);
  });

  it('volitelná přesnost', () => {
    expect(formatTime(12_345, 3)).toBe('12.345');
    expect(formatTime(12_345, 1)).toBe('12.3');
    expect(formatTime(12_345, 0)).toBe('12');
  });

  it('DNF', () => {
    expect(formatTime(DNF)).toBe('DNF');
  });
});

describe('formatSolve a effectiveTime', () => {
  it('+2 přičte 2 s', () => {
    expect(effectiveTime(10_000, '+2')).toBe(12_000);
    expect(formatSolve(10_000, '+2')).toBe('12.00+');
  });
  it('DNF ukazuje původní čas v závorce', () => {
    expect(effectiveTime(10_000, 'DNF')).toBe(DNF);
    expect(formatSolve(10_000, 'DNF')).toBe('DNF(10.00)');
  });
});

describe('parseTimeInput', () => {
  it.each([
    ['12.34', 12_340],
    ['12,34', 12_340],
    ['  9.5 ', 9_500],
    ['1:05.21', 65_210],
    ['1:05', 65_000],
    ['1:02:05.00', 3_725_000],
    ['1234', 12_340],
    ['5', 50],
    ['10521', 65_210],
    ['.75', 750],
  ])('"%s" → %i ms', (input, ms) => {
    expect(parseTimeInput(input)).toEqual({ timeMs: ms, penalty: 'OK' });
  });

  it('penalizace', () => {
    expect(parseTimeInput('14.34+')).toEqual({ timeMs: 12_340, penalty: '+2' });
    expect(parseTimeInput('DNF')).toEqual({ timeMs: 0, penalty: 'DNF' });
    expect(parseTimeInput('dnf(12.34)')).toEqual({ timeMs: 12_340, penalty: 'DNF' });
  });

  it.each(['', 'abc', '12.34.5', '1:75', '0', '0.00', '1:2:3:4', '-5', '1.5+'])('neplatný vstup "%s" → null', (input) => {
    expect(parseTimeInput(input)).toBeNull();
  });
});
