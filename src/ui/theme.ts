import type { Accent, Settings, Size } from '../store/settings';

/** Barvy zvýraznění pro tmavý / světlý motiv a text na nich. */
export const ACCENTS: Record<Accent, { dark: string; darkInk: string; light: string; lightInk: string; name: string }> = {
  green: { dark: '#4ade80', darkInk: '#062b14', light: '#16a34a', lightInk: '#ffffff', name: 'Zelená' },
  blue: { dark: '#60a5fa', darkInk: '#04203f', light: '#2563eb', lightInk: '#ffffff', name: 'Modrá' },
  violet: { dark: '#a78bfa', darkInk: '#1e1046', light: '#7c3aed', lightInk: '#ffffff', name: 'Fialová' },
  orange: { dark: '#fb923c', darkInk: '#3a1603', light: '#ea580c', lightInk: '#ffffff', name: 'Oranžová' },
  pink: { dark: '#f472b6', darkInk: '#3d0a24', light: '#db2777', lightInk: '#ffffff', name: 'Růžová' },
  cyan: { dark: '#22d3ee', darkInk: '#05303a', light: '#0891b2', lightInk: '#ffffff', name: 'Tyrkysová' },
};

const TIMER_SCALE: Record<Size, number> = { S: 0.6, M: 0.8, L: 1, XL: 1.25 };
const SCRAMBLE_SCALE: Record<Size, number> = { S: 0.85, M: 1, L: 1.2, XL: 1.45 };

const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : null;

export function resolvedTheme(theme: Settings['theme']): 'dark' | 'light' {
  if (theme === 'auto') return media?.matches ? 'light' : 'dark';
  return theme;
}

/** Promítne nastavení vzhledu do CSS proměnných na <html>. */
export function applyTheme(s: Settings): void {
  const root = document.documentElement;
  const mode = resolvedTheme(s.theme);
  const accent = ACCENTS[s.accent] ?? ACCENTS.green;
  root.dataset.theme = mode;
  root.style.setProperty('--accent', mode === 'dark' ? accent.dark : accent.light);
  root.style.setProperty('--accent-contrast', mode === 'dark' ? accent.darkInk : accent.lightInk);
  root.style.setProperty('--timer-scale', String(TIMER_SCALE[s.timerSize] ?? 1));
  root.style.setProperty('--scramble-scale', String(SCRAMBLE_SCALE[s.scrambleSize] ?? 1));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? '#0f1115' : '#f6f7f9');
}

/** Při motivu „podle systému“ reaguje na přepnutí v OS. */
export function watchSystemTheme(onChange: () => void): () => void {
  media?.addEventListener('change', onChange);
  return () => media?.removeEventListener('change', onChange);
}
