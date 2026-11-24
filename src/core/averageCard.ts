import { averageOf, meanOf, trimCount, type AvgKind } from './stats';
import { effectiveTime, formatSolve, formatTime, type Penalty } from './time';

export interface CardSolve {
  timeMs: number;
  penalty: Penalty;
  scramble: string;
}

export interface AverageCardData {
  label: string;
  value: number | null;
  /** Pro každý solve, jestli se do průměru nepočítá (zobrazí se v závorce). */
  excluded: boolean[];
}

/** Které solvy v okně aoN se zahazují (nejlepší a nejhorší). Pro moN žádné. */
export function excludedIndices(solves: readonly CardSolve[], kind: AvgKind): boolean[] {
  const out = solves.map(() => false);
  if (kind === 'mo') return out;
  const trim = trimCount(solves.length);
  const order = solves
    .map((s, i) => ({ i, t: effectiveTime(s.timeMs, s.penalty) }))
    .sort((a, b) => a.t - b.t || a.i - b.i);
  for (let k = 0; k < trim; k++) {
    out[order[k].i] = true;
    out[order[order.length - 1 - k].i] = true;
  }
  return out;
}

export function averageCard(solves: readonly CardSolve[], kind: AvgKind): AverageCardData {
  const times = solves.map((s) => effectiveTime(s.timeMs, s.penalty));
  return {
    label: `${kind}${solves.length}`,
    value: kind === 'mo' ? meanOf(times, times.length) : averageOf(times, times.length),
    excluded: excludedIndices(solves, kind),
  };
}

/** Textová podoba karty pro schránku (formát podobný csTimeru). */
export function averageCardText(solves: readonly CardSolve[], kind: AvgKind, date = new Date()): string {
  const card = averageCard(solves, kind);
  const shown = solves.map((s, i) => {
    const t = formatSolve(s.timeMs, s.penalty);
    return card.excluded[i] ? `(${t})` : t;
  });
  const lines = [
    `Vygenerováno Rubics Timerem ${date.toLocaleDateString('cs-CZ')}`,
    `${card.label}: ${card.value === null ? '–' : formatTime(card.value)}`,
    '',
    `Časy: ${shown.join(', ')}`,
    '',
    ...solves.map((s, i) => `${i + 1}. ${shown[i]}   ${s.scramble.replace(/\s*\n\s*/g, ' ')}`),
  ];
  return lines.join('\n');
}
