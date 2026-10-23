import { Link } from 'wouter';
import { Activity, ArrowRight, BrainCircuit, ChartNoAxesCombined, RefreshCw, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, Cell } from 'recharts';
import { useGetLiveTrends } from '@workspace/api-client-react';
import type { CareerProfile } from '../data/catalog';
import { CoverageList } from '../components/CoverageList';

const COLORS = ['#36796e', '#578f7f', '#729f89', '#8cb197', '#a9c1a0', '#c7c798', '#d8c795'];

export function RadarPage({ profile }: { profile: CareerProfile | null }) {
  const trendsQuery = useGetLiveTrends({
    query: { staleTime: 10 * 60 * 1000, refetchOnMount: 'always' },
  });
  const trends = trendsQuery.data?.trends ?? [];
  const fetchedAt = trendsQuery.data?.fetchedAt
    ? new Date(trendsQuery.data.fetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <div className="page-content">
      <div className="hero-row fade-in">
        <div>
          <div className="eyebrow">Live AI topics · recent news</div>
          <h1 className="page-title">A clearer view of<br />what’s changing.</h1>
          <p className="page-subtitle">Five current AI themes extracted from public news coverage, with source articles so you can explore the signal for yourself.</p>
        </div>
        {profile
          ? <Link href="/pathway" className="button-primary" data-testid="button-view-pathway">See your pathways <ArrowRight size={15} /></Link>
          : <Link href="/intake" className="button-primary" data-testid="button-build-profile">Build your profile <ArrowRight size={15} /></Link>}
      </div>

      {profile ? (
        <div className="personal-strip fade-in delay-1" data-testid="status-profile-personalized">
          <span className="meta-chip"><Sparkles size={13} /> Radar is ready for <strong>{profile.currentRole}</strong></span>
          <span className="meta-chip">{profile.yearsExperience} years experience</span>
          <span className="meta-chip">{profile.industry}</span>
        </div>
      ) : (
        <div className="empty-card fade-in delay-1" data-testid="empty-profile-card">
          <div className="empty-mark"><CompassIcon /></div>
          <h2>Start with the experience you already have.</h2>
          <p>Tell us a little about your work, skills, and interests. We’ll connect your strengths to realistic next steps—without asking you to start over.</p>
          <Link href="/intake" className="button-primary" data-testid="link-empty-intake">Create your career profile <ArrowRight size={15} /></Link>
        </div>
      )}

      <div className="sample-banner live-banner fade-in delay-1" data-testid="notice-live-data">
        <Activity size={15} />
        <span>
          <strong>Live news coverage.</strong> Themes and mention counts come from Google News RSS
          {fetchedAt ? ` · refreshed at ${fetchedAt}` : ''}. Coverage is not a labor-market forecast.
        </span>
      </div>

      <section className="section-card trend-card fade-in delay-2" aria-labelledby="trend-title">
        <div className="card-head">
          <div><h2 className="card-title" id="trend-title">AI topics in recent coverage</h2><p className="card-description">Ranked by how many recent feed stories mention each topic</p></div>
          <div className="legend"><span className="legend-item"><i className="legend-dot" />News mentions</span></div>
        </div>
        {trendsQuery.isLoading && <div className="trend-state" role="status" data-testid="status-trends-loading">Fetching current AI news topics…</div>}
        {trendsQuery.isError && (
          <div className="trend-error" role="alert" data-testid="status-trends-error">
            <span>The live news feed could not be loaded. No sample trends are shown.</span>
            <button type="button" className="button-quiet" onClick={() => { void trendsQuery.refetch(); }} data-testid="button-retry-trends">
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        )}
        {trends.length > 0 && (
          <>
            <div className="chart-wrap" data-testid="chart-skill-trends">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} layout="vertical" margin={{ top: 4, right: 22, bottom: 0, left: 12 }} barCategoryGap={11}>
                  <CartesianGrid horizontal={false} stroke="#e9e5d9" />
                  <XAxis type="number" domain={[0, 'dataMax + 1']} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#758078', fontSize: 10 }} />
                  <YAxis type="category" dataKey="topic" width={190} tickLine={false} axisLine={false} tick={{ fill: '#344643', fontSize: 10 }} />
                  <Tooltip cursor={{ fill: 'rgba(59,112,98,.06)' }} formatter={(value) => [`${value} recent stories`, 'Coverage']} />
                  <Bar dataKey="mentions" radius={[0, 4, 4, 0]} maxBarSize={17} animationDuration={850}>
                    {trends.map((trend, index) => <Cell key={trend.topic} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-note">Counts are distinct stories in the feed, not job-demand estimates or forecasts.</div>
          </>
        )}
      </section>

      <div className="lower-grid fade-in delay-2">
        <section className="section-card category-card">
          <div className="card-head"><div><h2 className="card-title">Recent coverage</h2><p className="card-description">Source articles behind the five topics</p></div><TrendingUp size={18} color="#458173" /></div>
          {trends.length > 0 ? (
            <CoverageList articles={trends} />
          ) : trendsQuery.isLoading ? (
            <div className="trend-state" role="status">Loading recent source articles…</div>
          ) : (
            <div className="trend-state">Recent source articles will appear when the feed is available.</div>
          )}
        </section>
        <section className="section-card signals-card">
          <div className="card-head"><div><h2 className="card-title">What holds steady</h2><p className="card-description">Skills that travel with you</p></div></div>
          <Signal icon={<BrainCircuit size={16} />} title="Learning agility" copy="The ability to learn, unlearn, and apply expertise in a new context." />
          <Signal icon={<ShieldCheck size={16} />} title="Human judgment" copy="Context, trust, and accountability matter more as tools get more capable." />
          <Signal icon={<ChartNoAxesCombined size={16} />} title="Domain insight" copy="Your knowledge of how work really gets done is a valuable advantage." />
        </section>
      </div>
      <div className="footer-note" data-testid="text-radar-footer">News coverage can surface emerging topics, but it does not measure hiring demand. Your experience is the starting point.</div>
    </div>
  );
}

function Signal({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return <div className="signal-item"><div className="signal-icon">{icon}</div><div className="signal-copy"><strong>{title}</strong><span>{copy}</span></div></div>;
}

function CompassIcon() {
  return <Activity size={24} />;
}
