import { formatSolve, formatTime, type Penalty } from '../core/time';
import {
  INSPECTION_DNF_MS,
  INSPECTION_MS,
  initialTimerState,
  transition,
  type TimerConfig,
  type TimerEvent,
  type TimerState,
} from '../core/timerMachine';
import { createStore } from '../store/createStore';
import type { InspectionAlert } from '../store/settings';
import { inspectionAlert, unlockAudio } from './alerts';

/**
 * Hrubá fáze pro React. Mění se jen na začátku a konci solvu/inspekce,
 * takže během solvu se React vůbec nepřekresluje – číslice píše přímo rAF smyčka.
 */
export type TimerPhase = 'idle' | 'inspecting' | 'running';

export interface SolveResult {
  timeMs: number;
  penalty: Penalty;
  /** Kumulativní konce fází u multi-phase (poslední = timeMs). */
  splits?: number[];
}

interface Options {
  alertMode: InspectionAlert;
  showRunningTime: boolean;
  /** false = časovač neposlouchá vstup (ruční zadávání, otevřený dialog). */
  enabled: boolean;
  /** false = nový solve nejde začít (např. scramble se ještě generuje). */
  canStart: boolean;
}

const ACTIVE: ReadonlySet<TimerState['kind']> = new Set(['holding', 'ready', 'inspecting', 'running']);

export class TimerController {
  readonly phase = createStore<TimerPhase>('idle');
  onSolve: ((result: SolveResult) => void) | null = null;

  private state: TimerState = initialTimerState;
  private config: TimerConfig = { holdMs: 300, inspection: false };
  private options: Options = { alertMode: 'voice', showRunningTime: true, enabled: true, canStart: true };
  private display: HTMLElement | null = null;
  private raf = 0;
  private idleText = formatTime(0);
  private lastText = '';
  private lastVisual = '';
  private lastPhase = '';
  private alerted8 = false;
  private alerted12 = false;
  private pointerDown = false;

  setConfig(config: TimerConfig): void {
    this.config = config;
  }

  setOptions(options: Partial<Options>): void {
    this.options = { ...this.options, ...options };
    if (!this.options.enabled && this.state.kind !== 'idle' && this.state.kind !== 'stopped') {
      this.dispatch({ type: 'cancel' });
    }
  }

  /** Text zobrazený v klidu (poslední čas). Za běhu se ignoruje. */
  setIdleText(text: string): void {
    this.idleText = text;
    if (this.state.kind === 'idle' || this.state.kind === 'stopped') this.render(performance.now());
  }

  get kind(): TimerState['kind'] {
    return this.state.kind;
  }

  dispatch(event: TimerEvent): void {
    const prev = this.state;
    const next = transition(prev, event, this.config);
    if (next === prev) return;
    this.state = next;

    if (next.kind === 'inspecting' && prev.kind === 'arming') {
      this.alerted8 = this.alerted12 = false;
    }
    if (next.kind === 'stopped') {
      this.idleText = formatSolve(next.timeMs, next.penalty);
      this.onSolve?.({ timeMs: next.timeMs, penalty: next.penalty, splits: next.splits });
    }
    this.phase.set(phaseOf(next));
    this.render(performance.now());
    this.ensureLoop();
  }

  /** Připojí displej a dotykovou plochu, vrátí funkci pro odpojení. */
  attach(display: HTMLElement, touchArea: HTMLElement): () => void {
    this.display = display;
    this.lastText = this.lastVisual = this.lastPhase = '';
    this.render(performance.now());

    const onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
    const onKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e);
    const onPointerDownArea = (e: PointerEvent) => this.handlePointerDownArea(e);
    const onPointerDownWindow = (e: PointerEvent) => this.handlePointerDownWindow(e);
    const onPointerUp = (e: PointerEvent) => this.handlePointerUp(e);
    const onBlur = () => this.handleBlur();

