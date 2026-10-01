import '@testing-library/jest-dom/vitest';

/**
 * jsdom does not implement matchMedia, which the theme toggle reads to pick up
 * the operating-system preference. Reporting "no preference" is the right
 * default for tests; real browsers answer this themselves.
 */
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
