import { useEffect, useState } from 'react';
import { formatSolve, formatTime } from '../core/time';
import { isBlindEvent } from '../scramble/events';
import { useStore } from '../store/createStore';
import { currentScramble, nextScramble, setScrambleEvent } from '../store/scramble';
import { settingsStore } from '../store/settings';
import {
  addSolve,
  currentSession,
  deleteLastSolve,
  initSolves,
  setLastPenalty,
  solvesStore,
  undo,
} from '../store/solves';
import { timer } from '../timer/controller';
import { Header } from './Header';
import { ManualInput } from './ManualInput';
import { PenaltyBar } from './PenaltyBar';
import { ScrambleBar } from './ScrambleBar';
import { ScramblePreview } from './ScramblePreview';
import { SettingsDialog } from './SettingsDialog';
import { SolveList } from './SolveList';
import { StatsPanel } from './StatsPanel';
import { TimerDisplay } from './TimerDisplay';
import { UndoToast } from './UndoToast';

export function App() {
  const ready = useStore(solvesStore, (s) => s.ready);
  const phase = useStore(timer.phase);
  const settings = useStore(settingsStore);
  const sessionEvent = useStore(solvesStore, () => currentSession()?.event);
  const lastSolve = useStore(solvesStore, (s) => s.solves.at(-1));
  const [settingsOpen, setSettingsOpen] = useState(false);

  // načtení dat při startu
  useEffect(() => {
    void initSolves();
  }, []);

  // scramble pro event aktuální session
  useEffect(() => {
    if (sessionEvent) void setScrambleEvent(sessionEvent);
  }, [sessionEvent]);

  // konfigurace časovače podle nastavení (BLD bez inspekce)
  useEffect(() => {
    const inspection = settings.inspection && !(sessionEvent && isBlindEvent(sessionEvent));
    timer.setConfig({ holdMs: settings.holdMs, inspection });
    timer.setOptions({
      alertMode: settings.inspectionAlert,
      showRunningTime: settings.showRunningTime,
      enabled: settings.inputMode === 'timer' && !settingsOpen,
    });
  }, [settings, sessionEvent, settingsOpen]);

  // dokončený solve → uložit se scramblem a hned ukázat další scramble
  useEffect(() => {
    timer.onSolve = ({ timeMs, penalty }) => {
      const scramble = currentScramble() ?? '';
      void addSolve({ timeMs, penalty, scramble, date: Date.now() });
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

  useGlobalShortcuts(settingsOpen);

  const solving = phase !== 'idle';
  return (
    <div className="app" data-solving={solving} data-focus={settings.focusMode}>
      <Header onOpenSettings={() => setSettingsOpen(true)} />
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
      {!ready && <div className="loading-overlay">…</div>}
      <UndoToast />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

/** Zkratky mimo časovač. Alt (nebo Ctrl) + 1/2/3 = OK/+2/DNF, Alt+Delete = smazat, Ctrl+Z = zpět. */
function useGlobalShortcuts(disabled: boolean) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled || timer.phase.get() !== 'idle') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      const mod = e.altKey || e.ctrlKey || e.metaKey;
      if (!mod) return;
      let handled = true;
      switch (e.code) {
        case 'Digit1':
        case 'Numpad1':
          void setLastPenalty('OK');
          break;
        case 'Digit2':
        case 'Numpad2':
          void setLastPenalty('+2');
          break;
        case 'Digit3':
        case 'Numpad3':
          void setLastPenalty('DNF');
          break;
        case 'Delete':
        case 'Backspace':
          void deleteLastSolve();
          break;
        case 'KeyZ':
          if (e.ctrlKey || e.metaKey) void undo();
          else handled = false;
          break;
        default:
          handled = false;
      }
      if (handled) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled]);
}
