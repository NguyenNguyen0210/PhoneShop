import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * ScrollToTop component
 * - On forward navigation (PUSH / REPLACE): resets scroll position to the top of the viewport (or scrolls to target element if hash exists).
 * - On backward navigation (POP / return): restores the previous scroll position so users stay at the same scroll position in lists.
 * - Saves scroll coordinates per route in sessionStorage.
 */
export const ScrollToTop: React.FC = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const prevPathRef = useRef<string>(location.pathname + location.search);
  const isRestoringRef = useRef<boolean>(false);
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Disable automatic browser scroll restoration so our app takes control
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      try {
        window.history.scrollRestoration = 'manual';
      } catch {
        // Ignore in environments where modifying scrollRestoration is blocked
      }
    }
  }, []);

  // Continuously record scroll position for current route
  useEffect(() => {
    const currentKey = `scroll_${location.pathname}${location.search}`;

    const handleScroll = () => {
      // Do not record scroll events if we are currently in the middle of restoring scroll coordinates
      if (isRestoringRef.current) return;

      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      try {
        sessionStorage.setItem(currentKey, String(scrollY));
      } catch {
        // Ignore storage quota errors
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      // DO NOT call handleScroll here! Calling handleScroll on cleanup runs when the DOM has already collapsed/unmounted,
      // which would clamp scrollY to a truncated page height (e.g. flash sale area) and poison the saved value.
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    const currentPath = location.pathname + location.search;
    const isNewRoute = prevPathRef.current !== currentPath;
    prevPathRef.current = currentPath;

    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      const timer = setTimeout(() => {
        const delayedEl = document.getElementById(targetId);
        if (delayedEl) {
          delayedEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    // On POP navigation (user clicks return / browser Back / Forward):
    // Restore previous scroll position if available instead of forcing to top
    if (navigationType === 'POP' && isNewRoute) {
      const currentKey = `scroll_${location.pathname}${location.search}`;
      const savedYStr = sessionStorage.getItem(currentKey);
      if (savedYStr !== null) {
        const savedY = parseInt(savedYStr, 10);
        if (!isNaN(savedY)) {
          isRestoringRef.current = true;
          if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);

          const applyScroll = () => {
            window.scrollTo({ top: savedY, left: 0, behavior: 'instant' });
            if (document.documentElement) {
              document.documentElement.scrollTop = savedY;
            }
            if (document.body) {
              document.body.scrollTop = savedY;
            }
          };

          applyScroll();

          // Multi-frame retries to account for async data hydration and layout settling
          const rAF = requestAnimationFrame(applyScroll);
          const t1 = setTimeout(applyScroll, 50);
          const t2 = setTimeout(applyScroll, 150);
          const t3 = setTimeout(applyScroll, 300);

          restoreTimerRef.current = setTimeout(() => {
            isRestoringRef.current = false;
          }, 400);

          return () => {
            cancelAnimationFrame(rAF);
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
            isRestoringRef.current = false;
          };
        }
      }
      return;
    }

    // On PUSH / REPLACE (user clicks link to a new page) or initial mount:
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }, [location.pathname, location.search, location.hash, navigationType]);

  return null;
};

export default ScrollToTop;
