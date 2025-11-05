// Minimal browser-safe shim that mirrors the webpack `fs: false` fallback.
const browserFsShim: Record<string, never> = {};

export default browserFsShim;
