import type { EventId } from '../scramble/events';
import type { NewSolve, Session, Solve, TimerDB } from './db';

/**
 * Operace nad sessions a solvy. Čisté funkce nad Dexie (bez UI a stavu),
 * takže je jde testovat proti fake-indexeddb.
 */

export async function listSessions(db: TimerDB): Promise<Session[]> {
  return db.sessions.orderBy('order').toArray();
}

export async function loadSolves(db: TimerDB, sessionId: number): Promise<Solve[]> {
  return db.solves.where('[sessionId+date]').between([sessionId, -Infinity], [sessionId, Infinity]).toArray();
}

export async function countSolves(db: TimerDB): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  await db.solves.orderBy('sessionId').eachKey((key) => {
    const id = key as number;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  });
  return counts;
}

export async function createSession(db: TimerDB, name: string, event: EventId): Promise<Session> {
  const order = ((await db.sessions.orderBy('order').last())?.order ?? -1) + 1;
  const now = Date.now();
  const data: Omit<Session, 'id'> = { name: name.trim() || event, event, order, createdAt: now, lastUsedAt: now };
  const id = await db.sessions.add(data as Session);
  return { ...data, id };
}

export async function updateSession(db: TimerDB, id: number, patch: Partial<Pick<Session, 'name' | 'event' | 'lastUsedAt'>>) {
  await db.sessions.update(id, patch);
}

/** Smaže session i všechny její solvy. */
export async function deleteSession(db: TimerDB, id: number): Promise<void> {
  await db.transaction('rw', db.sessions, db.solves, async () => {
    await db.solves.where('sessionId').equals(id).delete();
    await db.sessions.delete(id);
  });
}

/** Přesune všechny solvy ze `sourceId` do `targetId` a zdrojovou session smaže. */
export async function mergeSessions(db: TimerDB, sourceId: number, targetId: number): Promise<number> {
  if (sourceId === targetId) return 0;
  return db.transaction('rw', db.sessions, db.solves, async () => {
    const moved = await db.solves.where('sessionId').equals(sourceId).modify({ sessionId: targetId });
    await db.sessions.delete(sourceId);
    return moved;
  });
}

/**
 * Rozdělí session: solvy od `fromDate` (včetně) přesune do nové session
 * se stejným eventem. Vrací novou session.
 */
export async function splitSession(db: TimerDB, id: number, fromDate: number, name: string): Promise<Session> {
  return db.transaction('rw', db.sessions, db.solves, async () => {
    const source = await db.sessions.get(id);
    if (!source) throw new Error(`Session ${id} neexistuje`);
    const created = await createSession(db, name, source.event);
    await db.solves
      .where('[sessionId+date]')
      .between([id, fromDate], [id, Infinity], true, true)
      .modify({ sessionId: created.id });
    return created;
  });
}

export interface ImportedSession {
  name: string;
  event: EventId;
  solves: Omit<NewSolve, 'sessionId'>[];
}

/** Uloží importované sessions jako nové (stávající data zůstanou). */
export async function importSessions(db: TimerDB, sessions: ImportedSession[]): Promise<{ sessions: number; solves: number }> {
  let solveCount = 0;
  await db.transaction('rw', db.sessions, db.solves, async () => {
    for (const s of sessions) {
      const created = await createSession(db, s.name, s.event);
      await db.solves.bulkAdd(s.solves.map((solve) => ({ ...solve, sessionId: created.id }) as Solve));
      solveCount += s.solves.length;
    }
  });
  return { sessions: sessions.length, solves: solveCount };
}

/** Všechny sessions včetně solvů (pro zálohu). */
export async function exportAll(db: TimerDB): Promise<(Session & { solves: Solve[] })[]> {
  const sessions = await listSessions(db);
  return Promise.all(sessions.map(async (s) => ({ ...s, solves: await loadSolves(db, s.id) })));
}

/** Smaže úplně všechna data. */
export async function clearAll(db: TimerDB): Promise<void> {
  await db.transaction('rw', db.sessions, db.solves, async () => {
    await db.solves.clear();
    await db.sessions.clear();
  });
}
