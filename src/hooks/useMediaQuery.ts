'use client';

import * as React from 'react';

/**
 * SSR-safe media query hook. Returns `false` on the server and during the first
 * client render (to match server output and avoid a hydration mismatch), then
 * the real `matchMedia` result after hydration.
 *
 * Built on `useSyncExternalStore` so it stays in sync with viewport changes.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === 'undefined') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onStoreChange);
      return () => mql.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  const getSnapshot = React.useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = () => false;

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * `true` on phones — below Tailwind's `sm` breakpoint (640px), i.e. the phone↔
 * desktop boundary used across the design system. Use for structural swaps that
 * pure CSS can't do (table vs card, 1-month vs 2-month picker).
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 639px)');
}

/**
 * `true` below Tailwind's `md` breakpoint (768px) — the design system's **table↔card**
 * boundary. iPad portrait is exactly 768px, so it sits *above* this line and keeps the
 * dense desktop treatment; only phones fall below it. Use for structural swaps that
 * follow that boundary (wide timetable vs phone calendar).
 */
export function useIsBelowMd(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/**
 * `true` below Tailwind's `xl` breakpoint (1280px) — the phone + tablet (incl. all
 * iPad sizes / orientations) zone where the app uses the off-canvas nav drawer
 * instead of the persistent sidebar rail. Use for the shell drawer-vs-rail swap.
 */
export function useIsBelowXl(): boolean {
  return useMediaQuery('(max-width: 1279px)');
}
