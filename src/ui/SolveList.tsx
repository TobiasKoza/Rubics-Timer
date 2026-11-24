import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { formatSolve, formatTime } from '../core/time';
import { t } from '../i18n/cs';
import { useStore } from '../store/createStore';
import { solvesStore, statsStore } from '../store/solves';
import { openDialog } from '../store/ui';

const ROW_HEIGHT = 36;
const dateFmt = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('cs-CZ', { hour: '2-digit', minute: '2-digit' });
const shortDate = (ms: number) => `${dateFmt.format(ms).replace(/\s/g, '')} ${timeFmt.format(ms)}`;

/** Virtualizovaný seznam – v DOM je jen pár viditelných řádků i při 10 000+ solvech. */
export function SolveList() {
  const solves = useStore(solvesStore, (s) => s.solves);
  const ao5 = useStore(statsStore, (s) => s.summary.rolling.ao5);
  const scroller = useRef<HTMLDivElement>(null);
  const count = solves.length;

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    getItemKey: (i) => solves[count - 1 - i]?.id ?? i,
  });

  return (
    <section className="solve-list card" aria-label={t.list.title}>
      <h2 className="card-title">
        <span>{t.list.title}</span>
        <span className="muted">ao5</span>
      </h2>
      {count === 0 ? (
        <p className="muted empty">{t.stats.empty}</p>
      ) : (
        <div className="solve-scroller" ref={scroller}>
          <ol style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((row) => {
              // nejnovější nahoře
              const index = count - 1 - row.index;
              const solve = solves[index];
              const avg = ao5?.[index];
              return (
                <li key={row.key} style={{ transform: `translateY(${row.start}px)`, height: ROW_HEIGHT }}>
                  <button
                    className="solve-row"
                    data-penalty={solve.penalty}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      openDialog({ kind: 'solve', solveId: solve.id });
                    }}
                  >
                    <span className="solve-index">{index + 1}.</span>
                    <span className="solve-time">{formatSolve(solve.timeMs, solve.penalty)}</span>
                    <span className="solve-ao5">{avg == null ? '' : formatTime(avg)}</span>
                    <span className="solve-date">{shortDate(solve.date)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
