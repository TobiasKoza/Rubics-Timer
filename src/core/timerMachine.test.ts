import { describe, expect, it } from 'vitest';
import {
  initialTimerState,
  inspectionPenalty,
  transition,
  type TimerConfig,
  type TimerEvent,
  type TimerState,
} from './timerMachine';

const noInsp: TimerConfig = { holdMs: 300, inspection: false };
const insp: TimerConfig = { holdMs: 300, inspection: true };

function run(events: TimerEvent[], config: TimerConfig, from: TimerState = initialTimerState): TimerState {
  return events.reduce((s, e) => transition(s, e, config), from);
}

describe('časovač bez inspekce', () => {
  it('celý cyklus: podržet → ready → pustit → stop', () => {
    let s = run([{ type: 'press', t: 0 }], noInsp);
    expect(s.kind).toBe('holding');
    s = transition(s, { type: 'tick', t: 299 }, noInsp);
    expect(s.kind).toBe('holding');
    s = transition(s, { type: 'tick', t: 300 }, noInsp);
    expect(s.kind).toBe('ready');
    s = transition(s, { type: 'release', t: 1000 }, noInsp);
    expect(s).toEqual({ kind: 'running', startAt: 1000, penalty: 'OK', splits: [] });
    s = transition(s, { type: 'press', t: 13345 }, noInsp);
    expect(s).toEqual({ kind: 'stopped', timeMs: 12345, penalty: 'OK' });
  });

  it('příliš krátké podržení vrátí do idle', () => {
    const s = run([{ type: 'press', t: 0 }, { type: 'tick', t: 100 }, { type: 'release', t: 150 }], noInsp);
    expect(s.kind).toBe('idle');
  });

  it('holdMs = 0 přejde rovnou do ready', () => {
    const s = run([{ type: 'press', t: 0 }], { holdMs: 0, inspection: false });
    expect(s.kind).toBe('ready');
  });

  it('puštění klávesy po stopu nic nespustí, další stisk začne nový cyklus', () => {
    let s: TimerState = { kind: 'stopped', timeMs: 5000, penalty: 'OK' };
    s = transition(s, { type: 'release', t: 10 }, noInsp);
    expect(s.kind).toBe('stopped');
    s = transition(s, { type: 'press', t: 20 }, noInsp);
    expect(s.kind).toBe('holding');
  });

  it('za běhu ignoruje release a tick', () => {
    const running: TimerState = { kind: 'running', startAt: 0, penalty: 'OK', splits: [] };
    expect(transition(running, { type: 'release', t: 5 }, noInsp)).toBe(running);
    expect(transition(running, { type: 'tick', t: 5 }, noInsp)).toBe(running);
  });

  it('cancel zruší běžící solve, ale ne výsledek', () => {
    expect(transition({ kind: 'running', startAt: 0, penalty: 'OK', splits: [] }, { type: 'cancel' }, noInsp).kind).toBe('idle');
    const stopped: TimerState = { kind: 'stopped', timeMs: 1, penalty: 'OK' };
    expect(transition(stopped, { type: 'cancel' }, noInsp)).toBe(stopped);
  });
});

describe('časovač s inspekcí', () => {
  const startInspection: TimerEvent[] = [
    { type: 'press', t: 0 },
    { type: 'release', t: 100 },
  ];

  it('stisk a puštění spustí inspekci', () => {
    expect(run([{ type: 'press', t: 0 }], insp).kind).toBe('arming');
    expect(run(startInspection, insp)).toEqual({ kind: 'inspecting', inspStart: 100 });
  });

  it('krátké podržení během inspekce vrátí do inspekce se stejným začátkem', () => {
    const s = run([...startInspection, { type: 'press', t: 5000 }, { type: 'release', t: 5100 }], insp);
    expect(s).toEqual({ kind: 'inspecting', inspStart: 100 });
  });

  const solveAt = (releaseT: number) =>
    run(
      [...startInspection, { type: 'press', t: releaseT - 400 }, { type: 'tick', t: releaseT - 50 }, { type: 'release', t: releaseT }],
      insp,
    );

  it('start do 15 s je bez penalizace', () => {
    expect(solveAt(100 + 15_000)).toMatchObject({ kind: 'running', penalty: 'OK' });
  });
  it('start mezi 15 a 17 s = +2', () => {
    expect(solveAt(100 + 15_001)).toMatchObject({ kind: 'running', penalty: '+2' });
    expect(solveAt(100 + 17_000)).toMatchObject({ kind: 'running', penalty: '+2' });
  });
  it('start po 17 s = DNF', () => {
    expect(solveAt(100 + 17_001)).toMatchObject({ kind: 'running', penalty: 'DNF' });
  });
  it('penalizace z inspekce se přenese do výsledku', () => {
    const s = transition(solveAt(100 + 16_000), { type: 'press', t: 100 + 26_000 }, insp);
    expect(s).toEqual({ kind: 'stopped', timeMs: 10_000, penalty: '+2' });
  });
  it('Esc během inspekce ji zruší', () => {
    expect(run([...startInspection, { type: 'cancel' }], insp).kind).toBe('idle');
  });
});

describe('inspectionPenalty', () => {
  it.each([
    [0, 'OK'],
    [15_000, 'OK'],
    [15_001, '+2'],
    [17_000, '+2'],
    [17_001, 'DNF'],
  ] as const)('%i ms → %s', (ms, p) => {
    expect(inspectionPenalty(ms)).toBe(p);
  });
});

describe('multi-phase (splity)', () => {
  const cfg: TimerConfig = { holdMs: 0, inspection: false, phases: 3 };
  const start: TimerEvent[] = [
    { type: 'press', t: 0 },
    { type: 'release', t: 1000 },
  ];

  it('každý stisk kromě posledního uloží mezičas', () => {
    let s = run([...start, { type: 'press', t: 3000 }], cfg);
    expect(s).toMatchObject({ kind: 'running', splits: [2000] });
    s = transition(s, { type: 'press', t: 8000 }, cfg);
    expect(s).toMatchObject({ kind: 'running', splits: [2000, 7000] });
    s = transition(s, { type: 'press', t: 11_500 }, cfg);
    expect(s).toEqual({ kind: 'stopped', timeMs: 10_500, penalty: 'OK', splits: [2000, 7000, 10_500] });
  });

  it('jedna fáze = žádné splity ve výsledku', () => {
    const s = run([...start, { type: 'press', t: 3000 }], { ...cfg, phases: 1 });
    expect(s).toEqual({ kind: 'stopped', timeMs: 2000, penalty: 'OK' });
  });
});
