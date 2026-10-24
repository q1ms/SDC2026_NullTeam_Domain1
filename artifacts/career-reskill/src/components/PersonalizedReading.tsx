import { useGetLiveTrends } from "@workspace/api-client-react";
import { RefreshCw, TrendingUp } from "lucide-react";
import type { CareerProfile } from "../data/catalog";
import { getReadingTerms, selectPersonalizedCoverage } from "../lib/personalized-reading";
import { useLanguage } from "../i18n/LanguageContext";
import { CoverageList } from "./CoverageList";

export function PersonalizedReading({ profile }: { profile: CareerProfile }) {
  const { t } = useLanguage();
  const coverageQuery = useGetLiveTrends({
    query: { staleTime: 10 * 60 * 1000, refetchOnMount: "always" },
  });
  const terms = getReadingTerms(profile);
  const articles = selectPersonalizedCoverage(coverageQuery.data?.trends ?? [], profile);

  return (
    <section className="section-card category-card mt-6 fade-in delay-2" aria-labelledby="personalized-reading-title" data-testid="section-personalized-reading">
      <div className="card-head">
        <div>
          <h2 className="card-title" id="personalized-reading-title">{t("pathway.personalizedReading")}</h2>
          <p className="card-description">{t("pathway.personalizedReadingDescription")}</p>
        </div>
        <TrendingUp size={18} color="#458173" className="shrink-0" />
      </div>
      <div className="flex flex-wrap gap-2 mt-3" aria-label="Profile terms used to match coverage" data-testid="list-reading-profile-terms">
        {terms.map((term) => <span className="meta-chip" key={term}>{term}</span>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
        <p className="card-description" data-testid="text-reading-freshness">
          {coverageQuery.data
            ? `${coverageQuery.data.source} · refreshed ${new Date(coverageQuery.data.fetchedAt).toLocaleString()}`
            : "Live articles retain their original source and publication date."}
        </p>
        <button type="button" className="button-quiet" onClick={() => { void coverageQuery.refetch(); }} disabled={coverageQuery.isFetching} data-testid="button-refresh-personalized-reading">
          <RefreshCw size={14} className={coverageQuery.isFetching ? "animate-spin" : undefined} />
          {coverageQuery.isFetching ? "Refreshing…" : "Refresh coverage"}
        </button>
      </div>
      {coverageQuery.isLoading && <div className="trend-state" role="status" data-testid="status-reading-loading">Finding recent articles that match your profile…</div>}
      {coverageQuery.isError && (
        <div className="trend-error" role="alert" data-testid="status-reading-error">
          Live coverage could not be refreshed. Use Refresh coverage to try again. Your saved career pathways are unaffected.
        </div>
      )}
      {articles.length > 0 && (
        <CoverageList articles={articles} rowTestIdPrefix="row-personalized-reading" linkTestIdPrefix="link-personalized-source" />
      )}
      {!coverageQuery.isLoading && !coverageQuery.isError && articles.length === 0 && (
        <div className="trend-state" data-testid="empty-personalized-reading">
          No articles in the current Skills radar feed match your saved profile terms. Refresh later or update your profile interests to explore other coverage. No unrelated or sample articles are shown.
        </div>
      )}
    </section>
  );
}
