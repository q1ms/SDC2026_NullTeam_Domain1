import { useRef, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { RankedRole } from '@/lib/career-model';

export default function RolePicker({ roles, selectedId, onSelect }: { roles: RankedRole[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const reduce = useReducedMotion();
  const t = { duration: reduce ? 0 : 0.24, ease: 'easeOut' as const };
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % roles.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + roles.length) % roles.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = roles.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    tabRefs.current[nextIndex]?.focus();
    onSelect(roles[nextIndex].id);
  };
  return (
    <div className="jr-roles" role="tablist" aria-label="Recommended roles">
      <AnimatePresence mode="popLayout" initial={false}>
        {roles.map((r, i) => (
          <motion.div key={r.id} role="presentation" layout={!reduce} initial={{ opacity: 0, y: reduce ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -8 }} transition={t}>
            <button
              ref={(node) => { tabRefs.current[i] = node; }}
              id={`role-tab-${i}`}
              type="button"
              role="tab"
              aria-selected={r.id === selectedId}
              aria-controls="role-details"
              tabIndex={r.id === selectedId ? 0 : -1}
              className={`jr-role ${r.id === selectedId ? 'on' : ''}`}
              onClick={() => onSelect(r.id)}
              onKeyDown={(event) => onTabKeyDown(event, i)}
              data-testid={`row-role-${r.id}`}
            >
              <span className="jr-rank">#{i + 1} / {r.sector}</span>
              <b>{r.title}</b>
              <small>Fit {r.match}% / <span className={r.growth >= 0 ? 'jr-up' : ''}>{r.growth > 0 ? '+' : ''}{r.growth}% outlook</span></small>
              <span className="jr-fit"><u style={{ width: `${r.match}%` }} /></span>
              {r.growth < 0 && <span className="jr-risk">At risk: negative outlook</span>}
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
