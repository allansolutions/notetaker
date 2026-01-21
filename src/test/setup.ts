import '@testing-library/jest-dom';

// Mock scrollIntoView for Radix UI components (not available in jsdom)
Element.prototype.scrollIntoView = () => {};

// Mock pointer capture methods for Radix UI components (not available in jsdom)
Element.prototype.hasPointerCapture = () => false;
Element.prototype.setPointerCapture = () => {};
Element.prototype.releasePointerCapture = () => {};

// Mock matchMedia for theme tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
