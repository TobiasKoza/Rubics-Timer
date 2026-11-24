import { describe, expect, it } from 'vitest';
import type { Session, Solve } from '../db/db';
import { createBackup, ImportError, parseImport, solvesToCsv } from './formats';

const solve = (p: Partial<Solve>): Solve => ({
  id: 1,
  sessionId: 1,
  timeMs: 12_340,
  penalty: 'OK',
  scramble: "R U R'",
  date: new Date(2026, 10, 24, 10, 5, 7).getTime(),
  ...p,
});

describe('záloha JSON', () => {
  it('export → import zachová data (round-trip)', () => {
    const session: Session & { solves: Solve[] } = {
      id: 7,
      name: 'OH',
      event: '333oh',
      order: 0,
      createdAt: 1,
      solves: [solve({ comment: 'pěkný', splits: [5000, 12_340] }), solve({ id: 2, penalty: 'DNF', date: 99 })],
    };
    const backup = createBackup([session], new Date('2026-11-24T00:00:00Z'));
    const { format, sessions } = parseImport(JSON.stringify(backup));
    expect(format).toBe('backup');
    expect(sessions).toEqual([
      {
        name: 'OH',
        event: '333oh',
        solves: [
          { timeMs: 12_340, penalty: 'OK', scramble: "R U R'", date: session.solves[0].date, comment: 'pěkný', splits: [5000, 12_340] },
          { timeMs: 12_340, penalty: 'DNF', scramble: "R U R'", date: 99 },
        ],
      },
    ]);
  });

  it('neplatné solvy přeskočí, neznámý event → 3x3', () => {
    const { sessions } = parseImport(
      JSON.stringify({
        app: 'rubics-timer',
        version: 1,
        sessions: [{ name: '', event: 'xyz', solves: [{ timeMs: 'x' }, { timeMs: 1000, penalty: 'OK', date: 1 }] }],
      }),
    );
    expect(sessions[0]).toMatchObject({ name: 'Session 1', event: '333' });
    expect(sessions[0].solves).toHaveLength(1);
  });

  it('novější verze zálohy se odmítne', () => {
    expect(() => parseImport(JSON.stringify({ app: 'rubics-timer', version: 99, sessions: [] }))).toThrow(ImportError);
  });
});

describe('import csTimeru', () => {
  const cstimer = {
    session1: [
      [[0, 10_500], "R U R' U'", '', 1_700_000_000],
      [[2000, 11_000], 'F2 B2', 'komentář', 1_700_000_100],
      [[-1, 9_000], 'L2', '', 1_700_000_200],
    ],
    session2: [],
    session3: JSON.stringify([[[0, 30_000], 'Rw U', '', 1_700_000_300]]),
    properties: {
      sessionData: JSON.stringify({ '1': { name: 'Main', opt: {} }, '3': { name: 4, opt: { scrType: '444wca' } } }),
    },
  };

  it('převede sessions, penalizace, čas a event; prázdné přeskočí', () => {
    const { format, sessions } = parseImport(JSON.stringify(cstimer));
    expect(format).toBe('cstimer');
    expect(sessions.map((s) => [s.name, s.event, s.solves.length])).toEqual([
      ['csTimer: Main', '333', 3],
      ['csTimer: 4', '444', 1],
    ]);
    expect(sessions[0].solves).toEqual([
      { timeMs: 10_500, penalty: 'OK', scramble: "R U R' U'", date: 1_700_000_000_000 },
      { timeMs: 11_000, penalty: '+2', scramble: 'F2 B2', date: 1_700_000_100_000, comment: 'komentář' },
      { timeMs: 9_000, penalty: 'DNF', scramble: 'L2', date: 1_700_000_200_000 },
    ]);
  });

  it('BOM na začátku souboru nevadí', () => {
    expect(parseImport('﻿' + JSON.stringify(cstimer)).format).toBe('cstimer');
  });

  it('nesmyslný soubor → srozumitelná chyba', () => {
    expect(() => parseImport('ahoj')).toThrow('platný JSON');
    expect(() => parseImport('{"a":1}')).toThrow('Neznámý formát');
    expect(() => parseImport('[1,2]')).toThrow(ImportError);
  });
});

describe('CSV', () => {
  it('BOM, středníky, desetinná čárka a uvozovky', () => {
    const csv = solvesToCsv([
      solve({}),
      solve({ id: 2, penalty: '+2', comment: 'a; "b"' }),
      solve({ id: 3, penalty: 'DNF', scramble: 'R\nU' }),
    ]);
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).trimEnd().split('\r\n');
    expect(lines[0]).toBe('Číslo;Čas (s);Penalizace;Výsledek;ao5;ao12;Datum;Scramble;Komentář');
    expect(lines[1]).toBe("1;12,34;OK;12.34;;;2026-11-24 10:05:07;R U R';");
    expect(lines[2]).toBe(`2;14,34;+2;14.34+;;;2026-11-24 10:05:07;R U R';"a; ""b"""`);
    expect(lines[3]).toBe('3;DNF;DNF;DNF(12.34);;;2026-11-24 10:05:07;R U;');
  });

  it('obsahuje klouzavé ao5', () => {
    const csv = solvesToCsv([10, 11, 12, 13, 14].map((s, i) => solve({ id: i, timeMs: s * 1000 })));
    expect(csv.trimEnd().split('\r\n')[5].split(';')[4]).toBe('12.00');
  });
});
