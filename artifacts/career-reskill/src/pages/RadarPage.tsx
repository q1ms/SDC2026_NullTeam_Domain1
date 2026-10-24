import { Link } from 'wouter';
import { Activity, ArrowRight, BrainCircuit, ChartNoAxesCombined, RefreshCw, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { useGetCareerEvidence, useGetLiveTrends } from '@workspace/api-client-react';
import { EvidenceList } from '../components/EvidenceList';
import type { CareerProfile } from '../data/catalog';
import { CoverageList } from '../components/CoverageList';
import { useLanguage } from '../i18n/LanguageContext';

type RecentArticleTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ value?: unknown }>;
};

export function RecentArticleTooltip({ active, payload, label }: RecentArticleTooltipProps) {
  const { t } = useLanguage();
  if (!active || !payload?.length) return null;

  const count = Number(payload[0].value);
  if (!Number.isFinite(count)) return null;

  return (
    <div className="trend-tooltip" role="status" data-testid="tooltip-recent-articles">
      <span className="trend-tooltip-label">{label}</span>
      <strong className="trend-tooltip-count">
        {count.toLocaleString()} {t(count === 1 ? "radar.recentArticleFound" : "radar.recentArticlesFound")}
      </strong>
    </div>
  );
}

export function RadarPage({ profile }: { profile: CareerProfile | null }) {
  const { t } = useLanguage();
  const trendsQuery = useGetLiveTrends({
    query: { staleTime: 10 * 60 * 1000, refetchOnMount: 'always' },
  });
  const evidenceQuery = useGetCareerEvidence();
  const trends = trendsQuery.data?.trends ?? [];
  const fetchedAt = trendsQuery.data?.fetchedAt
    ? new Date(trendsQuery.data.fetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <div className="page-content">
      <div className="hero-row fade-in">
        <div>
          <div className="eyebrow">{t('radar.eyebrow')}</div>
          <h1 className="page-title" data-testid="heading-radar-title">{t('radar.title')}</h1>
          <p className="page-subtitle">{t('radar.subtitle')}</p>
        </div>
        {profile
          ? <Link href="/pathway" className="button-primary" data-testid="button-view-pathway">{t('radar.seePathways')} <ArrowRight size={15} /></Link>
          : <Link href="/intake" className="button-primary" data-testid="button-build-profile">{t('radar.buildProfile')} <ArrowRight size={15} /></Link>}
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
          <h2>{t('radar.emptyTitle')}</h2>
          <p>{t('radar.emptyBody')}</p>
          <Link href="/intake" className="button-primary" data-testid="link-empty-intake">{t('pathway.createProfile')} <ArrowRight size={15} /></Link>
        </div>
      )}

      <div className="sample-banner live-banner fade-in delay-1" data-testid="notice-live-data">
        <Activity size={15} />
        <span>
          <strong>{t('radar.liveCoverage')}</strong> {t('radar.liveFallback').replace('{refreshedAt}', fetchedAt ? ` · refreshed at ${fetchedAt}` : '')}
        </span>
      </div>

      <section className="section-card trend-card fade-in delay-2" aria-labelledby="trend-title">
        <div className="card-head">
          <div><h2 className="card-title" id="trend-title">{t('radar.chartTitle')}</h2><p className="card-description">{t('radar.chartDescription')}</p></div>
          <div className="legend"><span className="legend-item"><i className="legend-dot" />{t('radar.newsMentions')}</span></div>
        </div>
        {trendsQuery.isLoading && <div className="trend-state" role="status" data-testid="status-trends-loading">{t('radar.loadingTopics')}</div>}
        {trendsQuery.isError && (
          <div className="trend-error" role="alert" data-testid="status-trends-error">
            <span>{t('radar.noFeed')}</span>
            <button type="button" className="button-quiet" onClick={() => { void trendsQuery.refetch(); }} data-testid="button-retry-trends">
              <RefreshCw size={14} /> {t('radar.retry')}
            </button>
          </div>
        )}
        {trends.length > 0 && (
          <>
            <div className="chart-wrap" data-testid="chart-skill-trends">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} layout="vertical" margin={{ top: 4, right: 22, bottom: 0, left: 12 }} barCategoryGap={11}>
                  <defs>
                    <linearGradient id="trend-bar-gradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#216c64" />
                      <stop offset="100%" stopColor="#72c7b5" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid horizontal={false} vertical stroke="hsl(var(--border))" strokeDasharray="3 5" strokeOpacity={0.16} />
                  <XAxis type="number" domain={[0, 'dataMax + 1']} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <YAxis type="category" dataKey="topic" width={190} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} />
                  <Tooltip cursor={{ fill: 'rgba(114,199,181,.07)' }} content={<RecentArticleTooltip />} />
                  <Bar dataKey="mentions" fill="url(#trend-bar-gradient)" radius={[0, 7, 7, 0]} maxBarSize={18} animationBegin={0} animationDuration={950} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-note">{t('radar.chartNote')}</div>
          </>
        )}
      </section>

      <div className="lower-grid fade-in delay-2">
        <section className="section-card category-card">
          <div className="card-head"><div><h2 className="card-title">{t('radar.coverage')}</h2><p className="card-description">{t('radar.coverageDescription')}</p></div><TrendingUp size={18} color="#458173" /></div>
          {trends.length > 0 ? (
            <CoverageList articles={trends} />
          ) : trendsQuery.isLoading ? (
            <div className="trend-state" role="status">{t('radar.loadingArticles')}</div>
          ) : (
            <div className="trend-state">{t('radar.articlesUnavailable')}</div>
          )}
        </section>
        <section className="section-card signals-card">
          <div className="card-head"><div><h2 className="card-title">{t('radar.steady')}</h2><p className="card-description">{t('radar.steadyDescription')}</p></div></div>
          <Signal icon={<BrainCircuit size={16} />} title={t('radar.learningAgility')} copy={t('radar.learningAgilityBody')} />
          <Signal icon={<ShieldCheck size={16} />} title={t('radar.humanJudgment')} copy={t('radar.humanJudgmentBody')} />
          <Signal icon={<ChartNoAxesCombined size={16} />} title={t('radar.domainInsight')} copy={t('radar.domainInsightBody')} />
        </section>
      </div>
      <section className="section-card fade-in delay-2" style={{ padding: 20, marginTop: 17 }} data-testid="card-career-evidence">
        <div className="card-head">
          <div>
            <h2 className="card-title">{t('radar.evidence')}</h2>
            <p className="card-description">{t('radar.evidenceDescription')}</p>
            <p className="card-description">
              {evidenceQuery.data ? `Snapshot checked ${new Date(evidenceQuery.data.fetchedAt).toLocaleString()} · ${evidenceQuery.data.newsStatus}` : t('radar.evidenceFallback')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/pathway" className="button-quiet" data-testid="link-radar-pathway">{profile ? t('radar.seePathways') : t('pathway.build')}</Link>
            <Link href="/pathway?demo=1" className="button-quiet" data-testid="link-radar-demo">{t('pathway.sampleDemo')}</Link>
          </div>
        </div>
        {evidenceQuery.isLoading && <div className="trend-state" role="status" data-testid="status-evidence-loading">{t('radar.loadingEvidence')}</div>}
        {evidenceQuery.isError && (
          <div className="trend-error" role="alert" data-testid="status-evidence-error">
            <span>{t('radar.evidenceError')}</span>
            <button type="button" className="button-quiet" onClick={() => { void evidenceQuery.refetch(); }} data-testid="button-retry-evidence"><RefreshCw size={14} /> Try again</button>
          </div>
        )}
        {evidenceQuery.data && <EvidenceList signals={evidenceQuery.data.signals} />}
      </section>
      <div className="footer-note" data-testid="text-radar-footer">{t('radar.footer')}</div>
    </div>
  );
}

function Signal({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return <div className="signal-item"><div className="signal-icon">{icon}</div><div className="signal-copy"><strong>{title}</strong><span>{copy}</span></div></div>;
}

function CompassIcon() {
  return <Activity size={24} />;
}
