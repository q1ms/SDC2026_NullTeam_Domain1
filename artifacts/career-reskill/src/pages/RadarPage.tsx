import { Link } from 'wouter';
import { Activity, ArrowRight, BrainCircuit, ChartNoAxesCombined, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, Cell } from 'recharts';
import type { CareerProfile, SkillTrend } from '../data/catalog';
import { TREND_CATALOG } from '../data/catalog';

const COLORS = ['#36796e', '#578f7f', '#729f89', '#8cb197', '#a9c1a0', '#c7c798', '#d8c795'];

export function RadarPage({ profile }: { profile: CareerProfile | null }) {
  const trends = [...TREND_CATALOG].sort((a, b) => b.growth - a.growth);
  return (
    <div className="page-content">
      <div className="hero-row fade-in">
        <div>
          <div className="eyebrow">Future skills radar · 2025–2028</div>
          <h1 className="page-title">A clearer view of<br />what’s changing.</h1>
          <p className="page-subtitle">A grounded look at capabilities gaining momentum—and a practical way to connect them to the work you already know.</p>
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

      <div className="sample-banner fade-in delay-1" data-testid="notice-sample-data">
        <Activity size={15} /><span><strong>Illustrative sample data.</strong> Trend values below are examples for exploration, not live labor-market data or forecasts.</span>
      </div>

      <section className="section-card trend-card fade-in delay-2" aria-labelledby="trend-title">
        <div className="card-head">
          <div><h2 className="card-title" id="trend-title">Skills gaining momentum</h2><p className="card-description">Illustrative relative growth signal by capability</p></div>
          <div className="legend"><span className="legend-item"><i className="legend-dot" />Future-facing skill</span></div>
        </div>
        <div className="chart-wrap" data-testid="chart-skill-trends">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trends} layout="vertical" margin={{ top: 4, right: 22, bottom: 0, left: 12 }} barCategoryGap={11}>
              <CartesianGrid horizontal={false} stroke="#e9e5d9" />
              <XAxis type="number" domain={[0, 45]} tickLine={false} axisLine={false} tick={{ fill: '#758078', fontSize: 10 }} tickFormatter={(value) => `${value}%`} />
              <YAxis type="category" dataKey="name" width={175} tickLine={false} axisLine={false} tick={{ fill: '#344643', fontSize: 11 }} />
              <Tooltip cursor={{ fill: 'rgba(59,112,98,.06)' }} content={({ active, payload }) => active && payload?.length ? <div style={{ border: '1px solid #ddd8cb', background: '#fffdf7', borderRadius: 8, padding: '10px 12px', boxShadow: '0 8px 22px #3344331a', fontSize: 11 }}><strong>{payload[0].payload.name as string}</strong><div style={{ marginTop: 5, color: '#39786c' }}>Sample growth signal: +{payload[0].value}%</div><div style={{ marginTop: 3, color: '#788179' }}>{payload[0].payload.demand as string} illustrative demand</div></div> : null} />
              <Bar dataKey="growth" radius={[0, 4, 4, 0]} maxBarSize={17} animationDuration={850}>
                {trends.map((trend: SkillTrend, index) => <Cell key={trend.name} fill={COLORS[index % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-note">Relative sample growth signal · Source: Northstar illustrative catalog · Not a market forecast</div>
      </section>

      <div className="lower-grid fade-in delay-2">
        <section className="section-card category-card">
          <div className="card-head"><div><h2 className="card-title">Signals worth understanding</h2><p className="card-description">Skills with practical applications across industries</p></div><TrendingUp size={18} color="#458173" /></div>
          <div className="trend-list">
            {trends.slice(0, 5).map((trend, index) => (
              <div className="trend-row" key={trend.name} data-testid={`row-skill-trend-${index}`}>
                <span className="trend-name" data-testid={`text-skill-name-${index}`}>{trend.name}</span>
                <div className="bar-track" aria-label={`${trend.name} sample growth ${trend.growth}%`}><div className="bar-fill" style={{ width: `${trend.growth * 2}%`, animationDelay: `${index * 70}ms` }} /></div>
                <span className="growth-value" data-testid={`text-skill-growth-${index}`}>+{trend.growth}%</span>
                <span className="demand-pill">{trend.demand}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="section-card signals-card">
          <div className="card-head"><div><h2 className="card-title">What holds steady</h2><p className="card-description">Skills that travel with you</p></div></div>
          <Signal icon={<BrainCircuit size={16} />} title="Learning agility" copy="The ability to learn, unlearn, and apply expertise in a new context." />
          <Signal icon={<ShieldCheck size={16} />} title="Human judgment" copy="Context, trust, and accountability matter more as tools get more capable." />
          <Signal icon={<ChartNoAxesCombined size={16} />} title="Domain insight" copy="Your knowledge of how work really gets done is a valuable advantage." />
        </section>
      </div>
      <div className="footer-note" data-testid="text-radar-footer">Use the radar as a conversation starter—not a prediction. Your experience is the starting point.</div>
    </div>
  );
}

function Signal({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return <div className="signal-item"><div className="signal-icon">{icon}</div><div className="signal-copy"><strong>{title}</strong><span>{copy}</span></div></div>;
}

function CompassIcon() {
  return <Activity size={24} />;
}
