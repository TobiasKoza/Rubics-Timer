import { formatTime } from '../core/time';
import { t } from '../i18n/cs';
import { useStore } from '../store/createStore';
import { solvesStore, statsStore } from '../store/solves';
import { openDialog } from '../store/ui';

/** Kompaktní tabulka statistik: aktuální a nejlepší single + průměry. */
export function StatsPanel() {
  const { summary } = useStore(statsStore);
  const visible = summary.averages.filter((a) => a.n <= Math.max(12, summary.count));

  return (
    <section className="stats card" aria-label={t.stats.title}>
      <table className="stats-table">
        <thead>
          <tr>
            <th />
            <th>{t.stats.current}</th>
            <th>{t.stats.best}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{t.stats.single}</th>
            <td>{show(summary.last)}</td>
            <td className="best">
              {summary.bestIndex !== null ? (
                <button className="cell-button" onClick={() => openSolve(summary.bestIndex!)}>
                  {show(summary.best)}
                </button>
              ) : (
                '–'
              )}
            </td>
          </tr>
          {visible.map((a) => (
            <tr key={a.key}>
              <th scope="row">{a.key}</th>
              <td>
                <AvgCell value={a.current} n={a.n} end={summary.count - 1} />
              </td>
              <td className="best">
                <AvgCell value={a.best} n={a.n} end={a.bestEnd} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="stats-footer">
        <div>
          <dt>{t.stats.count}</dt>
          <dd>
            {summary.count - summary.dnfCount}/{summary.count}
          </dd>
        </div>
        <div>
          <dt>{t.stats.mean}</dt>
          <dd>{show(summary.mean)}</dd>
        </div>
        <div>
          <dt>{t.stats.sd}</dt>
          <dd>{show(summary.sd)}</dd>
        </div>
      </dl>
    </section>
  );
}

function AvgCell({ value, n, end }: { value: number | null; n: number; end: number | null }) {
  if (value === null || end === null) return <>–</>;
  return (
    <button className="cell-button" title={t.stats.clickHint} onClick={() => openDialog({ kind: 'average', n, end })}>
      {show(value)}
    </button>
  );
}

function openSolve(index: number) {
  const solve = solvesStore.get().solves[index];
  if (solve) openDialog({ kind: 'solve', solveId: solve.id });
}

function show(ms: number | null): string {
  return ms === null ? '–' : formatTime(ms);
}
