import { useEffect, useMemo, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { histogram, type Bin } from '../core/histogram';
import { effectiveTime, formatTime } from '../core/time';
import { t } from '../i18n/cs';
import { useStore } from '../store/createStore';
import { settingsStore } from '../store/settings';
import { solvesStore, statsStore } from '../store/solves';
import { openDialog } from '../store/ui';
import { Dialog } from './Dialog';

/**
 * Statistiky a grafy. Načítá se líně (uPlot je jen tady) a kreslí se jen
 * při otevřeném dialogu – časovač je mezitím vypnutý, takže nic nepřekáží solvu.
 */
export default function StatsDialog() {
  const solves = useStore(solvesStore, (s) => s.solves);
  const { summary } = useStore(statsStore);
  const theme = useStore(settingsStore, (s) => `${s.theme}-${s.accent}`);
  const times = useMemo(() => solves.map((s) => effectiveTime(s.timeMs, s.penalty)), [solves]);
  const bins = useMemo(() => histogram(times), [times]);

  return (
    <Dialog title={t.stats.title} wide>
      <section className="stats-overview">
        <table className="stats-table wide">
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
              <td className="best">{show(summary.best)}</td>
            </tr>
            {summary.averages.map((a) => (
              <tr key={a.key}>
                <th scope="row">{a.key}</th>
                <td>
                  {a.current === null ? '–' : (
                    <button className="cell-button" onClick={() => openDialog({ kind: 'average', n: a.n, end: summary.count - 1 })}>
                      {show(a.current)}
                    </button>
                  )}
                </td>
                <td className="best">
                  {a.best === null || a.bestEnd === null ? '–' : (
                    <button className="cell-button" onClick={() => openDialog({ kind: 'average', n: a.n, end: a.bestEnd! })}>
                      {show(a.best)}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="stats-footer vertical">
          <div>
            <dt>{t.stats.count}</dt>
            <dd>{summary.count}</dd>
          </div>
          <div>
            <dt>{t.stats.dnfs}</dt>
            <dd>{summary.dnfCount}</dd>
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

      <h3 className="section-title">{t.stats.chart}</h3>
      {times.length < 2 ? (
        <p className="muted">{t.stats.chartEmpty}</p>
      ) : (
        <TimeChart key={theme} times={times} ao5={summary.rolling.ao5} ao12={summary.rolling.ao12} />
      )}

      <h3 className="section-title">{t.stats.histogram}</h3>
      {bins.length === 0 ? <p className="muted">{t.stats.chartEmpty}</p> : <Histogram bins={bins} />}
    </Dialog>
  );
}

function show(ms: number | null): string {
  return ms === null ? '–' : formatTime(ms);
}

const finite = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? null : v);

function TimeChart({ times, ao5, ao12 }: { times: number[]; ao5: (number | null)[]; ao12: (number | null)[] }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current!;
    const css = getComputedStyle(document.documentElement);
    const color = (name: string) => css.getPropertyValue(name).trim();
    const xs = times.map((_, i) => i + 1);
    const data: uPlot.AlignedData = [xs, times.map(finite), ao5.map(finite), ao12.map(finite)];
    const fmt = (_u: uPlot, v: number | null) => (v == null ? '–' : formatTime(v));
    const axis = {
      stroke: color('--muted'),
      grid: { stroke: color('--grid'), width: 1 },
      ticks: { show: false },
      font: '12px system-ui, sans-serif',
    };

    const plot = new uPlot(
      {
        width: el.clientWidth,
        height: 260,
        cursor: { drag: { x: true, y: false }, points: { size: 8 } },
        legend: { live: true },
        scales: { x: { time: false } },
        axes: [
          { ...axis, values: (_u, vals) => vals.map((v) => String(v)) },
          { ...axis, size: 56, values: (_u, vals) => vals.map((v) => formatTime(v, v >= 60_000 ? 0 : 1)) },
        ],
        series: [
          { label: '#', value: (_u, v) => (v == null ? '–' : String(v)) },
          {
            label: t.stats.seriesTime,
            stroke: color('--series-1'),
            width: 0,
            points: { show: true, size: 4, fill: color('--series-1'), stroke: color('--series-1') },
            value: fmt,
          },
          { label: 'ao5', stroke: color('--series-2'), width: 1.5, spanGaps: true, points: { show: false }, value: fmt },
          { label: 'ao12', stroke: color('--series-3'), width: 2.5, spanGaps: true, points: { show: false }, value: fmt },
        ],
      },
      data,
      el,
    );

    const ro = new ResizeObserver(() => plot.setSize({ width: el.clientWidth, height: 260 }));
    ro.observe(el);
    return () => {
      ro.disconnect();
      plot.destroy();
    };
  }, [times, ao5, ao12]);

  return <div className="chart" ref={host} />;
}

function Histogram({ bins }: { bins: Bin[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...bins.map((b) => b.count));
  const W = 640;
  const H = 200;
  const pad = { l: 8, r: 8, t: 20, b: 28 };
  const bw = (W - pad.l - pad.r) / bins.length;
  const decimals = bins[0].to - bins[0].from < 1000 ? 1 : 0;
  const labelEvery = Math.ceil(bins.length / 8);

  return (
    <div className="histogram">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.stats.histogram} onMouseLeave={() => setHover(null)}>
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="hist-baseline" />
        {bins.map((b, i) => {
          const h = max ? ((H - pad.t - pad.b) * b.count) / max : 0;
          const x = pad.l + i * bw;
          return (
            <g key={b.from} onMouseEnter={() => setHover(i)}>
              {/* neviditelný větší cíl pro hover */}
              <rect x={x} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              {b.count > 0 && (
                <path
                  className="hist-bar"
                  data-active={hover === i}
                  d={roundedTop(x + 1, H - pad.b, bw - 2, Math.max(h, 2), Math.min(4, (bw - 2) / 2))}
                />
              )}
              {i % labelEvery === 0 && (
                <text x={x} y={H - 8} className="hist-label">
                  {formatTime(b.from, decimals)}
                </text>
              )}
              {hover === i && (
                <text x={x + bw / 2} y={Math.max(14, H - pad.b - h - 6)} textAnchor="middle" className="hist-value">
                  {b.count}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="muted small hist-caption" aria-live="polite">
        {hover !== null
          ? `${formatTime(bins[hover].from, decimals)} – ${formatTime(bins[hover].to, decimals)}: ${t.stats.histCount(bins[hover].count)}`
          : ' '}
      </p>
    </div>
  );
}

/** Sloupec se zaoblenými horními rohy, ukotvený k základně. */
function roundedTop(x: number, base: number, w: number, h: number, r: number): string {
  const top = base - h;
  const rr = Math.min(r, h);
  return `M${x},${base} V${top + rr} Q${x},${top} ${x + rr},${top} H${x + w - rr} Q${x + w},${top} ${x + w},${top + rr} V${base} Z`;
}
