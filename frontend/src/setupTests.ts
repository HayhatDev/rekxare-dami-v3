// Vitest runs in the node environment without browser globals. Some modules
// (e.g. src/i18n/index.ts) read localStorage at import time, so a fresh
// in-memory shim must exist BEFORE any test module is evaluated.
type MemoryStore = Record<string, string>;
const memoryStore: MemoryStore = {};
(globalThis as Record<string, unknown>).localStorage = {
  getItem(key: string): string | null {
    return memoryStore[key] ?? null;
  },
  setItem(key: string, value: string): void {
    memoryStore[key] = String(value);
  },
  removeItem(key: string): void {
    delete memoryStore[key];
  },
  clear(): void {
    Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
  },
};