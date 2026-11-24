import { lazy, Suspense, useEffect } from 'react';
import { formatSolve, formatTime, type Penalty } from '../core/time';
import { EVENTS, isBlindEvent } from '../scramble/events';
import { useStore } from '../store/createStore';
import { currentScramble, hasScramble, nextScramble, prevScramble, scrambleStore, setScrambleEvent, warmUpScramblers } from '../store/scramble';
import { settingsStore } from '../store/settings';
import {
  addSolve,
  currentSession,
  cycleSession,
  deleteLastSolve,
  initSolves,
  setLastPenalty,
  setPenalty,
  solvesStore,
  switchToEvent,
  undo,
} from '../store/solves';
import { dialogStore, openDialog } from '../store/ui';
import { timer } from '../timer/controller';
import { AverageDialog } from './AverageDialog';
import { Header } from './Header';
import { HelpDialog } from './HelpDialog';
import { ManualInput } from './ManualInput';
import { PenaltyBar } from './PenaltyBar';
import { ScrambleBar } from './ScrambleBar';
import { ScramblePreview } from './ScramblePreview';
import { SessionsDialog } from './SessionsDialog';
import { SettingsDialog } from './SettingsDialog';
import { SolveDialog } from './SolveDialog';
import { SolveList } from './SolveList';
import { StatsPanel } from './StatsPanel';
import { applyTheme, watchSystemTheme } from './theme';
import { TimerDisplay } from './TimerDisplay';
import { Toasts } from './Toasts';

// grafy (uPlot) se stahují až při otevření statistik
const StatsDialog = lazy(() => import('./StatsDialog'));

/** Id solvu změřeného časovačem; klávesy 1/2/3 platí jen pro něj, dokud nezačne další. */
let justTimedSolveId: number | null = null;

export function App() {
  const ready = useStore(solvesStore, (s) => s.ready);
  const phase = useStore(timer.phase);
  const settings = useStore(settingsStore);
  const sessionEvent = useStore(solvesStore, () => currentSession()?.event);
  const lastSolve = useStore(solvesStore, (s) => s.solves.at(-1));
  const dialog = useStore(dialogStore);

  useEffect(() => {
    void initSolves();
  }, []);

  // motiv a velikosti
  useEffect(() => {
    applyTheme(settings);
    return watchSystemTheme(() => applyTheme(settingsStore.get()));
  }, [settings]);

  // scramble pro event aktuální session
  useEffect(() => {
    if (sessionEvent) void setScrambleEvent(sessionEvent);
  }, [sessionEvent]);

  // po startu v klidu zahřát scramblery (aktuální event, pak velké kostky)
  useEffect(() => {
    if (ready) warmUpScramblers([sessionEvent ?? '333', '444', '555']);
    // záměrně jen jednou po načtení dat
  }, [ready]);

  // bez scramblu nejde solve začít; řešeno mimo React (žádné re-rendery)
  useEffect(() => {
    const sync = () => timer.setOptions({ canStart: hasScramble() });
    sync();
    return scrambleStore.subscribe(sync);
  }, []);

  // konfigurace časovače (BLD bez inspekce)
  useEffect(() => {
    const inspection = settings.inspection && !(sessionEvent && isBlindEvent(sessionEvent));
    timer.setConfig({ holdMs: settings.holdMs, inspection, phases: settings.phases });
    timer.setOptions({
      alertMode: settings.inspectionAlert,
      showRunningTime: settings.showRunningTime,
      enabled: settings.inputMode === 'timer' && dialog === null,
    });
  }, [settings, sessionEvent, dialog]);

  // dokončený solve → uložit se scramblem a hned ukázat další scramble
  useEffect(() => {
    timer.onSolve = ({ timeMs, penalty, splits }) => {
      const scramble = currentScramble() ?? '';
      justTimedSolveId = null;
      void addSolve({ timeMs, penalty, scramble, date: Date.now(), ...(splits ? { splits } : {}) }).then((s) => {
        justTimedSolveId = s.id;
      });
      void nextScramble();
    };
    return () => {
      timer.onSolve = null;
    };
  }, []);

  // displej v klidu ukazuje poslední solve
  useEffect(() => {
    timer.setIdleText(lastSolve ? formatSolve(lastSolve.timeMs, lastSolve.penalty) : formatTime(0));
  }, [lastSolve]);

  useShortcuts(dialog !== null);

  return (
    <div className="app" data-solving={phase !== 'idle'} data-focus={settings.focusMode}>
      <Header />
      <main className="main">
        <section className="stage">
          <ScrambleBar />
          {settings.inputMode === 'timer' ? <TimerDisplay /> : <ManualInput />}
          <PenaltyBar />
          {settings.preview !== 'off' && <ScramblePreview mode={settings.preview} />}
        </section>
        <aside className="sidebar hide-when-solving">
          <StatsPanel />
          <SolveList />
        </aside>
      </main>
      {!ready && <div className="loading-overlay" aria-busy="true" />}
      <Toasts />
      {dialog?.kind === 'settings' && <SettingsDialog />}
      {dialog?.kind === 'help' && <HelpDialog />}
      {dialog?.kind === 'sessions' && <SessionsDialog />}
      {dialog?.kind === 'solve' && <SolveDialog key={dialog.solveId} solveId={dialog.solveId} />}
      {dialog?.kind === 'average' && <AverageDialog key={`${dialog.n}-${dialog.end}`} n={dialog.n} end={dialog.end} />}
      {dialog?.kind === 'stats' && (
        <Suspense fallback={null}>
          <StatsDialog />
        </Suspense>
      )}
    </div>
  );
}

