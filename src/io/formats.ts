import { effectiveTime, formatSolve, formatTime, type Penalty } from '../core/time';
import { rollingAverage } from '../core/stats';
import type { Session, Solve } from '../db/db';
import type { ImportedSession } from '../db/sessionOps';
import { isEventId, type EventId } from '../scramble/events';

// ---------------------------------------------------------------------------
// Vlastní záloha (JSON)
// ---------------------------------------------------------------------------

export const BACKUP_APP = 'rubics-timer';
export const BACKUP_VERSION = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  sessions: {
    name: string;
    event: EventId;
    createdAt: number;
    solves: Omit<Solve, 'id' | 'sessionId'>[];
  }[];
}

export function createBackup(sessions: (Session & { solves: Solve[] })[], now = new Date()): Backup {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    sessions: sessions.map((s) => ({
      name: s.name,
      event: s.event,
      createdAt: s.createdAt,
      solves: s.solves.map(({ id: _id, sessionId: _sid, ...rest }) => rest),
    })),
  };
}

function parseBackup(data: Backup): ImportedSession[] {
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    throw new ImportError('Záloha pochází z novější verze aplikace.');
  }
  if (!Array.isArray(data.sessions)) throw new ImportError('Záloha neobsahuje sessions.');
  return data.sessions.map((s, i) => ({
    name: typeof s.name === 'string' && s.name ? s.name : `Session ${i + 1}`,
    event: isEventId(String(s.event)) ? s.event : '333',
    solves: (Array.isArray(s.solves) ? s.solves : []).flatMap((solve) => {
      if (!Number.isFinite(solve?.timeMs) || !Number.isFinite(solve?.date) || !isPenalty(solve?.penalty)) return [];
      return [
        {
          timeMs: solve.timeMs,
          penalty: solve.penalty,
          scramble: typeof solve.scramble === 'string' ? solve.scramble : '',
          date: solve.date,
          ...(typeof solve.comment === 'string' && solve.comment ? { comment: solve.comment } : {}),
          ...(Array.isArray(solve.splits) && solve.splits.every(Number.isFinite) ? { splits: solve.splits } : {}),
        },
      ];
    }),
  }));
}

function isPenalty(p: unknown): p is Penalty {
  return p === 'OK' || p === '+2' || p === 'DNF';
}

// ---------------------------------------------------------------------------
// csTimer
// ---------------------------------------------------------------------------

/** Typy scramblů csTimeru → WCA eventy. Neznámé typy padnou na 3x3x3. */
const CSTIMER_TYPES: Record<string, EventId> = {
  '333': '333',
  '333o': '333',
  '222so': '222',
  '222o': '222',
  '444wca': '444',
  '444m': '444',
  '444o': '444',
  '555wca': '555',
  '555': '555',
  '666wca': '666',
  '666si': '666',
  '777wca': '777',
  '777si': '777',
  '333ni': '333bf',
  '444bld': '444bf',
  '555bld': '555bf',
  '333oh': '333oh',
  '333fm': '333fm',
  pyrso: 'pyram',
  pyrm: 'pyram',
  mgmp: 'minx',
  mgmc: 'minx',
  skbso: 'skewb',
  skb: 'skewb',
  sqrs: 'sq1',
  sq1h: 'sq1',
  clkwca: 'clock',
  clk: 'clock',
};

interface CsTimerSessionData {
  name?: string | number;
  opt?: { scrType?: string };
}

/**
 * Formát zálohy csTimeru: { session1: [[[penalizace, čas], scramble, komentář, timestamp(s)], …], …,
 * properties: { sessionData: '{"1":{"name":…,"opt":{"scrType":"444wca"}}}' } }.
 * Penalizace: 0 = OK, 2000 = +2, -1 = DNF. Prázdné sessions se přeskočí.
 */
