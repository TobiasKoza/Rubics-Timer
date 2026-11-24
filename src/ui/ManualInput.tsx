import { useState } from 'react';
import { parseTimeInput } from '../core/time';
import { t } from '../i18n/cs';
import { useStore } from '../store/createStore';
import { currentScramble, hasScramble, nextScramble, scrambleStore } from '../store/scramble';
import { addSolve } from '../store/solves';
import { PbBadge } from './PbBadge';

/** Ruční zadávání časů (původní funkce staré aplikace): text + Enter. */
export function ManualInput() {
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  const ready = useStore(scrambleStore, hasScramble);

  function submit() {
    if (!ready) return;
    const parsed = parseTimeInput(value);
    if (!parsed) {
      setInvalid(true);
      return;
    }
    void addSolve({ ...parsed, scramble: currentScramble() ?? '', date: Date.now() });
    void nextScramble();
    setValue('');
    setInvalid(false);
  }

  return (
    <div className="timer-area manual">
      <input
        className="manual-input"
        data-invalid={invalid}
        value={value}
        autoFocus
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        placeholder={t.timer.manualPlaceholder}
        aria-label={t.timer.manualHint}
        aria-invalid={invalid}
        onChange={(e) => {
          setValue(e.target.value);
          setInvalid(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />
      <p className="timer-hint">{!ready ? t.timer.waitingScramble : invalid ? t.timer.manualInvalid : t.timer.manualHint}</p>
      <PbBadge />
    </div>
  );
}
