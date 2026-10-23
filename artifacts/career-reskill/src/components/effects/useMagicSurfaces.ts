import { useEffect } from 'react';

/**
 * MagicBento-style spotlight, border glow and click ripple, adapted to work on
 * the app's real cards via event delegation (no demo content, no DOM rewrites).
 */
export const MAGIC_SELECTOR = '.section-card, .aside-panel, .rec-banner, .empty-card, .sdg-card, .side-note';

export function useMagicSurfaces() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let active: HTMLElement | null = null;
    let frame = 0;
    let last: PointerEvent | null = null;

    const apply = () => {
      frame = 0;
      if (!last) return;
      const el = (last.target as Element | null)?.closest<HTMLElement>(MAGIC_SELECTOR) ?? null;
      if (active && active !== el) active.style.setProperty('--glow-intensity', '0');
      active = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--glow-x', `${((last.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty('--glow-y', `${((last.clientY - r.top) / r.height) * 100}%`);
      el.style.setProperty('--glow-intensity', '1');
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      last = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => { active?.style.setProperty('--glow-intensity', '0'); active = null; };
    const onDown = (e: PointerEvent) => {
      if (reduced) return;
      const el = (e.target as Element | null)?.closest<HTMLElement>(MAGIC_SELECTOR);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'magic-ripple';
      ripple.setAttribute('aria-hidden', 'true');
      ripple.style.setProperty('--ripple-x', `${e.clientX - r.left}px`);
      ripple.style.setProperty('--ripple-y', `${e.clientY - r.top}px`);
      el.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.addEventListener('pointerdown', onDown, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerdown', onDown);
      document.querySelectorAll('.magic-ripple').forEach((n) => n.remove());
    };
  }, []);
}
