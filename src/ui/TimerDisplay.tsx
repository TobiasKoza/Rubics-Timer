import { useEffect, useRef } from 'react';
import { t } from '../i18n/cs';
import { useStore } from '../store/createStore';
import { hasScramble, scrambleStore } from '../store/scramble';
import { settingsStore } from '../store/settings';
import { timer } from '../timer/controller';
import { PbBadge } from './PbBadge';

/**
 * Displej časovače. React ho vykreslí jednou; číslice a barvy pak mění
 * přímo TimerController (rAF + data-state), bez re-renderů.
 */
export function TimerDisplay() {
  const area = useRef<HTMLDivElement>(null);
  const digits = useRef<HTMLDivElement>(null);
  const inspection = useStore(settingsStore, (s) => s.inspection);
  const phases = useStore(settingsStore, (s) => s.phases);
  const ready = useStore(scrambleStore, hasScramble);

  useEffect(() => timer.attach(digits.current!, area.current!), []);

  const hint = !ready
    ? t.timer.waitingScramble
    : phases > 1
      ? t.timer.phasesHint(phases)
      : inspection
        ? t.timer.inspectionHint
        : t.timer.holdHint;

  return (
    <div className="timer-area" ref={area} data-waiting={!ready}>
      <div className="timer-digits" ref={digits} data-state="idle" />
      <p className="timer-hint hide-when-solving">{hint}</p>
      <PbBadge />
    </div>
  );
}
