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
  return trimmedMean(sorted, trim);
}

/** Mean of N (mo3) – nic se neořezává, jedno DNF = DNF. */
export function meanOf(times: readonly number[], n: number): number | null {
  if (times.length !== n || n === 0) return null;
  if (times.some((t) => t === DNF)) return DNF;
  return roundAverage(times.reduce((a, b) => a + b, 0) / n);
}

/** Nejlepší single (DNF se ignoruje); null, pokud není žádný platný čas. */
export function bestSingle(times: readonly number[]): number | null {
  let best = DNF;
  for (const t of times) if (t < best) best = t;
  return best === DNF ? null : best;
}

/** Aktuální aoN/moN = posledních N časů (pole je chronologicky od nejstaršího). */
export function currentAverage(times: readonly number[], n: number, kind: AvgKind = 'ao'): number | null {
  if (times.length < n) return null;
  const last = times.slice(times.length - n);
  return kind === 'mo' ? meanOf(last, n) : averageOf(last, n);
}

export type AvgKind = 'ao' | 'mo';

/**
 * Klouzavý aoN/moN pro každý solve: out[i] = průměr časů (i-n, i], jinak null.
 * Okno se drží seřazené (binární vkládání/mazání), takže i ao1000 přes 10 000
 * solvů trvá jen desítky ms.
 */
export function rollingAverage(times: readonly number[], n: number, kind: AvgKind = 'ao'): (number | null)[] {
  const out: (number | null)[] = new Array(times.length).fill(null);
  if (times.length < n || n < 1) return out;
  const trim = kind === 'mo' ? 0 : trimCount(n);
  const win: number[] = [];
  for (let i = 0; i < times.length; i++) {
    win.splice(lowerBound(win, times[i]), 0, times[i]);
    if (i >= n) win.splice(lowerBound(win, times[i - n]), 1);
    if (i >= n - 1) out[i] = trimmedMean(win, trim);
  }
  return out;
}

/** Průměr seřazeného okna bez `trim` nejlepších a nejhorších. */
function trimmedMean(sorted: readonly number[], trim: number): number {
  const end = sorted.length - trim;
  if (sorted[end - 1] === DNF) return DNF;
  let sum = 0;
  for (let i = trim; i < end; i++) sum += sorted[i];
  return roundAverage(sum / (end - trim));
}

