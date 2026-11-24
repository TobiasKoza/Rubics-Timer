import { describe, expect, it } from 'vitest';
import { histogram } from './histogram';
import { DNF } from './time';

describe('histogram', () => {
  it('kulaté koše a správné počty', () => {
    const bins = histogram([10_100, 10_900, 11_200, 12_000, 13_999, DNF]);
    expect(bins.map((b) => [b.from, b.count])).toEqual([
      [10_000, 1],
      [10_500, 1],
      [11_000, 1],
      [11_500, 0],
      [12_000, 1],
      [12_500, 0],
      [13_000, 0],
      [13_500, 1],
    ]);
  });

  it('všechny platné časy jsou započtené i s odlehlými hodnotami', () => {
    const times = [...Array.from({ length: 98 }, (_, i) => 10_000 + i * 50), 60_000, 1_000];
    const bins = histogram(times);
    expect(bins.reduce((a, b) => a + b.count, 0)).toBe(100);
    expect(bins.length).toBeLessThanOrEqual(15);
  });

  it('prázdné nebo samé DNF', () => {
    expect(histogram([])).toEqual([]);
    expect(histogram([DNF])).toEqual([]);
  });

  it('jeden čas → jeden koš', () => {
    expect(histogram([12_340])).toEqual([{ from: 12_300, to: 12_400, count: 1 }]);
  });
});
