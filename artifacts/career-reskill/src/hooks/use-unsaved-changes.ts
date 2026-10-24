import { useEffect, useLayoutEffect, useRef } from 'react';

const LEAVE_MESSAGE = 'You have unsaved profile changes. Leave without saving?';

/** Guard links before Wouter handles them, without unmounting the draft on cancel. */
export function useUnsavedChanges(hasUnsavedChanges: boolean) {
  const dirty = useRef(hasUnsavedChanges);
  useLayoutEffect(() => {
    dirty.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const followLink = (event: MouseEvent) => {
      if (!dirty.current || event.defaultPrevented || event.button !== 0
        || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof window.Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof window.HTMLAnchorElement) || link.hasAttribute('download')
        || (link.target && link.target !== '_self')) return;
      const destination = new URL(link.href, window.location.href);
      if (!['http:', 'https:'].includes(destination.protocol)) return;
      // Error-summary links and links back to this editor do not leave its draft.
      if (destination.origin === window.location.origin
        && destination.pathname === window.location.pathname
        && destination.search === window.location.search) return;
      if (!window.confirm(LEAVE_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', followLink, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', followLink, true);
    };
  }, []);

  // A successful save can navigate in the same tick, before React commits state.
  return () => { dirty.current = false; };
}
