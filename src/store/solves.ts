import { formatSolve, type Penalty } from '../core/time';
import { UndoStack } from '../core/undo';
import { db, type NewSolve, type Session, type Solve } from '../db/db';
import { getEvent, type EventId } from '../scramble/events';
import { t } from '../i18n/cs';
import { createStore } from './createStore';

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

const undoStack = new UndoStack();
const CURRENT_KEY = 'rubics-timer:currentSession';

function patch(p: Partial<SolvesState>) {
  solvesStore.set((s) => ({ ...s, ...p }));
}

export function currentSession(): Session | undefined {
  const { sessions, currentSessionId } = solvesStore.get();
  return sessions.find((s) => s.id === currentSessionId);
}

export async function initSolves(): Promise<void> {
  let sessions = await db.sessions.orderBy('order').toArray();
  if (sessions.length === 0) {
    await createSession('333');
    sessions = await db.sessions.orderBy('order').toArray();
  }
  const saved = Number(localStorage.getItem(CURRENT_KEY));
  const current = sessions.find((s) => s.id === saved) ?? sessions[0];
  patch({ sessions });
  await selectSession(current.id);
  patch({ ready: true });
}

async function createSession(event: EventId): Promise<Session> {
  const order = ((await db.sessions.orderBy('order').last())?.order ?? -1) + 1;
  const session: Omit<Session, 'id'> = { name: getEvent(event).name, event, order, createdAt: Date.now() };
  const id = await db.sessions.add(session as Session);
  return { ...session, id };
}

export async function selectSession(id: number): Promise<void> {
  const solves = await db.solves.where('[sessionId+date]').between([id, -Infinity], [id, Infinity]).toArray();
  localStorage.setItem(CURRENT_KEY, String(id));
  undoStack.clear();
  patch({ currentSessionId: id, solves, undoLabel: null });
}

/** Přepne na session daného eventu (první existující, jinak vytvoří novou). */
export async function switchToEvent(event: EventId): Promise<void> {
  let session = solvesStore.get().sessions.find((s) => s.event === event);
  if (!session) {
    session = await createSession(event);
    patch({ sessions: [...solvesStore.get().sessions, session] });
  }
  await selectSession(session.id);
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
  patch({ solves: [...solvesStore.get().solves, solve] });
  pushUndo(
    t.undo.added(formatSolve(solve.timeMs, solve.penalty)),
    async () => void (await removeSolve(id)),
    false,
  );
  return solve;
}

async function removeSolve(id: number): Promise<Solve | undefined> {
  const solve = solvesStore.get().solves.find((s) => s.id === id);
  patch({ solves: solvesStore.get().solves.filter((s) => s.id !== id) });
  await db.solves.delete(id);
  return solve;
}

async function restoreSolve(solve: Solve): Promise<void> {
  await db.solves.put(solve);
  if (solve.sessionId !== solvesStore.get().currentSessionId) return;
  const solves = [...solvesStore.get().solves, solve].sort((a, b) => a.date - b.date);
  patch({ solves });
}

export async function deleteSolve(id: number): Promise<void> {
  const solve = await removeSolve(id);
  if (solve) pushUndo(t.undo.deleted(formatSolve(solve.timeMs, solve.penalty)), () => restoreSolve(solve));
}

export async function deleteLastSolve(): Promise<void> {
  const last = solvesStore.get().solves.at(-1);
  if (last) await deleteSolve(last.id);
}

async function writePenalty(id: number, penalty: Penalty): Promise<void> {
  patch({ solves: solvesStore.get().solves.map((s) => (s.id === id ? { ...s, penalty } : s)) });
  await db.solves.update(id, { penalty });
}

export async function setPenalty(id: number, penalty: Penalty): Promise<void> {
  const solve = solvesStore.get().solves.find((s) => s.id === id);
  if (!solve || solve.penalty === penalty) return;
  const previous = solve.penalty;
  await writePenalty(id, penalty);
  pushUndo(t.undo.penalty(formatSolve(solve.timeMs, penalty)), () => writePenalty(id, previous));
}

export async function setLastPenalty(penalty: Penalty): Promise<void> {
  const last = solvesStore.get().solves.at(-1);
  if (last) await setPenalty(last.id, penalty);
}

export async function undo(): Promise<void> {
  await undoStack.undo();
  patch({ undoLabel: null });
}

export function dismissUndo(): void {
  patch({ undoLabel: null });
}
