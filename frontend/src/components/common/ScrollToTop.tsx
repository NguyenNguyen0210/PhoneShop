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
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      try {
        sessionStorage.setItem(currentKey, String(scrollY));
      } catch {
        // Ignore storage quota errors
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      handleScroll(); // Save one last time on unmount or route change
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
          window.scrollTo({ top: savedY, left: 0, behavior: 'instant' });
          if (document.documentElement) {
            document.documentElement.scrollTop = savedY;
          }
          if (document.body) {
            document.body.scrollTop = savedY;
          }
          // Retry after layout render to handle dynamic content height
          const rAF = requestAnimationFrame(() => {
            window.scrollTo({ top: savedY, left: 0, behavior: 'instant' });
          });
          const timer = setTimeout(() => {
            window.scrollTo({ top: savedY, left: 0, behavior: 'instant' });
          }, 80);
          return () => {
            cancelAnimationFrame(rAF);
            clearTimeout(timer);
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
