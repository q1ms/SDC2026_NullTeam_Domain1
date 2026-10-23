import { BookOpen, Flag, Sprout, UserRound } from 'lucide-react';
import type { RankedRole } from '@/lib/career-model';
import { getLearningResource, getPracticeHint } from '@/lib/career-explain';

export default function QuestMap({ role, skills }: { role: RankedRole; skills: string[] }) {
  return (
    <div data-testid="quest-map">
      <div className="jr-eyebrow">Reskilling quest</div>
      <h2>Your route toward {role.title}</h2>
      <p className="jr-hint">{role.matches.length} requirements covered, {role.missing.length} to learn.</p>
      <ol className="jr-tl" aria-label={`Reskilling route to ${role.title}`}>
        <li className="jr-step skill" data-testid="quest-step-current"><i><UserRound size={14} /></i><div><em>Current skills</em><b>{skills.join(', ')}</b></div></li>
        {role.missing.flatMap((s, i) => {
          const r = getLearningResource(s);
          return [
            <li key={`c-${s}`} className="jr-step course"><i><BookOpen size={14} /></i><div><em>Course</em><b><a href={r.url} target="_blank" rel="noopener noreferrer" data-testid={`link-course-${i}`}>{r.title}</a></b><p>{r.provider} / {r.kind}. {getPracticeHint(i)}</p></div></li>,
            <li key={`n-${s}`} className="jr-step new" data-testid={`quest-gap-${i}`}><i><Sprout size={14} /></i><div><em>New skill to build</em><b>{s}</b></div></li>,
          ];
        })}
        <li className="jr-step goal"><i><Flag size={14} /></i><div><em>Goal / target</em><b>Hired as {role.title}</b><p>An aspirational target, not an outcome.</p></div></li>
      </ol>
      {!role.missing.length && <p className="jr-hint" data-testid="text-quest-complete">Your listed skills already cover every requirement for this role, so no courses are suggested.</p>}
    </div>
  );
}
