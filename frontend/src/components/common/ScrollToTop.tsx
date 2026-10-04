import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component
 * Listens to route navigation changes (pathname, hash) and automatically
 * resets the scroll position to the top of the viewport (or scrolls to target element if hash exists).
 * Also configures history.scrollRestoration to 'manual' so the browser does not
 * restore previous scroll coordinates on client-side route transitions.
 */
export const ScrollToTop: React.FC = () => {
  const { pathname, hash } = useLocation();

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

  useEffect(() => {
    if (hash) {
      const targetId = hash.replace('#', '');
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      // Delayed retry in case the hash target is rendered asynchronously
      const timer = setTimeout(() => {
        const delayedEl = document.getElementById(targetId);
        if (delayedEl) {
          delayedEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    // Instantly scroll to the top of the window on route change
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
