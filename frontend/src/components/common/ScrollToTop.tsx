import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Universal Scroll Restoration Component
 * - Forwards (PUSH / REPLACE) to a DIFFERENT PATH: Resets window and container scroll to (0, 0) (or scrolls to target element if hash exists).
 * - Pure query-param changes on the SAME path (in-page filters, tabs, pagination via setSearchParams) preserve scroll —
 *   pages that need a scroll jump (e.g. HomePage pagination) handle it themselves via scrollIntoView.
 * - Backwards (POP / return): Accurately restores scroll position across ALL screens (Storefront, Admin, Staff).
 * - Handles asynchronous data hydration and dynamic content rendering via ResizeObserver and multi-frame retry.
 * - Protects against scroll state poisoning from route transition clamping.
 * - Supports both Window scrolling (Storefront, Admin) and Layout.Content container scrolling (Admin, Staff).
 */
export const ScrollToTop: React.FC = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const prevPathRef = useRef<string>(location.pathname + location.search);
  const prevPathnameRef = useRef<string | null>(null);
  const isRestoringRef = useRef<boolean>(false);
  const stopRestoringRef = useRef<(() => void) | null>(null);

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

  // Helper to get any inner scrolling container (e.g. Ant Design Layout.Content in Admin/Staff)
  const getInnerScrollContainer = (): HTMLElement | null => {
    if (typeof document === 'undefined') return null;
    return (
      document.querySelector<HTMLElement>('.ant-layout-content') ||
      document.querySelector<HTMLElement>('[data-scroll-container="true"]') ||
      null
    );
  };

  // Continuously record scroll position for current route
  useEffect(() => {
    const windowKey = `scroll_${location.pathname}${location.search}`;
    const containerKey = `container_scroll_${location.pathname}${location.search}`;

    const handleWindowScroll = () => {
      if (isRestoringRef.current) return;
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      try {
        sessionStorage.setItem(windowKey, String(scrollY));
      } catch {
        // Ignore storage errors
      }
    };

    const handleContainerScroll = (e: Event) => {
      if (isRestoringRef.current) return;
      const target = e.target as HTMLElement;
      if (target && typeof target.scrollTop === 'number') {
        try {
          sessionStorage.setItem(containerKey, String(target.scrollTop));
        } catch {
          // Ignore storage errors
        }
      }
    };

    const handlePageHide = () => {
      if (!isRestoringRef.current) {
        const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        try {
          sessionStorage.setItem(windowKey, String(scrollY));
        } catch {
          // Ignore storage errors
        }
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    window.addEventListener('pagehide', handlePageHide);

    // Also watch for inner layout container scroll (Admin & Staff)
    const container = getInnerScrollContainer();
    if (container) {
      container.addEventListener('scroll', handleContainerScroll, { passive: true });
    }

    return () => {
      // DO NOT call handleScroll on cleanup to avoid recording clamped heights during unmount!
      window.removeEventListener('scroll', handleWindowScroll);
      window.removeEventListener('pagehide', handlePageHide);
      if (container) {
        container.removeEventListener('scroll', handleContainerScroll);
      }
    };
  }, [location.pathname, location.search]);

  // Handle route changes: scroll to top on PUSH, or restore previous coordinates on POP
  useEffect(() => {
    const currentPath = location.pathname + location.search;
    const isNewRoute = prevPathRef.current !== currentPath;
    prevPathRef.current = currentPath;

    const isNewPathname =
      prevPathnameRef.current === null || prevPathnameRef.current !== location.pathname;
    prevPathnameRef.current = location.pathname;

    // Clean up any pending restoration observer from previous transition
    if (stopRestoringRef.current) {
      stopRestoringRef.current();
      stopRestoringRef.current = null;
    }

    // 1. On POP navigation (user clicks Return / browser Back / Forward):
    if (navigationType === 'POP' && isNewRoute) {
      const windowKey = `scroll_${location.pathname}${location.search}`;
      const containerKey = `container_scroll_${location.pathname}${location.search}`;
      const savedWindowYStr = sessionStorage.getItem(windowKey);
      const savedContainerYStr = sessionStorage.getItem(containerKey);

      const targetWindowY = savedWindowYStr !== null ? parseInt(savedWindowYStr, 10) : null;
      const targetContainerY = savedContainerYStr !== null ? parseInt(savedContainerYStr, 10) : null;

      const hasValidWindowY = targetWindowY !== null && !isNaN(targetWindowY);
      const hasValidContainerY = targetContainerY !== null && !isNaN(targetContainerY);

      if (hasValidWindowY || hasValidContainerY) {
        isRestoringRef.current = true;

        const applyAllScroll = () => {
          if (hasValidWindowY) {
            window.scrollTo({ top: targetWindowY, left: 0, behavior: 'instant' });
            if (document.documentElement) document.documentElement.scrollTop = targetWindowY;
            if (document.body) document.body.scrollTop = targetWindowY;
          }
          if (hasValidContainerY) {
            const container = getInnerScrollContainer();
            if (container) {
              container.scrollTop = targetContainerY;
            }
          }
        };

        // Instant execution
        applyAllScroll();

        // Active observation: Watch for DOM resize (e.g. async items loading from database API)
        let isDone = false;
        let observer: ResizeObserver | null = null;

        const checkCompletion = () => {
          if (isDone) return;
          applyAllScroll();

          const atWindowBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 16);
          const windowSatisfied = !hasValidWindowY || Math.abs(window.scrollY - targetWindowY) <= 8 || (atWindowBottom && window.scrollY > 0);

          const container = getInnerScrollContainer();
          const atContainerBottom = container ? (container.clientHeight + container.scrollTop >= container.scrollHeight - 16) : false;
          const containerSatisfied = !hasValidContainerY || !container || Math.abs(container.scrollTop - targetContainerY) <= 8 || (atContainerBottom && container.scrollTop > 0);

          if (windowSatisfied && containerSatisfied) {
            // Target coordinates reached successfully
            cleanup();
          }
        };

        const cleanup = () => {
          isDone = true;
          isRestoringRef.current = false;
          if (observer) {
            observer.disconnect();
            observer = null;
          }
          window.removeEventListener('wheel', handleUserIntent);
          window.removeEventListener('touchmove', handleUserIntent);
          window.removeEventListener('keydown', handleUserIntent);
          clearTimeout(safetyTimer);
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
        };

        // If user manually touches screen, wheels, or presses a key, cancel restoration so we never fight user intent
        const handleUserIntent = () => {
          cleanup();
        };

        window.addEventListener('wheel', handleUserIntent, { passive: true });
        window.addEventListener('touchmove', handleUserIntent, { passive: true });
        window.addEventListener('keydown', handleUserIntent, { passive: true });

        // ResizeObserver re-applies coordinates whenever content expands
        if (typeof ResizeObserver !== 'undefined' && document.documentElement) {
          observer = new ResizeObserver(() => {
            checkCompletion();
          });
          observer.observe(document.documentElement);
          const container = getInnerScrollContainer();
          if (container) {
            observer.observe(container);
          }
        }

        // Stepped frame retries for instant rendering
        const rAF = requestAnimationFrame(checkCompletion);
        const t1 = setTimeout(checkCompletion, 50);
        const t2 = setTimeout(checkCompletion, 150);
        const t3 = setTimeout(checkCompletion, 300);

        // Safety timeout to release lock after 3.5s
        const safetyTimer = setTimeout(() => {
          cleanup();
        }, 3500);

        stopRestoringRef.current = cleanup;

        return () => {
          cancelAnimationFrame(rAF);
          cleanup();
        };
      }
      return;
    }

    // 2. Hash navigation takes precedence on forward/new navigation
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

    // 3. On PUSH / REPLACE to a DIFFERENT PATH (real page change) or initial mount:
    // reset scroll to top. Pure query-param changes on the SAME path (in-page
    // filters, tabs, pagination) must preserve scroll position instead of
    // jumping to the top — those screens manage their own scroll targets.
    if (!isNewPathname) {
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    const container = getInnerScrollContainer();
    if (container) {
      container.scrollTop = 0;
    }
  }, [location.pathname, location.search, location.hash, navigationType]);

  return null;
};

export default ScrollToTop;
