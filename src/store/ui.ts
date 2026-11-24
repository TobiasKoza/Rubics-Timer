import { createStore } from './createStore';

/** Otevřený dialog. Časovač je vypnutý, dokud je nějaký otevřený. */
export type Dialog =
  | { kind: 'settings' }
  | { kind: 'help' }
  | { kind: 'stats' }
  | { kind: 'sessions' }
  | { kind: 'solve'; solveId: number }
  | { kind: 'average'; n: number; end: number }
  | null;

export const dialogStore = createStore<Dialog>(null);

export function openDialog(d: Exclude<Dialog, null>): void {
  dialogStore.set(d);
}

export function closeDialog(): void {
  dialogStore.set(null);
}

/** Informační toast (import hotový, zkopírováno…). Undo toast řeší solves store. */
export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'error';
}

export const toastStore = createStore<Toast | null>(null);
let toastId = 0;

export function showToast(text: string, tone: Toast['tone'] = 'info'): void {
  toastStore.set({ id: ++toastId, text, tone });
}
