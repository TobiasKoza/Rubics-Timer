import { DNF } from './time';

export interface Bin {
  /** Dolní hranice (ms, včetně). */
  from: number;
  /** Horní hranice (ms, bez). */
  to: number;
  count: number;
}

const NICE_STEPS = [100, 200, 250, 500, 1000, 2000, 2500, 5000, 10_000, 15_000, 30_000, 60_000, 120_000, 300_000];

/**
 * Histogram platných časů s „hezkou“ šířkou koše (0,1 s … 5 min), aby koše
 * začínaly na kulatých číslech. DNF se nepočítají. Odlehlé hodnoty za 2.–98. percentilem
 * se přičtou do krajních košů, aby jeden pomalý solve neroztáhl celý graf.
 */
export function histogram(times: readonly number[], targetBins = 14): Bin[] {
  const valid = times.filter((t) => t !== DNF).sort((a, b) => a - b);
  if (valid.length === 0) return [];
  const lo = valid[Math.floor((valid.length - 1) * 0.02)];
  const hi = valid[Math.ceil((valid.length - 1) * 0.98)];
  const span = Math.max(hi - lo, 1);
  const step = NICE_STEPS.find((s) => span / s <= targetBins) ?? NICE_STEPS.at(-1)!;
  const start = Math.floor(lo / step) * step;
  const count = Math.max(1, Math.floor((hi - start) / step) + 1);
  const bins: Bin[] = Array.from({ length: count }, (_, i) => ({ from: start + i * step, to: start + (i + 1) * step, count: 0 }));
  for (const t of valid) {
    const i = Math.min(count - 1, Math.max(0, Math.floor((t - start) / step)));
    bins[i].count++;
  }
  return bins;
}
