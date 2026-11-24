import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TimerDB, type Solve } from './db';
import {
  countSolves,
  createSession,
  deleteSession,
  exportAll,
  importSessions,
  listSessions,
  loadSolves,
  mergeSessions,
  splitSession,
  updateSession,
} from './sessionOps';

let db: TimerDB;
let n = 0;

beforeEach(async () => {
  db = new TimerDB(`test-${++n}`);
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

async function addSolves(sessionId: number, dates: number[]) {
  await db.solves.bulkAdd(
    dates.map((date) => ({ sessionId, date, timeMs: date * 10, penalty: 'OK', scramble: `s${date}` }) as Solve),
  );
}

describe('sessions', () => {
  it('vytvoření, pořadí a přejmenování', async () => {
    const a = await createSession(db, '3x3 doma', '333');
    const b = await createSession(db, '  ', '444');
    expect(a.order).toBe(0);
    expect(b.order).toBe(1);
    expect(b.name).toBe('444'); // prázdné jméno → podle eventu
    await updateSession(db, a.id, { name: 'Trénink', event: '333oh' });
    const list = await listSessions(db);
    expect(list.map((s) => [s.name, s.event])).toEqual([
      ['Trénink', '333oh'],
      ['444', '444'],
    ]);
  });

  it('solvy se načítají chronologicky jen pro danou session', async () => {
    const a = await createSession(db, 'A', '333');
    const b = await createSession(db, 'B', '222');
    await addSolves(a.id, [3, 1, 2]);
    await addSolves(b.id, [5]);
    expect((await loadSolves(db, a.id)).map((s) => s.date)).toEqual([1, 2, 3]);
    expect(await countSolves(db)).toEqual(
      new Map([
        [a.id, 3],
        [b.id, 1],
      ]),
    );
  });

  it('smazání session smaže i její solvy', async () => {
    const a = await createSession(db, 'A', '333');
    const b = await createSession(db, 'B', '333');
    await addSolves(a.id, [1, 2]);
    await addSolves(b.id, [3]);
    await deleteSession(db, a.id);
    expect((await listSessions(db)).map((s) => s.id)).toEqual([b.id]);
    expect(await db.solves.count()).toBe(1);
  });

  it('sloučení přesune solvy a smaže zdroj', async () => {
    const a = await createSession(db, 'A', '333');
    const b = await createSession(db, 'B', '333');
    await addSolves(a.id, [1, 4]);
    await addSolves(b.id, [2, 3]);
    expect(await mergeSessions(db, a.id, b.id)).toBe(2);
    expect((await loadSolves(db, b.id)).map((s) => s.date)).toEqual([1, 2, 3, 4]);
    expect(await db.sessions.get(a.id)).toBeUndefined();
    expect(await mergeSessions(db, b.id, b.id)).toBe(0);
  });

  it('rozdělení přesune solvy od daného data do nové session', async () => {
    const a = await createSession(db, 'A', '555');
    await addSolves(a.id, [1, 2, 3, 4, 5]);
    const created = await splitSession(db, a.id, 3, 'A (2)');
    expect(created.event).toBe('555');
    expect((await loadSolves(db, a.id)).map((s) => s.date)).toEqual([1, 2]);
    expect((await loadSolves(db, created.id)).map((s) => s.date)).toEqual([3, 4, 5]);
  });

  it('import přidá nové sessions a export vrátí vše', async () => {
    await createSession(db, 'Stávající', '333');
    const result = await importSessions(db, [
      {
        name: 'Import',
        event: 'sq1',
        solves: [
          { timeMs: 20_000, penalty: '+2', scramble: '(1,0) /', date: 10, comment: 'hm' },
          { timeMs: 25_000, penalty: 'DNF', scramble: '(0,1) /', date: 20 },
        ],
      },
    ]);
    expect(result).toEqual({ sessions: 1, solves: 2 });
    const all = await exportAll(db);
    expect(all.map((s) => [s.name, s.solves.length])).toEqual([
      ['Stávající', 0],
      ['Import', 2],
    ]);
    expect(all[1].solves[0]).toMatchObject({ penalty: '+2', comment: 'hm' });
  });
});