const PENALTY_KEYS: Record<string, Penalty> = {
  Digit1: 'OK',
  Numpad1: 'OK',
  Digit2: '+2',
  Numpad2: '+2',
  Digit3: 'DNF',
  Numpad3: 'DNF',
};

/** Zkratky mimo samotný časovač (ten si klávesy během solvu bere sám). Přehled je pod „?“. */
function useShortcuts(dialogOpen: boolean) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialogOpen || timer.phase.get() !== 'idle' || e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      const alt = e.altKey;
      const ctrl = e.ctrlKey || e.metaKey;
      const penalty = PENALTY_KEYS[e.code];

      const act = (fn: () => unknown) => {
        e.preventDefault();
        void fn();
      };

      if (penalty && (alt || ctrl)) return act(() => setLastPenalty(penalty));
      if (penalty && !e.shiftKey) {
        // obyčejné 1/2/3 jen hned po zastavení časovače
        const last = solvesStore.get().solves.at(-1);
        if (timer.kind === 'stopped' && last && last.id === justTimedSolveId) act(() => setPenalty(last.id, penalty));
        return;
      }
      if ((alt || ctrl) && (e.code === 'Delete' || e.code === 'Backspace')) return act(deleteLastSolve);
      if (ctrl && e.code === 'KeyZ') return act(undo);
      if (alt && (e.code === 'ArrowDown' || e.code === 'ArrowUp')) return act(() => cycleSession(e.code === 'ArrowDown' ? 1 : -1));
      if (e.shiftKey && (e.code === 'ArrowDown' || e.code === 'ArrowUp')) {
        return act(() => {
          const current = currentSession()?.event ?? '333';
          const i = EVENTS.findIndex((ev) => ev.id === current);
          const next = EVENTS[(i + (e.code === 'ArrowDown' ? 1 : -1) + EVENTS.length) % EVENTS.length];
          return switchToEvent(next.id);
        });
      }
      if (alt || ctrl) return;
      if (e.code === 'ArrowRight') return act(nextScramble);
      if (e.code === 'ArrowLeft') return act(prevScramble);
      if (e.key === '?') return act(() => openDialog({ kind: 'help' }));
      if (e.key === 's' || e.key === 'S') return act(() => openDialog({ kind: 'stats' }));
      if (e.key === ',') return act(() => openDialog({ kind: 'settings' }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogOpen]);
}
