import Dexie, { type EntityTable } from 'dexie';
import type { Penalty } from '../core/time';
import type { EventId } from '../scramble/events';

export interface Session {
  id: number;
  name: string;
  event: EventId;
  /** Pořadí v seznamu sessions. */
  order: number;
  createdAt: number;
}

export interface Solve {
  id: number;
  sessionId: number;
  /** Surový čas v ms (bez penalizace). */
  timeMs: number;
  penalty: Penalty;
  scramble: string;
  /** Unix timestamp (ms) dokončení solvu. */
  date: number;
  comment?: string;
}

export type NewSolve = Omit<Solve, 'id'>;

export class TimerDB extends Dexie {
  sessions!: EntityTable<Session, 'id'>;
  solves!: EntityTable<Solve, 'id'>;

  constructor(name = 'rubics-timer') {
    super(name);
    this.version(1).stores({
      sessions: '++id, order',
      solves: '++id, sessionId, [sessionId+date]',
    });
  }
}

export const db = new TimerDB();
