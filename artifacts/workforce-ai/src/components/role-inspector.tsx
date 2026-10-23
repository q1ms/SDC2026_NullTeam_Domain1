import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { SDG_LABELS, type CareerRole, type RankedRole, type Scenario } from '@/lib/career-model';
import ExplainPanel from '@/components/explain-panel';

const sign = (n: number) => `${n > 0 ? '+' : ''}${n}%`;
export default function RoleInspector({ role, source, scenario, skills, onClose }: { role: RankedRole; source?: CareerRole; scenario: Scenario; skills: string[]; onClose: () => void }) {
  const mod = source?.moderateGrowth ?? role.growth;
  const fast = source?.fastGrowth ?? role.growth;
  const delta = fast - mod;
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', h);
    return () => {
      document.removeEventListener('keydown', h);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [role.id]);
  return (
    <aside className="inspector" role="dialog" aria-label={`${role.title} details`} data-testid="panel-role-inspector">
      <button ref={closeRef} className="insp-close" onClick={onClose} aria-label="Close role details" data-testid="button-close-inspector"><X size={16} /></button>
      <div className="kicker">{role.sector}</div>
      <h2>{role.title}</h2>
      {role.growth < 0 && <div className="insp-flag">Declining in the {scenario} scenario</div>}
      <div className="insp-stats">
        <div><b className={role.growth < 0 ? 'neg' : 'pos'} data-testid="text-inspector-growth">{sign(role.growth)}</b><span>growth, {scenario}</span></div>
        <div><b>{role.match}%</b><span>fit heuristic</span></div>
        <div><b>{role.resilience}</b><span>resilience</span></div>
      </div>
      <div className="insp-delta">Moderate {sign(mod)} to fast {sign(fast)}: <b className={delta < 0 ? 'neg' : 'pos'}>{delta > 0 ? '+' : ''}{delta} pts</b> if disruption speeds up.</div>
      <ExplainPanel role={role} skills={skills} />
      <div className="insp-label">Unmet skills gap ({role.missing.length})</div>
      <div className="chips">{role.missing.length ? role.missing.map((s) => <span className="chip gap" key={s}>{s}</span>) : <span className="muted">You cover every listed skill.</span>}</div>
      <div className="insp-label">UN Sustainable Development Goals</div>
      <ul className="sdg-list">{role.sdgs.length ? role.sdgs.map((s) => <li key={s}><b>{s}</b> {SDG_LABELS[s] ?? 'UN Sustainable Development Goal'}</li>) : <li className="muted">None listed.</li>}</ul>
    </aside>
  );
}
