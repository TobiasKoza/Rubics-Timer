import { ScrambleQueue } from '../scramble/queue';
import type { EventId } from '../scramble/events';
import { createStore } from './createStore';

export interface ScrambleState {
  event: EventId;
  /** Historie scramblů v aktuálním eventu (pro „předchozí scramble“). */
  history: string[];
  index: number;
  loading: boolean;
  error: boolean;
}

export const scrambleStore = createStore<ScrambleState>({
  event: '333',
  history: [],
  index: -1,
  loading: false,
  error: false,
});

const queue = new ScrambleQueue();
const HISTORY_LIMIT = 50;
let requestId = 0;

export function currentScramble(): string | null {
  const { history, index } = scrambleStore.get();
  return history[index] ?? null;
}

async function fetchNext(): Promise<void> {
  const { event } = scrambleStore.get();
  const id = ++requestId;
  scrambleStore.set((s) => ({ ...s, loading: true, error: false }));
  try {
    const scramble = await queue.next(event);
    if (id !== requestId) return; // mezitím se přepnul event
    scrambleStore.set((s) => {
      const history = [...s.history, scramble].slice(-HISTORY_LIMIT);
      return { ...s, history, index: history.length - 1, loading: false };
    });
  } catch (err) {
    console.error(err);
    if (id === requestId) scrambleStore.set((s) => ({ ...s, loading: false, error: true }));
  }
}

export function setScrambleEvent(event: EventId): Promise<void> {
  scrambleStore.set({ event, history: [], index: -1, loading: true, error: false });
  return fetchNext();
}

export function nextScramble(): Promise<void> {
  const { history, index } = scrambleStore.get();
  if (index < history.length - 1) {
    scrambleStore.set((s) => ({ ...s, index: s.index + 1 }));
    return Promise.resolve();
  }
  return fetchNext();
}

export function prevScramble(): void {
  scrambleStore.set((s) => (s.index > 0 ? { ...s, index: s.index - 1 } : s));
}
