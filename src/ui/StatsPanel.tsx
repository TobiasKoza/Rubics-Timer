import { useMemo } from 'react';
import { bestSingle, currentAverage } from '../core/stats';
import { effectiveTime, formatTime } from '../core/time';
import { t } from '../i18n/cs';
import { useStore } from '../store/createStore';
import { solvesStore } from '../store/solves';

const ROWS = [
  { label: 'mo3', n: 3, kind: 'mo' },
  { label: 'ao5', n: 5, kind: 'ao' },
  { label: 'ao12', n: 12, kind: 'ao' },
  { label: 'ao100', n: 100, kind: 'ao' },
] as const;

export function StatsPanel() {
  const solves = useStore(solvesStore, (s) => s.solves);

  // přepočítá se jen při změně pole solvů, ne během solvu
  const stats = useMemo(() => {
    const times = solves.map((s) => effectiveTime(s.timeMs, s.penalty));
    return {
      count: solves.length,
      best: bestSingle(times),
      last: times.at(-1) ?? null,
      rows: ROWS.map((r) => ({ label: r.label, value: currentAverage(times, r.n, r.kind) })),
    };
  }, [solves]);

  return (
    <section className="stats card" aria-label="Statistiky">
      <dl className="stats-grid">
        <div className="stat stat-best">
          <dt>
            {t.stats.single} <span className="muted">({t.stats.best})</span>
          </dt>
          <dd>{show(stats.best)}</dd>
        </div>
        {stats.rows.map((r) => (
          <div className="stat" key={r.label}>
            <dt>{r.label}</dt>
            <dd>{show(r.value)}</dd>
          </div>
        ))}
        <div className="stat">
          <dt>{t.stats.count}</dt>
          <dd>{stats.count}</dd>
        </div>
      </dl>
    </section>
  );
}

function show(ms: number | null): string {
  return ms === null ? '–' : formatTime(ms);
}