function parseCsTimer(data: Record<string, unknown>): ImportedSession[] {
  const props = (data.properties ?? {}) as Record<string, unknown>;
  let sessionData: Record<string, CsTimerSessionData> = {};
  try {
    const raw = props.sessionData;
    sessionData = (typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {})) as Record<string, CsTimerSessionData>;
  } catch {
    /* bez metadat – použijeme výchozí jména */
  }

  const keys = Object.keys(data)
    .map((k) => /^session(\d+)$/.exec(k))
    .filter((m): m is RegExpExecArray => m !== null)
    .sort((a, b) => Number(a[1]) - Number(b[1]));

  const out: ImportedSession[] = [];
  for (const m of keys) {
    let entries = data[m[0]];
    if (typeof entries === 'string') {
      try {
        entries = JSON.parse(entries);
      } catch {
        continue;
      }
    }
    if (!Array.isArray(entries) || entries.length === 0) continue;
    const meta = sessionData[m[1]] ?? {};
    const scrType = meta.opt?.scrType ?? '333';
    const solves = entries.flatMap((entry, i) => {
      if (!Array.isArray(entry) || !Array.isArray(entry[0])) return [];
      const [pen, time] = entry[0] as [number, number];
      if (!Number.isFinite(time) || time < 0) return [];
      const penalty: Penalty = pen === -1 ? 'DNF' : pen > 0 ? '+2' : 'OK';
      const ts = Number(entry[3]);
      return [
        {
          timeMs: Math.round(time),
          penalty,
          scramble: typeof entry[1] === 'string' ? entry[1] : '',
          date: Number.isFinite(ts) && ts > 0 ? ts * 1000 : i,
          ...(typeof entry[2] === 'string' && entry[2] ? { comment: entry[2] } : {}),
        },
      ];
    });
    if (solves.length === 0) continue;
    out.push({
      name: meta.name !== undefined && String(meta.name) ? `csTimer: ${meta.name}` : `csTimer ${m[1]}`,
      event: CSTIMER_TYPES[scrType] ?? '333',
      solves,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rozpoznání formátu
// ---------------------------------------------------------------------------

export class ImportError extends Error {}

export type ImportFormat = 'backup' | 'cstimer';

export function parseImport(text: string): { format: ImportFormat; sessions: ImportedSession[] } {
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    throw new ImportError('Soubor není platný JSON.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ImportError('Neznámý formát souboru.');
  const obj = data as Record<string, unknown>;
  if (obj.app === BACKUP_APP) return { format: 'backup', sessions: parseBackup(obj as unknown as Backup) };
  if (Object.keys(obj).some((k) => /^session\d+$/.test(k))) return { format: 'cstimer', sessions: parseCsTimer(obj) };
  throw new ImportError('Neznámý formát souboru. Podporovaná je záloha Rubics Timeru a csTimeru.');
}

// ---------------------------------------------------------------------------
// CSV pro Excel
// ---------------------------------------------------------------------------

const csvDate = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

function csvField(v: string): string {
  return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Sekundy s desetinnou čárkou (česká lokalizace Excelu). */
function seconds(ms: number | null): string {
  if (ms === null) return '';
  if (!Number.isFinite(ms)) return 'DNF';
  return (Math.floor(ms / 10) / 100).toFixed(2).replace('.', ',');
}

/**
 * CSV jedné session pro Excel: UTF-8 s BOM, středník jako oddělovač,
 * desetinná čárka – v české lokalizaci se otevře rovnou do sloupců.
 */
export function solvesToCsv(solves: readonly Solve[]): string {
  const times = solves.map((s) => effectiveTime(s.timeMs, s.penalty));
  const ao5 = rollingAverage(times, 5);
  const ao12 = rollingAverage(times, 12);
  const header = ['Číslo', 'Čas (s)', 'Penalizace', 'Výsledek', 'ao5', 'ao12', 'Datum', 'Scramble', 'Komentář'];
  const rows = solves.map((s, i) => [
    String(i + 1),
    seconds(times[i]),
    s.penalty,
    formatSolve(s.timeMs, s.penalty),
    ao5[i] === null ? '' : formatTime(ao5[i]!),
    ao12[i] === null ? '' : formatTime(ao12[i]!),
    csvDate(s.date),
    s.scramble.replace(/\s*\n\s*/g, ' '),
    s.comment ?? '',
  ]);
  return '﻿' + [header, ...rows].map((r) => r.map(csvField).join(';')).join('\r\n') + '\r\n';
}
