import { describe, expect, it } from 'vitest';
import { averageOf, bestSingle, currentAverage, meanOf, trimCount } from './stats';
import { DNF } from './time';

describe('trimCount', () => {
  it.each([
    [5, 1],
    [12, 1],
    [50, 3],
    [100, 5],
    [1000, 50],
  ])('ao%i zahazuje %i z každé strany', (n, k) => {
    expect(trimCount(n)).toBe(k);
  });
});

describe('averageOf', () => {
  it('ao5 zahodí nejlepší a nejhorší', () => {
    expect(averageOf([10_000, 12_000, 11_000, 9_000, 20_000], 5)).toBe(11_000);
  });
  it('jedno DNF v ao5 se zahodí jako nejhorší', () => {
    expect(averageOf([10_000, 12_000, 11_000, 9_000, DNF], 5)).toBe(11_000);
  });
  it('dvě DNF v ao5 = DNF', () => {
    expect(averageOf([10_000, DNF, 11_000, 9_000, DNF], 5)).toBe(DNF);
  });
  it('ao12 s jedním DNF', () => {
    const times = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, DNF].map((s) => s * 1000);
    expect(averageOf(times, 12)).toBe(15_500); // průměr 11..20
  });
  it('ao50 snese 3 DNF, 4 už ne', () => {
    const base = Array.from({ length: 50 }, (_, i) => 10_000 + i * 100);
    const three = [...base.slice(0, 47), DNF, DNF, DNF];
    expect(averageOf(three, 50)).not.toBe(DNF);
    const four = [...base.slice(0, 46), DNF, DNF, DNF, DNF];
    expect(averageOf(four, 50)).toBe(DNF);
  });
  it('průměr se zaokrouhluje na setiny', () => {
    // (10.001 + 10.002 + 10.004) / 3 = 10.00233… → 10.00
    expect(averageOf([1, 10_001, 10_002, 10_004, 99_999], 5)).toBe(10_000);
    // 10.005 → 10.01
    expect(averageOf([1, 10_005, 10_005, 10_005, 99_999], 5)).toBe(10_010);
  });
  it('málo časů → null', () => {
    expect(averageOf([1, 2, 3, 4], 5)).toBeNull();
  });
  it('+2 je už započtené v efektivním čase', () => {
    expect(averageOf([10_000, 10_000, 12_000, 9_000, 30_000], 5)).toBe(10_670);
  });
});

describe('meanOf', () => {
  it('mo3 nic neořezává', () => {
    expect(meanOf([10_000, 11_000, 15_000], 3)).toBe(12_000);
  });
  it('jedno DNF v mo3 = DNF', () => {
    expect(meanOf([10_000, DNF, 15_000], 3)).toBe(DNF);
  });
});

describe('bestSingle a currentAverage', () => {
  it('nejlepší single ignoruje DNF', () => {
    expect(bestSingle([DNF, 12_000, 9_000])).toBe(9_000);
    expect(bestSingle([DNF])).toBeNull();
    expect(bestSingle([])).toBeNull();
  });
  it('aktuální ao5 bere posledních 5', () => {
    const times = [50_000, 10_000, 12_000, 11_000, 9_000, 20_000];
    expect(currentAverage(times, 5)).toBe(11_000);
    expect(currentAverage(times.slice(0, 4), 5)).toBeNull();
    expect(currentAverage([1000, 2000, 3000], 3, 'mo')).toBe(2000);
  });
});
