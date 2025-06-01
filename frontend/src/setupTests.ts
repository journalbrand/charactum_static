import '@testing-library/jest-dom';

// Configure timezone for consistent timestamp testing
process.env.TZ = 'UTC';

// Provide DOMParser globally when running in Node environment
// This allows utilities that rely on DOMParser to work in tests
try {
  if (typeof (global as any).DOMParser === 'undefined') {
    const { JSDOM } = require('jsdom');
    (global as any).DOMParser = new JSDOM().window.DOMParser;
  }
} catch {
  // jsdom might not be available in some environments
}

// Mock import.meta.env for Jest tests
if (typeof global !== 'undefined') {
  (global as any).importMetaEnv = (global as any).importMetaEnv || {};
  Object.defineProperty(global, 'import.meta', {
    value: {
      env: (global as any).importMetaEnv,
    },
    writable: true, // Make it writable if you need to change it in tests
  });
}

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
}); 