function lowerBound(arr: readonly number[], x: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Průměry se podle WCA (9f2) zaokrouhlují na setiny, singly se ořezávají. */
function roundAverage(x: number): number {
  return Math.round(x / 10) * 10;
}

// ---------------------------------------------------------------------------
// Souhrn statistik session
// ---------------------------------------------------------------------------

export interface AverageDef {
  key: string;
  n: number;
  kind: AvgKind;
}

export const AVERAGES: readonly AverageDef[] = [
  { key: 'mo3', n: 3, kind: 'mo' },
  { key: 'ao5', n: 5, kind: 'ao' },
  { key: 'ao12', n: 12, kind: 'ao' },
  { key: 'ao50', n: 50, kind: 'ao' },
  { key: 'ao100', n: 100, kind: 'ao' },
  { key: 'ao1000', n: 1000, kind: 'ao' },
];

export interface AverageStat extends AverageDef {
  current: number | null;
  best: number | null;
  /** Index posledního solvu v nejlepším okně. */
  bestEnd: number | null;
}

export interface StatsSummary {
  count: number;
  /** Poslední (efektivní) čas, DNF = Infinity. */
  last: number | null;
  dnfCount: number;
  best: number | null;
  bestIndex: number | null;
  worst: number | null;
  /** Průměr všech platných (ne-DNF) časů. */
  mean: number | null;
  /** Směrodatná odchylka platných časů. */
  sd: number | null;
  averages: AverageStat[];
  /** Klouzavé průměry pro graf (podle klíče). */
  rolling: Record<string, (number | null)[]>;
}

/** Druhy PB, které hlásíme. */
export type PbKind = 'single' | 'ao5' | 'ao12';

/**
 * Inkrementální výpočet statistik. Když k session přibude jeden solve na konec
 * (běžný případ po solvu), dopočítá se jen nové okno – O(N log N) místo O(počet · N).
 * Jakákoli jiná změna (penalizace, mazání, jiná session) přepočítá vše.
 */
export class StatsTracker {
  private times: number[] = [];
  private summary: StatsSummary = computeSummary([]);
  private finiteSum = 0;
  private finiteSqSum = 0;

  get current(): StatsSummary {
    return this.summary;
  }

  /** Úplný přepočet. */
  reset(times: readonly number[]): StatsSummary {
    this.times = [...times];
    this.summary = computeSummary(this.times);
    this.finiteSum = 0;
    this.finiteSqSum = 0;
    for (const t of this.times) {
      if (t !== DNF) {
        this.finiteSum += t;
        this.finiteSqSum += t * t;
      }
    }
    return this.summary;
  }

  /** Přidá jeden čas na konec; vrátí nový souhrn a seznam nových PB. */
  append(time: number): { summary: StatsSummary; pbs: PbKind[] } {
    const prev = this.summary;
    const times = this.times;
    times.push(time);
    const i = times.length - 1;
    const pbs: PbKind[] = [];

    const isDnf = time === DNF;
    if (!isDnf) {
      this.finiteSum += time;
      this.finiteSqSum += time * time;
    }
    const valid = times.length - prev.dnfCount - (isDnf ? 1 : 0);

    let best = prev.best;
    let bestIndex = prev.bestIndex;
    if (!isDnf && (best === null || time < best)) {
      if (best !== null) pbs.push('single');
      best = time;
      bestIndex = i;
    }

    const rolling: Record<string, (number | null)[]> = {};
    const averages = prev.averages.map((a) => {
      const value = currentAverage(times, a.n, a.kind);
      const series = prev.rolling[a.key];
      series.push(value);
      rolling[a.key] = series;
      let { best: aBest, bestEnd } = a;
      if (value !== null && value !== DNF && (aBest === null || aBest === DNF || value < aBest)) {
        if (aBest !== null && aBest !== DNF && (a.key === 'ao5' || a.key === 'ao12')) pbs.push(a.key);
        aBest = value;
        bestEnd = i;
      } else if (value === DNF && aBest === null) {
        aBest = DNF;
        bestEnd = i;
      }
      return { ...a, current: value, best: aBest, bestEnd };
    });

    const mean = valid > 0 ? this.finiteSum / valid : null;
    this.summary = {
      count: times.length,
      last: time,
      dnfCount: prev.dnfCount + (isDnf ? 1 : 0),
      best,
      bestIndex,
      worst: !isDnf && (prev.worst === null || time > prev.worst) ? time : prev.worst,
      mean: mean === null ? null : Math.round(mean),
      sd: mean === null ? null : Math.round(Math.sqrt(Math.max(0, this.finiteSqSum / valid - mean * mean))),
      averages,
      rolling,
    };
    return { summary: this.summary, pbs };
  }
}

/** Úplný výpočet souhrnu z pole efektivních časů. */
export function computeSummary(times: readonly number[]): StatsSummary {
  let dnfCount = 0;
  let best: number | null = null;
  let bestIndex: number | null = null;
  let worst: number | null = null;
  let sum = 0;
  let sq = 0;
  times.forEach((t, i) => {
    if (t === DNF) {
      dnfCount++;
      return;
    }
    sum += t;
    sq += t * t;
    if (best === null || t < best) {
      best = t;
      bestIndex = i;
    }
    if (worst === null || t > worst) worst = t;
  });
  const valid = times.length - dnfCount;
  const mean = valid > 0 ? sum / valid : null;

  const rolling: Record<string, (number | null)[]> = {};
  const averages = AVERAGES.map((a) => {
    const series = rollingAverage(times, a.n, a.kind);
    rolling[a.key] = series;
    let aBest: number | null = null;
    let bestEnd: number | null = null;
    series.forEach((v, i) => {
      if (v === null) return;
      if (aBest === null || v < aBest) {
        aBest = v;
        bestEnd = i;
      }
    });
    return { ...a, current: series.at(-1) ?? null, best: aBest, bestEnd };
  });

  return {
    count: times.length,
    last: times.at(-1) ?? null,
    dnfCount,
    best,
    bestIndex,
    worst,
    mean: mean === null ? null : Math.round(mean),
    sd: mean === null ? null : Math.round(Math.sqrt(Math.max(0, sq / valid - mean * mean))),
    averages,
    rolling,
  };
}
