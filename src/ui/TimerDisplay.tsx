import { useEffect, useRef } from 'react';
import { t } from '../i18n/cs';
import { useStore } from '../store/createStore';
import { settingsStore } from '../store/settings';
import { timer } from '../timer/controller';

/**
 * Displej časovače. React ho vykreslí jednou; číslice a barvy pak mění
 * přímo TimerController (rAF + data-state), bez re-renderů.
 */
export function TimerDisplay() {
  const area = useRef<HTMLDivElement>(null);
  const digits = useRef<HTMLDivElement>(null);
  const inspection = useStore(settingsStore, (s) => s.inspection);

  useEffect(() => timer.attach(digits.current!, area.current!), []);

  return (
    <div className="timer-area" ref={area}>
      <div className="timer-digits" ref={digits} data-state="idle" />
      <p className="timer-hint hide-when-solving">{inspection ? t.timer.inspectionHint : t.timer.holdHint}</p>
    </div>
  );
}
