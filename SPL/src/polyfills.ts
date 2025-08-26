// Browser polyfills for Solana Web3.js compatibility

// Set up Buffer global using dynamic import to avoid module resolution issues
async function setupBuffer() {
  try {
    const bufferModule = await import('buffer');
    const Buffer = bufferModule.Buffer;
    
    // Set up Buffer global
    if (typeof globalThis.Buffer === 'undefined') {
      globalThis.Buffer = Buffer;
    }

    if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
      window.Buffer = Buffer;
    }
    
    return Buffer;
  } catch (error) {
    console.warn('Failed to load Buffer:', error);
    return null;
  }
}

// Set up global
if (typeof globalThis.global === 'undefined') {
  globalThis.global = globalThis;
}

// Set up process.env for compatibility
if (typeof globalThis.process === 'undefined') {
  (globalThis as any).process = { env: {} };
}

// Initialize Buffer polyfill
setupBuffer();

// Export a promise that resolves when polyfills are ready
export const polyfillsReady = setupBuffer();