import { ArrowDownRight, ArrowRight, TrendingUp } from 'lucide-react';
import type { LiveTrend } from '@workspace/api-client-react';

const GROUPS = {
  rising: { label: 'Emerging / rising coverage', color: '#61A9BD' },
  stable: { label: 'Stable coverage', color: '#979797' },
  cooling: { label: 'Cooling coverage', color: '#E98E2E' },
  unknown: { label: 'Baseline unavailable', color: '#666666' },
} as const;

export function coverageRows(trends: LiveTrend[]) {
  const rows = trends.map((trend) => {
    const counts = trend.coverageMomentum;
    const delta = counts ? counts.recentCount - counts.previousCount : 0;
    const category = !counts?.baselineAvailable ? 'unknown'
      : delta > 0 ? 'rising' : delta < 0 ? 'cooling' : 'stable';
    return { ...trend, delta, category };
  });
  const order = ['rising', 'stable', 'cooling', 'unknown'];
  return rows.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category)
    || b.delta - a.delta || a.topic.localeCompare(b.topic));
}

function windowLabel(fetchedAt: string | undefined) {
  if (!fetchedAt || !Number.isFinite(Date.parse(fetchedAt))) return null;
  const end = Date.parse(fetchedAt);
  const date = (time: number) => new Date(time).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  });
  return `Previous: ${date(end - 14 * 86400000)} – ${date(end - 7 * 86400000)} · Latest: ${date(end - 7 * 86400000)} – ${date(end)} (UTC)`;
}

export function TopicMomentumChart({ trends, fetchedAt }: { trends: LiveTrend[]; fetchedAt?: string }) {
  const rows = coverageRows(trends);
  const leaders = new Set(rows.filter((row) => row.category === 'rising').slice(0, 2).map((row) => row.topic));
  const max = Math.max(1, ...rows.flatMap((row) => [
    row.coverageMomentum?.recentCount ?? 0, row.coverageMomentum?.previousCount ?? 0,
  ]));
  const period = windowLabel(fetchedAt);
  return (
    <div className="momentum-chart" data-testid="chart-skill-trends">
      <div className="momentum-legend" aria-label="Coverage categories">
        {Object.entries(GROUPS).filter(([key]) => rows.some((row) => row.category === key)).map(([key, group]) => (
          <span key={key}><i style={{ background: group.color }} aria-hidden="true" />{group.label}</span>
        ))}
      </div>
      <p className="card-description">Bar length = stories in each seven-day window. Thin muted bar: previous seven days. Colored bar: latest seven days. Both use the same zero-based scale.</p>
      <ul className="momentum-list" aria-label="News coverage momentum by topic">
        {rows.map((row) => {
          const group = GROUPS[row.category as keyof typeof GROUPS];
          const counts = row.coverageMomentum;
          const isLeader = leaders.has(row.topic);
          const change = row.category === 'unknown' ? 'Not enough dated coverage to measure change'
            : row.delta > 0 ? `${row.delta} more ${row.delta === 1 ? 'story' : 'stories'}`
            : row.delta < 0 ? `${Math.abs(row.delta)} fewer ${Math.abs(row.delta) === 1 ? 'story' : 'stories'}`
            : 'No change in story count';
          return (
            <li key={row.topic} className="momentum-row" data-testid="row-topic-momentum" data-category={row.category}>
              <div className="momentum-label">
                <strong>{isLeader && <TrendingUp size={16} color={group.color} aria-label="One of the largest coverage increases" data-testid="icon-top-rising-topic" />}{row.topic}</strong>
                <span className="momentum-badge" style={{ color: group.color, borderColor: group.color }}>{group.label}</span>
              </div>
              {counts ? <>
                <div className="momentum-bars" aria-hidden="true">
                  <div className="momentum-track"><span className="momentum-previous" style={{ width: `${counts.previousCount / max * 100}%` }} /></div>
                  <div className="momentum-track"><span style={{ width: `${counts.recentCount / max * 100}%`, background: group.color }} /></div>
                </div>
                <div className="momentum-detail">
                  <span>{counts.previousCount} previous <ArrowRight size={12} aria-hidden="true" /> {counts.recentCount} latest stories</span>
                  <span>{row.category === 'cooling' && <ArrowDownRight size={13} aria-hidden="true" />}{change}</span>
                </div>
              </> : <p className="card-description">{change}. Refresh to request comparison data.</p>}
              {isLeader && <small className="momentum-leader">Top {leaders.size === 1 ? 'increase' : '2 increases'} in sampled coverage · not hiring demand</small>}
            </li>
          );
        })}
      </ul>
      <div className="chart-note">
        {period && <p>{period}</p>}
        <p>Five topics selected by total feed mentions, then grouped by change in story count. Google News returns a limited, non-exhaustive sample; changing feed composition can affect comparisons. Rising or cooling news coverage does not establish growing or declining hiring demand, skill maturity, or a market forecast.</p>
      </div>
    </div>
  );
}
