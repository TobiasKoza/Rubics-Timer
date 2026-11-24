import { describe, expect, it } from 'vitest';
import { averageOf, bestSingle, computeSummary, currentAverage, meanOf, rollingAverage, StatsTracker, trimCount } from './stats';
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


/** Deterministický generátor (mulberry32), ať jsou testy opakovatelné. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomTimes(count: number, seed: number, dnfRate = 0.08): number[] {
  const r = rng(seed);
  return Array.from({ length: count }, () => (r() < dnfRate ? DNF : Math.round(8000 + r() * 12000)));
}

describe('rollingAverage', () => {
  it.each([3, 5, 12, 50])('ao%i odpovídá naivnímu výpočtu v každém okně', (n) => {
    const times = randomTimes(400, n);
    const rolling = rollingAverage(times, n);
    rolling.forEach((v, i) => {
      expect(v).toBe(i < n - 1 ? null : averageOf(times.slice(i - n + 1, i + 1), n));
    });
  });

  it('mo3 klouzavě', () => {
    const times = [1000, 2000, 3000, DNF, 5000, 6000, 7000];
    expect(rollingAverage(times, 3, 'mo')).toEqual([null, null, 2000, DNF, DNF, DNF, 6000]);
  });

  it('málo časů → samé null', () => {
    expect(rollingAverage([1, 2], 5)).toEqual([null, null]);
  });
});

describe('computeSummary', () => {
  it('základní souhrn', () => {
    const s = computeSummary([10_000, DNF, 12_000, 8_000, 11_000, 9_000]);
    expect(s.count).toBe(6);
    expect(s.dnfCount).toBe(1);
    expect(s.best).toBe(8_000);
    expect(s.bestIndex).toBe(3);
    expect(s.worst).toBe(12_000);
    expect(s.mean).toBe(10_000);
    expect(s.sd).toBe(1414); // populační σ z 8,9,10,11,12 s = √2 s
    const ao5 = s.averages.find((a) => a.key === 'ao5')!;
    expect(ao5.current).toBe(10_670); // [DNF,12,8,11,9] bez 8 a DNF → (12+11+9)/3
  });

  it('nejlepší průměr a jeho pozice', () => {
    const times = [20, 20, 20, 20, 20, 10, 10, 10, 10, 10, 30].map((x) => x * 1000);
    const ao5 = computeSummary(times).averages.find((a) => a.key === 'ao5')!;
    expect(ao5.best).toBe(10_000);
    expect(ao5.bestEnd).toBe(8); // první okno s průměrem 10
    expect(ao5.current).toBe(10_000); // 10,10,10,10,30 → bez 10 a 30
  });

  it('prázdná session', () => {
    const s = computeSummary([]);
    expect(s).toMatchObject({ count: 0, best: null, mean: null, sd: null });
    expect(s.averages.every((a) => a.current === null && a.best === null)).toBe(true);
  });

  it('samé DNF', () => {
    const s = computeSummary([DNF, DNF, DNF, DNF, DNF]);
    expect(s.best).toBeNull();
    expect(s.mean).toBeNull();
    expect(s.averages.find((a) => a.key === 'ao5')!.best).toBe(DNF);
  });
});

describe('StatsTracker', () => {
  it('inkrementální přidávání dává stejný výsledek jako úplný přepočet', () => {
    const times = randomTimes(1200, 42);
    const tracker = new StatsTracker();
    tracker.reset(times.slice(0, 700));
    for (const t of times.slice(700)) tracker.append(t);
    const full = computeSummary(times);
    const inc = tracker.current;
    expect(inc.count).toBe(full.count);
    expect(inc.dnfCount).toBe(full.dnfCount);
    expect(inc.best).toBe(full.best);
    expect(inc.worst).toBe(full.worst);
    expect(inc.mean).toBe(full.mean);
    expect(Math.abs(inc.sd! - full.sd!)).toBeLessThanOrEqual(1);
    expect(inc.averages).toEqual(full.averages);
    expect(inc.rolling.ao12).toEqual(full.rolling.ao12);
  });

  it('hlásí nové PB pro single, ao5 a ao12, ale ne u prvního solvu', () => {
    const tracker = new StatsTracker();
    expect(tracker.append(15_000).pbs).toEqual([]);
    expect(tracker.append(14_000).pbs).toEqual(['single']);
    expect(tracker.append(16_000).pbs).toEqual([]);
    tracker.append(16_000);
    expect(tracker.append(16_000).pbs).toEqual([]); // první ao5 není PB
    expect(tracker.append(13_000).pbs).toEqual(['single', 'ao5']);
    expect(tracker.append(DNF).pbs).toEqual([]);
  });

  it('PB ao12', () => {
    const tracker = new StatsTracker();
    tracker.reset(Array(12).fill(20_000));
    const { pbs } = tracker.append(20_000);
    expect(pbs).toEqual([]);
    expect(tracker.append(10_000).pbs).toEqual(['single']); // jeden rychlý čas se v ao5 zahodí
    expect(tracker.append(10_000).pbs).toEqual(['ao5', 'ao12']);
  });
});
