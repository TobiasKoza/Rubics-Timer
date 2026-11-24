import { StatsTracker, type PbKind, type StatsSummary } from '../core/stats';
import { effectiveTime, formatSolve, type Penalty } from '../core/time';
import { UndoStack } from '../core/undo';
import { db, type NewSolve, type Session, type Solve } from '../db/db';
import * as ops from '../db/sessionOps';
import { t } from '../i18n/cs';
import { getEvent, type EventId } from '../scramble/events';
import { createStore } from './createStore';
import { storage } from './storage';

export interface SolvesState {
  ready: boolean;
  sessions: Session[];
  currentSessionId: number | null;
  /** Solvy aktuální session, chronologicky od nejstaršího. Nové pole při každé změně. */
  solves: Solve[];
  /** Popis poslední vratné akce pro toast „Zpět“ (přidání solvu toast neukazuje). */
  undoLabel: string | null;
}

export const solvesStore = createStore<SolvesState>({
  ready: false,
  sessions: [],
  currentSessionId: null,
  solves: [],
  undoLabel: null,
});

export interface PbEvent {
  kinds: PbKind[];
  solveId: number;
}

export interface StatsState {
  summary: StatsSummary;
  /** Nové PB z posledního solvu (null, pokud žádné). */
  pb: PbEvent | null;
}

const tracker = new StatsTracker();
export const statsStore = createStore<StatsState>({ summary: tracker.current, pb: null });

const undoStack = new UndoStack();
const CURRENT_KEY = 'rubics-timer:currentSession';

function patch(p: Partial<SolvesState>) {
  solvesStore.set((s) => ({ ...s, ...p }));
}

const eff = (s: Solve) => effectiveTime(s.timeMs, s.penalty);

/**
 * Jediné místo, kde se mění seznam solvů – drží v synchronu i statistiky.
 * Přidání na konec se počítá inkrementálně, cokoli jiného přepočtem.
 */
function setSolves(solves: Solve[], appended?: Solve) {
  if (appended) {
    const { summary, pbs } = tracker.append(eff(appended));
    statsStore.set({ summary, pb: pbs.length ? { kinds: pbs, solveId: appended.id } : null });
  } else {
    statsStore.set({ summary: tracker.reset(solves.map(eff)), pb: null });
  }
  patch({ solves });
}

export function currentSession(): Session | undefined {
  const { sessions, currentSessionId } = solvesStore.get();
  return sessions.find((s) => s.id === currentSessionId);
}

async function refreshSessions(): Promise<Session[]> {
  const sessions = await ops.listSessions(db);
  patch({ sessions });
  return sessions;
}

let initPromise: Promise<void> | null = null;

/** Načte data při startu. Idempotentní – StrictMode volá efekty dvakrát a souběžně. */
export function initSolves(): Promise<void> {
  initPromise ??= doInit().finally(() => (initPromise = null));
  return initPromise;
}

async function doInit(): Promise<void> {
  let sessions = await ops.listSessions(db);
  if (sessions.length === 0) {
    await ops.createSession(db, getEvent('333').name, '333');
    sessions = await ops.listSessions(db);
  }
  const saved = Number(storage.get(CURRENT_KEY));
  const current = sessions.find((s) => s.id === saved) ?? sessions[0];
  patch({ sessions });
  await selectSession(current.id);
  patch({ ready: true });
}

export async function selectSession(id: number): Promise<void> {
  const solves = await ops.loadSolves(db, id);
  const lastUsedAt = Date.now();
  await ops.updateSession(db, id, { lastUsedAt });
  storage.set(CURRENT_KEY, String(id));
  undoStack.clear();
  patch({
    currentSessionId: id,
    undoLabel: null,
    sessions: solvesStore.get().sessions.map((s) => (s.id === id ? { ...s, lastUsedAt } : s)),
  });
  setSolves(solves);
}

/** Přepne na naposledy použitou session daného eventu, případně ji vytvoří. */
export async function switchToEvent(event: EventId): Promise<void> {
  const candidates = solvesStore
    .get()
    .sessions.filter((s) => s.event === event)
    .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));
  const session = candidates[0] ?? (await ops.createSession(db, getEvent(event).name, event));
  if (!candidates[0]) await refreshSessions();
  await selectSession(session.id);
}

/** Přepne na sousední session v pořadí (pro zkratky). */
export async function cycleSession(delta: 1 | -1): Promise<void> {
  const { sessions, currentSessionId } = solvesStore.get();
  if (sessions.length < 2) return;
  const i = sessions.findIndex((s) => s.id === currentSessionId);
  await selectSession(sessions[(i + delta + sessions.length) % sessions.length].id);
}

export async function createNewSession(name: string, event: EventId): Promise<void> {
  const session = await ops.createSession(db, name.trim() || getEvent(event).name, event);
  await refreshSessions();
  await selectSession(session.id);
}

export async function renameSession(id: number, name: string): Promise<void> {
  if (!name.trim()) return;
  await ops.updateSession(db, id, { name: name.trim() });
  await refreshSessions();
}

export async function changeSessionEvent(id: number, event: EventId): Promise<void> {
  await ops.updateSession(db, id, { event });
  await refreshSessions();
}

export async function removeSession(id: number): Promise<void> {
  await ops.deleteSession(db, id);
  let sessions = await refreshSessions();
  if (sessions.length === 0) {
    await ops.createSession(db, getEvent('333').name, '333');
    sessions = await refreshSessions();
  }
  if (solvesStore.get().currentSessionId === id) await selectSession(sessions[0].id);
}

