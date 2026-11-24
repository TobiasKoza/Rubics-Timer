import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { formatSolve } from '../core/time';
import { t } from '../i18n/cs';
import { useStore } from '../store/createStore';
import { solvesStore } from '../store/solves';

const ROW_HEIGHT = 36;
const dateFmt = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Virtualizovaný seznam – v DOM je jen pár viditelných řádků i při 10 000+ solvech. */
export function SolveList() {
  const solves = useStore(solvesStore, (s) => s.solves);
  const scroller = useRef<HTMLDivElement>(null);
  const count = solves.length;

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  return (
    <section className="solve-list card" aria-label={t.list.title}>
      <h2 className="card-title">{t.list.title}</h2>
      {count === 0 ? (
        <p className="muted empty">{t.stats.empty}</p>
      ) : (
        <div className="solve-scroller" ref={scroller}>
          <ol style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((row) => {
              // nejnovější nahoře
              const solve = solves[count - 1 - row.index];
              return (
                <li
                  key={solve.id}
                  className="solve-row"
                  data-penalty={solve.penalty}
                  style={{ transform: `translateY(${row.start}px)`, height: ROW_HEIGHT }}
                  title={solve.scramble}
                >
                  <span className="solve-index">{count - row.index}.</span>
                  <span className="solve-time">{formatSolve(solve.timeMs, solve.penalty)}</span>
                  <span className="solve-date">{dateFmt.format(solve.date)}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
