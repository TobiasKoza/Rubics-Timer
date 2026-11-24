/** localStorage, který nespadne (soukromý režim, plný disk, testy v Node). */
export const storage = {
  get(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      /* nastavení jen nepřežije reload */
    }
  },
};