    // capture: stop časovače má přednost před ostatními zkratkami
    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    window.addEventListener('pointerdown', onPointerDownWindow, { capture: true });
    window.addEventListener('pointerup', onPointerUp, { capture: true });
    window.addEventListener('pointercancel', onPointerUp, { capture: true });
    window.addEventListener('blur', onBlur);
    touchArea.addEventListener('pointerdown', onPointerDownArea);

    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('keyup', onKeyUp, { capture: true });
      window.removeEventListener('pointerdown', onPointerDownWindow, { capture: true });
      window.removeEventListener('pointerup', onPointerUp, { capture: true });
      window.removeEventListener('pointercancel', onPointerUp, { capture: true });
      window.removeEventListener('blur', onBlur);
      touchArea.removeEventListener('pointerdown', onPointerDownArea);
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.display = null;
    };
  }

  // ---------- vstup ----------

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.options.enabled) return;
    if (this.state.kind === 'running') {
      // libovolná klávesa zastaví časovač
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) this.dispatch({ type: 'press', t: eventTime(e) });
      return;
    }
    if (e.code === 'Escape' && this.state.kind !== 'idle' && this.state.kind !== 'stopped') {
      e.stopImmediatePropagation();
      this.dispatch({ type: 'cancel' });
      return;
    }
    if (e.code !== 'Space' || isEditable(e.target) || e.ctrlKey || e.altKey || e.metaKey) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.repeat || !this.mayPress()) return;
    blurButtons();
    unlockAudio();
    this.dispatch({ type: 'press', t: eventTime(e) });
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (!this.options.enabled || e.code !== 'Space' || isEditable(e.target)) return;
    e.preventDefault();
    this.dispatch({ type: 'release', t: eventTime(e) });
  }

  private handlePointerDownArea(e: PointerEvent): void {
    if (!this.options.enabled || !e.isPrimary || e.button !== 0 || this.state.kind === 'running') return;
    e.preventDefault();
    if (!this.mayPress()) return;
    unlockAudio();
    this.pointerDown = true;
    this.dispatch({ type: 'press', t: eventTime(e) });
  }

  private handlePointerDownWindow(e: PointerEvent): void {
    if (!this.options.enabled || this.state.kind !== 'running' || !e.isPrimary) return;
    e.preventDefault();
    e.stopPropagation();
    this.pointerDown = true;
    this.dispatch({ type: 'press', t: eventTime(e) });
  }

  private handlePointerUp(e: PointerEvent): void {
    if (!this.pointerDown || !e.isPrimary) return;
    this.pointerDown = false;
    if (e.type === 'pointercancel' && this.state.kind === 'ready') {
      this.dispatch({ type: 'cancel' });
      return;
    }
    this.dispatch({ type: 'release', t: eventTime(e) });
  }

  /** Z klidového stavu jde začít jen se scramblem; rozběhnutou inspekci nebrzdíme. */
  private mayPress(): boolean {
    const idle = this.state.kind === 'idle' || this.state.kind === 'stopped';
    return !idle || this.options.canStart;
  }

  /** Okno ztratilo fokus během držení – keyup nepřijde, tak držení zrušíme. */
  private handleBlur(): void {
    this.pointerDown = false;
    if (this.state.kind === 'holding') this.dispatch({ type: 'release', t: performance.now() });
    else if (this.state.kind === 'ready') this.dispatch({ type: 'cancel' });
  }

  // ---------- smyčka a vykreslení ----------

  private ensureLoop(): void {
    if (this.raf || !ACTIVE.has(this.state.kind)) return;
    const loop = () => {
      const now = performance.now();
      if (this.state.kind === 'holding') this.dispatch({ type: 'tick', t: now });
      this.checkAlerts(now);
      this.render(now);
      this.raf = ACTIVE.has(this.state.kind) ? requestAnimationFrame(loop) : 0;
    };
    this.raf = requestAnimationFrame(loop);
  }

  private checkAlerts(now: number): void {
    const inspStart = inspectionStart(this.state);
    if (inspStart === null || this.options.alertMode === 'off') return;
    const elapsed = now - inspStart;
    if (!this.alerted8 && elapsed >= 8000) {
      this.alerted8 = true;
      inspectionAlert(8, this.options.alertMode);
    }
    if (!this.alerted12 && elapsed >= 12000) {
      this.alerted12 = true;
      inspectionAlert(12, this.options.alertMode);
    }
  }

  private render(now: number): void {
    const el = this.display;
    if (!el) return;
    const s = this.state;
    let text: string;
    let visual: string;
    let phase = '';
    switch (s.kind) {
      case 'idle':
      case 'stopped':
        text = this.idleText;
        visual = 'idle';
        break;
      case 'arming':
        text = this.idleText;
        visual = 'holding';
        break;
      case 'inspecting':
        text = inspectionText(now - s.inspStart);
        visual = 'inspecting';
        break;
      case 'holding':
      case 'ready':
        text = s.inspStart !== null ? inspectionText(now - s.inspStart) : formatTime(0);
        visual = s.kind;
        break;
      case 'running':
        text = this.options.showRunningTime ? formatTime(now - s.startAt) : '…';
        visual = 'running';
        if ((this.config.phases ?? 1) > 1) phase = `${s.splits.length + 1}/${this.config.phases}`;
        break;
    }
    // do DOM sahat jen při změně – žádné zbytečné layouty
    if (text !== this.lastText) {
      el.textContent = text;
      this.lastText = text;
    }
    if (visual !== this.lastVisual) {
      el.dataset.state = visual;
      this.lastVisual = visual;
    }
    if (phase !== this.lastPhase) {
      if (phase) el.dataset.phase = phase;
      else delete el.dataset.phase;
      this.lastPhase = phase;
    }
  }
}

function phaseOf(s: TimerState): TimerPhase {
  if (s.kind === 'running') return 'running';
  if (inspectionStart(s) !== null) return 'inspecting';
  return 'idle';
}

function inspectionStart(s: TimerState): number | null {
  if (s.kind === 'inspecting') return s.inspStart;
  if (s.kind === 'holding' || s.kind === 'ready') return s.inspStart;
  return null;
}

function inspectionText(elapsed: number): string {
  if (elapsed > INSPECTION_DNF_MS) return 'DNF';
  if (elapsed > INSPECTION_MS) return '+2';
  return String(Math.ceil((INSPECTION_MS - elapsed) / 1000));
}

/**
 * Přesný čas události. event.timeStamp je ve stejné časové ose jako performance.now()
 * a nezávisí na tom, jak rychle prohlížeč událost doručí. Pro jistotu ho ověříme.
 */
function eventTime(e: Event): number {
  const now = performance.now();
  const ts = e.timeStamp;
  return ts > 0 && ts <= now + 1 && now - ts < 1000 ? ts : now;
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Mezerník na zaměřeném tlačítku by ho „kliknul“ – fokus z tlačítek sundáme. */
function blurButtons(): void {
  const el = document.activeElement;
  if (el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement) el.blur();
}

export const timer = new TimerController();
