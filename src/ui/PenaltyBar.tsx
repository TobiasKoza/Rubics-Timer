import type { Penalty } from '../core/time';
import { t } from '../i18n/cs';
import { useStore } from '../store/createStore';
import { deleteLastSolve, setLastPenalty, solvesStore } from '../store/solves';

const OPTIONS: { value: Penalty; label: string; key: string }[] = [
  { value: 'OK', label: t.penalty.ok, key: 'Alt+1' },
  { value: '+2', label: t.penalty.plus2, key: 'Alt+2' },
  { value: 'DNF', label: t.penalty.dnf, key: 'Alt+3' },
];

/** Rychlé penalizace pro poslední solve. */
export function PenaltyBar() {
  const last = useStore(solvesStore, (s) => s.solves.at(-1));

  return (
    <div className="penalty-bar hide-when-solving" data-empty={!last}>
      <div className="segmented" role="group" aria-label="Penalizace">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            aria-pressed={last?.penalty === o.value}
            disabled={!last}
            title={o.key}
            onClick={(e) => {
              e.currentTarget.blur();
              void setLastPenalty(o.value);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button
        className="ghost-button danger"
        disabled={!last}
        title="Alt+Delete"
        onClick={(e) => {
          e.currentTarget.blur();
          void deleteLastSolve();
        }}
      >
        {t.actions.deleteLast}
      </button>
    </div>
  );
}
