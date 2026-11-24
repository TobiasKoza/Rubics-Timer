import type { Penalty } from './time';

/**
 * Čistý stavový automat časovače – žádné DOM, žádné hodiny.
 * Všechny časy přicházejí z událostí (performance.now / event.timeStamp).
 *
 *  idle ──press──► holding ──(hold ≥ holdMs)──► ready ──release──► running ──press──► stopped
 *    │               └─release (krátce)─► idle                                         │
 *    └─(inspekce) press ► arming ─release─► inspecting ─press─► holding … ready ─release─► running
 */

export interface TimerConfig {
  /** Jak dlouho držet mezerník/dotyk, než je časovač připraven (ms). */
  holdMs: number;
  /** WCA inspekce 15 s. */
  inspection: boolean;
  /** Počet fází (multi-phase / split timing). 1 = běžný solve. */
  phases?: number;
}

export const INSPECTION_MS = 15_000;
export const INSPECTION_DNF_MS = 17_000;

export type TimerState =
  | { kind: 'idle' }
  | { kind: 'arming' }
  | { kind: 'inspecting'; inspStart: number }
  | { kind: 'holding'; pressAt: number; inspStart: number | null }
  | { kind: 'ready'; inspStart: number | null }
  | { kind: 'running'; startAt: number; penalty: Penalty; splits: number[] }
  | { kind: 'stopped'; timeMs: number; penalty: Penalty; splits?: number[] };

export type TimerEvent =
  | { type: 'press'; t: number }
  | { type: 'release'; t: number }
  | { type: 'tick'; t: number }
  | { type: 'cancel' };

export const initialTimerState: TimerState = { kind: 'idle' };

/** Penalizace podle délky inspekce (WCA 10b, A3d1). */
export function inspectionPenalty(elapsedMs: number): Penalty {
  if (elapsedMs > INSPECTION_DNF_MS) return 'DNF';
  if (elapsedMs > INSPECTION_MS) return '+2';
  return 'OK';
}

export function transition(state: TimerState, event: TimerEvent, config: TimerConfig): TimerState {
  if (event.type === 'cancel') {
    // Esc: zrušení probíhajícího solvu nebo inspekce, výsledek se zahodí
    return state.kind === 'stopped' || state.kind === 'idle' ? state : initialTimerState;
  }

  switch (state.kind) {
    case 'idle':
    case 'stopped':
      if (event.type !== 'press') return state;
      if (config.inspection) return { kind: 'arming' };
      return startHolding(event.t, null, config);

    case 'arming':
      if (event.type === 'release') return { kind: 'inspecting', inspStart: event.t };
      return state;

    case 'inspecting':
      if (event.type === 'press') return startHolding(event.t, state.inspStart, config);
      return state;

    case 'holding':
      if (event.type === 'release') {
        return state.inspStart !== null ? { kind: 'inspecting', inspStart: state.inspStart } : initialTimerState;
      }
      if (event.type === 'tick' && event.t - state.pressAt >= config.holdMs) {
        return { kind: 'ready', inspStart: state.inspStart };
      }
      return state;

    case 'ready':
      if (event.type === 'release') {
        const penalty = state.inspStart !== null ? inspectionPenalty(event.t - state.inspStart) : 'OK';
        return { kind: 'running', startAt: event.t, penalty, splits: [] };
      }
      return state;

    case 'running':
      if (event.type === 'press') {
        const elapsed = Math.max(0, Math.round(event.t - state.startAt));
        const phases = Math.max(1, config.phases ?? 1);
        const splits = [...state.splits, elapsed];
        // multi-phase: každý stisk kromě posledního jen uloží mezičas
        if (splits.length < phases) return { ...state, splits };
        return phases > 1
          ? { kind: 'stopped', timeMs: elapsed, penalty: state.penalty, splits }
          : { kind: 'stopped', timeMs: elapsed, penalty: state.penalty };
      }
      return state;
  }
}

function startHolding(t: number, inspStart: number | null, config: TimerConfig): TimerState {
  if (config.holdMs <= 0) return { kind: 'ready', inspStart };
  return { kind: 'holding', pressAt: t, inspStart };
}
