import { averageCard, averageCardText } from '../core/averageCard';
import { AVERAGES } from '../core/stats';
import { formatSolve, formatTime } from '../core/time';
import { t } from '../i18n/cs';
import { useStore } from '../store/createStore';
import { solvesStore } from '../store/solves';
import { openDialog, showToast } from '../store/ui';
import { copyText, Dialog } from './Dialog';

/** Karta průměru: časy (zahozené v závorkách), scrambly, kopírování jako text. */
export function AverageDialog({ n, end }: { n: number; end: number }) {
  const solves = useStore(solvesStore, (s) => s.solves);
  const win = solves.slice(Math.max(0, end - n + 1), end + 1);
  if (win.length !== n) return null;
  const kind = AVERAGES.find((a) => a.n === n)?.kind ?? 'ao';
  const card = averageCard(win, kind);
  const startIndex = end - n + 1;

  return (
    <Dialog title={t.average.title(card.label)} wide={n > 12}>
      <p className="average-value">
        {card.label}: <strong>{card.value === null ? '–' : formatTime(card.value)}</strong>
      </p>
      <ol className="average-list" start={startIndex + 1}>
        {win.map((s, i) => (
          <li key={s.id}>
            <button className="average-row" onClick={() => openDialog({ kind: 'solve', solveId: s.id })}>
              <span className="solve-index">{startIndex + i + 1}.</span>
              <span className="solve-time" data-excluded={card.excluded[i]}>
                {card.excluded[i] ? `(${formatSolve(s.timeMs, s.penalty)})` : formatSolve(s.timeMs, s.penalty)}
              </span>
              <span className="average-scramble">{s.scramble}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="dialog-actions">
        <button
          className="button primary"
          onClick={async () => (await copyText(averageCardText(win, kind))) && showToast(t.actions.copied)}
        >
          {t.average.copyText}
        </button>
      </div>
    </Dialog>
  );
}
