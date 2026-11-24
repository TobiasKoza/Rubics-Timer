/** Penalizace podle pravidel WCA. */
export type Penalty = 'OK' | '+2' | 'DNF';

/** Hodnota pro DNF ve výpočtech – vždy horší než jakýkoli čas. */
export const DNF = Number.POSITIVE_INFINITY;

/** Výsledný čas solvu v ms po započtení penalizace (DNF = Infinity). */
export function effectiveTime(timeMs: number, penalty: Penalty): number {
  if (penalty === 'DNF') return DNF;
  if (penalty === '+2') return timeMs + 2000;
  return timeMs;
}

/**
 * Formátuje čas v ms. WCA časy se ořezávají (ne zaokrouhlují).
 * 12345 → "12.34", 65210 → "1:05.21", 3725000 → "1:02:05.00".
 */
export function formatTime(ms: number, decimals: 0 | 1 | 2 | 3 = 2): string {
  if (!Number.isFinite(ms)) return 'DNF';
  if (ms < 0) ms = 0;
  const unit = 10 ** (3 - decimals);
  const truncated = Math.floor(ms / unit) * unit;
  const totalSeconds = Math.floor(truncated / 1000);
  const fraction = decimals > 0 ? '.' + String(Math.floor((truncated % 1000) / unit)).padStart(decimals, '0') : '';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}${fraction}`;
  if (m > 0) return `${m}:${pad2(s)}${fraction}`;
  return `${s}${fraction}`;
}

/** Formátuje solve včetně penalizace: "14.34+", "DNF(12.34)". */
export function formatSolve(timeMs: number, penalty: Penalty, decimals: 0 | 1 | 2 | 3 = 2): string {
  if (penalty === 'DNF') return `DNF(${formatTime(timeMs, decimals)})`;
  if (penalty === '+2') return `${formatTime(timeMs + 2000, decimals)}+`;
  return formatTime(timeMs, decimals);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export interface ParsedTime {
  timeMs: number;
  penalty: Penalty;
}

/**
 * Parsuje ručně zadaný čas. Podporuje:
 *  - "12.34", "12,34" (desetinná čárka), "1:05.21", "1:02:05.00"
 *  - jen číslice ve stylu csTimeru: "1234" = 12.34, "10521" = 1:05.21
 *  - penalizace: "12.34+" (+2), "DNF", "DNF(12.34)", "dnf 12.34"
 * Vrací null pro neplatný vstup.
 */
export function parseTimeInput(raw: string): ParsedTime | null {
  let s = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (s === '') return null;

  let penalty: Penalty = 'OK';
  if (s.startsWith('dnf')) {
    penalty = 'DNF';
    s = s.slice(3).replace(/^\((.*)\)$/, '$1');
    if (s === '') return { timeMs: 0, penalty };
  } else if (s.endsWith('+')) {
    penalty = '+2';
    s = s.slice(0, -1);
  }

  s = s.replace(',', '.');
  let timeMs: number | null;
  if (/^\d+$/.test(s)) {
    timeMs = parseDigits(s);
  } else if (/^(\d+:){0,2}\d+(\.\d*)?$/.test(s) || /^(\d+:){0,2}\.\d+$/.test(s)) {
    timeMs = parseColon(s);
  } else {
    return null;
  }
  if (timeMs === null || timeMs <= 0) return null;
  // +2 zadané jako "14.34+" znamená výsledný čas – uložíme surový čas bez penalizace
  if (penalty === '+2') {
    timeMs -= 2000;
    if (timeMs <= 0) return null;
  }
  return { timeMs, penalty };
}

/** "1234" → 12.34 s; poslední 2 číslice = setiny, další 2 = sekundy, zbytek minuty. */
function parseDigits(s: string): number | null {
  const n = s.padStart(3, '0');
  const cs = Number(n.slice(-2));
  const rest = n.slice(0, -2);
  const sec = Number(rest.slice(-2));
  const min = rest.length > 2 ? Number(rest.slice(0, -2)) : 0;
  if (min > 0 && sec >= 60) return null;
  return (min * 60 + sec) * 1000 + cs * 10;
}

function parseColon(s: string): number | null {
  const parts = s.split(':');
  const secStr = parts.pop()!;
  const sec = Number(secStr === '' ? NaN : secStr.startsWith('.') ? '0' + secStr : secStr);
  if (!Number.isFinite(sec)) return null;
  let min = 0;
  let hours = 0;
  if (parts.length === 2) {
    hours = Number(parts[0]);
    min = Number(parts[1]);
    if (min >= 60) return null;
  } else if (parts.length === 1) {
    min = Number(parts[0]);
  }
  if (parts.length > 0 && sec >= 60) return null;
  return Math.round(((hours * 60 + min) * 60 + sec) * 1000);
}
