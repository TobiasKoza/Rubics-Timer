import type { InspectionAlert } from '../store/settings';
import { t } from '../i18n/cs';

let audio: AudioContext | null = null;

/** AudioContext jde vytvořit/odemknout jen po gestu uživatele – voláme při stisku. */
export function unlockAudio(): void {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    /* bez Web Audio prostě nepípáme */
  }
}

function beep(times: number): void {
  if (!audio) return;
  const now = audio.currentTime;
  for (let i = 0; i < times; i++) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    const start = now + i * 0.18;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
    osc.connect(gain).connect(audio.destination);
    osc.start(start);
    osc.stop(start + 0.13);
  }
}

function speak(text: string): void {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'cs-CZ';
  u.rate = 1.15;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

/** Upozornění během inspekce (8 s a 12 s). */
export function inspectionAlert(second: 8 | 12, mode: InspectionAlert): void {
  if (mode === 'beep') beep(second === 8 ? 1 : 2);
  else if (mode === 'voice') speak(second === 8 ? t.voice.eight : t.voice.twelve);
}
