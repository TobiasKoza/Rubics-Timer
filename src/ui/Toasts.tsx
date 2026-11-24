import { useEffect } from 'react';
import { t } from '../i18n/cs';
import { useStore } from '../store/createStore';
import { dismissUndo, solvesStore, undo } from '../store/solves';
import { toastStore } from '../store/ui';
import { timer } from '../timer/controller';

const HIDE_AFTER_MS = 5000;

/** Toasty: „Zpět“ po smazání/změně penalizace a informační hlášky. Během solvu se neukazují. */
export function Toasts() {
  const undoLabel = useStore(solvesStore, (s) => s.undoLabel);
  const toast = useStore(toastStore);
  const phase = useStore(timer.phase);

  useEffect(() => {
    if (!undoLabel) return;
    const id = setTimeout(dismissUndo, HIDE_AFTER_MS);
    return () => clearTimeout(id);
  }, [undoLabel]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => toastStore.set(null), HIDE_AFTER_MS);
    return () => clearTimeout(id);
  }, [toast]);

  if (phase !== 'idle') return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toast && (
        <div className="toast" data-tone={toast.tone} key={toast.id}>
          <span>{toast.text}</span>
        </div>
      )}
      {undoLabel && (
        <div className="toast">
          <span>{undoLabel}</span>
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
      )}
    </div>
  );
}
