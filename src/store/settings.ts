import { createStore } from './createStore';

export type InputMode = 'timer' | 'manual';
export type InspectionAlert = 'off' | 'beep' | 'voice';
export type PreviewMode = 'off' | '2D' | '3D';

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
}

export const DEFAULT_SETTINGS: Settings = {
  inputMode: 'timer',
  holdMs: 300,
  inspection: false,
  inspectionAlert: 'voice',
  focusMode: true,
  showRunningTime: true,
  preview: '2D',
};

const KEY = 'rubics-timer:settings';

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const settingsStore = createStore<Settings>(load());

settingsStore.subscribe(() => {
  try {
    localStorage.setItem(KEY, JSON.stringify(settingsStore.get()));
  } catch {
    /* plný nebo zakázaný localStorage – nastavení jen nepřežije reload */
  }
});

export function updateSettings(patch: Partial<Settings>): void {
  settingsStore.set((s) => ({ ...s, ...patch }));
}
