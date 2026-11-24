import { createStore } from './createStore';
import { storage } from './storage';

export type InputMode = 'timer' | 'manual';
export type InspectionAlert = 'off' | 'beep' | 'voice';
export type PreviewMode = 'off' | '2D' | '3D';
export type Theme = 'auto' | 'dark' | 'light';
export type Accent = 'green' | 'blue' | 'violet' | 'orange' | 'pink' | 'cyan';
export type Size = 'S' | 'M' | 'L' | 'XL';

export interface Settings {
  inputMode: InputMode;
  holdMs: number;
  inspection: boolean;
  inspectionAlert: InspectionAlert;
  /** Během solvu schovat vše kromě času. */
  focusMode: boolean;
  /** Zobrazovat běžící čas (jinak jen „…“). */
  showRunningTime: boolean;
  preview: PreviewMode;
  /** Multi-phase: počet fází (1 = vypnuto). */
  phases: number;
  pbSound: boolean;
  theme: Theme;
  accent: Accent;
  timerSize: Size;
  scrambleSize: Size;
}

export const DEFAULT_SETTINGS: Settings = {
  inputMode: 'timer',
  holdMs: 300,
  inspection: false,
  inspectionAlert: 'voice',
  focusMode: true,
  showRunningTime: true,
  preview: '2D',
  phases: 1,
  pbSound: false,
  theme: 'auto',
  accent: 'green',
  timerSize: 'L',
  scrambleSize: 'M',
};

const KEY = 'rubics-timer:settings';

function load(): Settings {
  try {
    const raw = storage.get(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const settingsStore = createStore<Settings>(load());

settingsStore.subscribe(() => storage.set(KEY, JSON.stringify(settingsStore.get())));

export function updateSettings(patch: Partial<Settings>): void {
  settingsStore.set((s) => ({ ...s, ...patch }));
}

export function resetSettings(): void {
  settingsStore.set(DEFAULT_SETTINGS);
}
