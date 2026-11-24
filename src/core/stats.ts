import { DNF } from './time';

/** Počet časů, které se u aoN zahazují z každé strany (csTimer: ceil(5 % z N), min. 1). */
export function trimCount(n: number): number {
  return Math.max(1, Math.ceil(n * 0.05));
}

/**
 * Průměr aoN podle WCA/csTimeru z přesně N časů (ms, DNF = Infinity).
 * Zahodí `trimCount(N)` nejlepších a stejně nejhorších; DNF se bere jako nejhorší.
 * Je-li DNF víc, než se zahazuje, výsledek je DNF.
 * Vrací null, pokud časů není přesně N.
 */
export function averageOf(times: readonly number[], n: number): number | null {
  if (n < 3 || times.length !== n) return null;
  const trim = trimCount(n);
  const sorted = [...times].sort((a, b) => a - b);
  const kept = sorted.slice(trim, n - trim);
  if (kept.some((t) => t === DNF)) return DNF;
  return roundMs(kept.reduce((a, b) => a + b, 0) / kept.length);
}

/** Mean of N (mo3) – nic se neořezává, jedno DNF = DNF. */
export function meanOf(times: readonly number[], n: number): number | null {
  if (times.length !== n || n === 0) return null;
  if (times.some((t) => t === DNF)) return DNF;
  return roundMs(times.reduce((a, b) => a + b, 0) / n);
}

/** Nejlepší single (DNF se ignoruje); null, pokud není žádný platný čas. */
export function bestSingle(times: readonly number[]): number | null {
  let best = DNF;
  for (const t of times) if (t < best) best = t;
  return best === DNF ? null : best;
}

/** Aktuální aoN/moN = posledních N časů (pole je chronologicky od nejstaršího). */
export function currentAverage(times: readonly number[], n: number, kind: 'ao' | 'mo' = 'ao'): number | null {
  if (times.length < n) return null;
  const last = times.slice(times.length - n);
  return kind === 'mo' ? meanOf(last, n) : averageOf(last, n);
}

/** Průměry se podle WCA (9f2) zaokrouhlují na setiny, singly se ořezávají. */
function roundMs(x: number): number {
  return Math.round(x / 10) * 10;
}
