import { useEffect, useRef } from 'react';
import { formatSolve, formatTime, type Penalty } from '../core/time';
import { t } from '../i18n/cs';
import { useStore } from '../store/createStore';
import { deleteSolve, setComment, setPenalty, solvesStore, splitCurrentSessionAt } from '../store/solves';
import { closeDialog, showToast } from '../store/ui';
import { copyText, Dialog, Segmented } from './Dialog';

const dateFmt = new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'long', timeStyle: 'medium' });

/** Detail solvu: penalizace, scramble, komentář, splity, smazání. */
export function SolveDialog({ solveId }: { solveId: number }) {
  const solves = useStore(solvesStore, (s) => s.solves);
  const index = solves.findIndex((s) => s.id === solveId);
  const solve = solves[index];
  // komentář se uloží i při zavření dialogu (Esc, klik vedle), kdy blur nepřijde
  const comment = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (comment.current !== null) void setComment(solveId, comment.current.trim());
    },
    [solveId],
  );
  if (!solve) return null;

  const phases = solve.splits?.map((end, i) => end - (i > 0 ? solve.splits![i - 1] : 0));

  return (
    <Dialog title={t.solve.title(index + 1)}>
      <div className="solve-detail">
        <p className="solve-detail-time" data-penalty={solve.penalty}>
          {formatSolve(solve.timeMs, solve.penalty)}
        </p>
        <Segmented<Penalty>
          label={t.penalty.label}
          value={solve.penalty}
          onChange={(p) => void setPenalty(solve.id, p)}
          options={[
            ['OK', t.penalty.ok],
            ['+2', t.penalty.plus2],
            ['DNF', t.penalty.dnf],
          ]}
        />
      </div>

      {phases && (
        <section className="detail-section">
          <h3 className="section-title">{t.solve.splits}</h3>
          <ol className="phase-list">
            {phases.map((d, i) => (
              <li key={i}>
                <span className="muted">{t.solve.phase(i + 1)}</span> <strong>{formatTime(d)}</strong>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="detail-section">
        <h3 className="section-title">
          {t.solve.scramble}
          <button
            className="link-button"
            onClick={async () => (await copyText(solve.scramble)) && showToast(t.actions.copied)}
          >
            {t.actions.copy}
          </button>
        </h3>
        <p className="scramble small-scramble">{solve.scramble || '–'}</p>
      </section>

      <section className="detail-section">
        <h3 className="section-title">{t.solve.date}</h3>
        <p>{dateFmt.format(solve.date)}</p>
      </section>

      <section className="detail-section">
        <label className="section-title" htmlFor="solve-comment">
          {t.solve.comment}
        </label>
        <textarea
          id="solve-comment"
          className="text-input"
          rows={2}
          placeholder={t.solve.commentPlaceholder}
          defaultValue={solve.comment ?? ''}
          onChange={(e) => (comment.current = e.target.value)}
          onBlur={(e) => void setComment(solve.id, e.target.value.trim())}
        />
      </section>

      <div className="dialog-actions">
        <button
          className="button"
          disabled={index === 0}
          onClick={async () => {
            await splitCurrentSessionAt(solve.id);
            closeDialog();
            showToast(t.solve.splitDone);
          }}
        >
          {t.solve.split}
        </button>
        <button
          className="button danger"
          onClick={() => {
            void deleteSolve(solve.id);
            closeDialog();
          }}
        >
          {t.actions.delete}
        </button>
      </div>
    </Dialog>
  );
}
