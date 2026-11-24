import { useEffect } from 'react';
import { t } from '../i18n/cs';
import { useStore } from '../store/createStore';
import { dismissUndo, solvesStore, undo } from '../store/solves';
import { timer } from '../timer/controller';

const HIDE_AFTER_MS = 5000;

/** Toast s tlačítkem „Zpět“ po smazání nebo změně penalizace. */
export function UndoToast() {
  const label = useStore(solvesStore, (s) => s.undoLabel);
  const phase = useStore(timer.phase);
  const visible = label !== null && phase === 'idle';

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(dismissUndo, HIDE_AFTER_MS);
    return () => clearTimeout(id);
  }, [visible, label]);

  if (!visible) return null;
  return (
    <div className="toast" role="status">
      <span>{label}</span>
      <button
        className="link-button"
        onClick={(e) => {
          e.currentTarget.blur();
          void undo();
        }}
      >
        {t.actions.undo}
      </button>
    </div>
  );
}