export async function mergeSessionInto(sourceId: number, targetId: number): Promise<void> {
  await ops.mergeSessions(db, sourceId, targetId);
  await refreshSessions();
  const current = solvesStore.get().currentSessionId;
  if (current === sourceId || current === targetId) await selectSession(targetId);
}

/** Rozdělí aktuální session: daný solve a všechny novější přesune do nové session. */
export async function splitCurrentSessionAt(solveId: number): Promise<Session | null> {
  const session = currentSession();
  const solve = solvesStore.get().solves.find((s) => s.id === solveId);
  if (!session || !solve) return null;
  const created = await ops.splitSession(db, session.id, solve.date, `${session.name} (2)`);
  await refreshSessions();
  await selectSession(session.id);
  return created;
}

function pushUndo(label: string, undo: () => Promise<void>, toast = true) {
  undoStack.push({ label, undo });
  patch({ undoLabel: toast ? label : null });
}

export async function addSolve(data: Omit<NewSolve, 'sessionId'>): Promise<Solve> {
  const sessionId = solvesStore.get().currentSessionId;
  if (sessionId === null) throw new Error('Žádná aktivní session');
  const id = await db.solves.add({ ...data, sessionId } as Solve);
  const solve: Solve = { ...data, sessionId, id };
  setSolves([...solvesStore.get().solves, solve], solve);
  pushUndo(
    t.undo.added(formatSolve(solve.timeMs, solve.penalty)),
    async () => void (await removeSolve(id)),
    false,
  );
  return solve;
}

async function removeSolve(id: number): Promise<Solve | undefined> {
  const solve = solvesStore.get().solves.find((s) => s.id === id);
  if (solve) setSolves(solvesStore.get().solves.filter((s) => s.id !== id));
  await db.solves.delete(id);
  return solve;
}

async function restoreSolve(solve: Solve): Promise<void> {
  await db.solves.put(solve);
  if (solve.sessionId !== solvesStore.get().currentSessionId) return;
  setSolves([...solvesStore.get().solves, solve].sort((a, b) => a.date - b.date));
}

export async function deleteSolve(id: number): Promise<void> {
  const solve = await removeSolve(id);
  if (solve) pushUndo(t.undo.deleted(formatSolve(solve.timeMs, solve.penalty)), () => restoreSolve(solve));
}

export async function deleteLastSolve(): Promise<void> {
  const last = solvesStore.get().solves.at(-1);
  if (last) await deleteSolve(last.id);
}

async function writeSolve(id: number, change: Partial<Pick<Solve, 'penalty' | 'comment'>>): Promise<void> {
  setSolves(solvesStore.get().solves.map((s) => (s.id === id ? { ...s, ...change } : s)));
  await db.solves.update(id, change);
}

export async function setPenalty(id: number, penalty: Penalty): Promise<void> {
  const solve = solvesStore.get().solves.find((s) => s.id === id);
  if (!solve || solve.penalty === penalty) return;
  const previous = solve.penalty;
  await writeSolve(id, { penalty });
  pushUndo(t.undo.penalty(formatSolve(solve.timeMs, penalty)), () => writeSolve(id, { penalty: previous }));
}

export async function setLastPenalty(penalty: Penalty): Promise<void> {
  const last = solvesStore.get().solves.at(-1);
  if (last) await setPenalty(last.id, penalty);
}

export async function setComment(id: number, comment: string): Promise<void> {
  const solve = solvesStore.get().solves.find((s) => s.id === id);
  if (!solve || (solve.comment ?? '') === comment) return;
  await writeSolve(id, { comment: comment || undefined });
}

export async function undo(): Promise<void> {
  await undoStack.undo();
  patch({ undoLabel: null });
}

export function dismissUndo(): void {
  patch({ undoLabel: null });
}

// ---------- data ----------

export async function importData(sessions: ops.ImportedSession[]): Promise<{ sessions: number; solves: number }> {
  const result = await ops.importSessions(db, sessions);
  await refreshSessions();
  const current = solvesStore.get().currentSessionId;
  if (current !== null) await selectSession(current);
  return result;
}

export async function clearAllData(): Promise<void> {
  await ops.clearAll(db);
  storage.set(CURRENT_KEY, '');
  await initSolves();
}

/** Jen pro vývoj: vygeneruje testovací solvy do aktuální session. */
export async function generateTestSolves(count: number): Promise<void> {
  const sessionId = solvesStore.get().currentSessionId;
  if (sessionId === null) return;
  const last = solvesStore.get().solves.at(-1)?.date ?? Date.now() - count * 30_000;
  const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
  const suffix = ['', "'", '2'];
  const rand = (n: number) => Math.floor(Math.random() * n);
  const solves = Array.from({ length: count }, (_, i): Omit<Solve, 'id'> => {
    // přibližně normální rozdělení kolem 15 s (součet uniformních)
    const base = 15_000 + (Math.random() + Math.random() + Math.random() - 1.5) * 4000;
    const r = Math.random();
    return {
      sessionId,
      timeMs: Math.max(5000, Math.round(base)),
      penalty: r < 0.02 ? 'DNF' : r < 0.06 ? '+2' : 'OK',
      scramble: Array.from({ length: 20 }, () => moves[rand(6)] + suffix[rand(3)]).join(' '),
      date: last + (i + 1) * 30_000,
    };
  });
  await db.solves.bulkAdd(solves as Solve[]);
  await selectSession(sessionId);
}
