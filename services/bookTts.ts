// services/bookTts.ts
// JS-фасад для нативного TTS TurboModule (NativeBookTTS).
// Черга параграфів живе в Kotlin → pause/resume 100% надійні.
import NativeBookTTS from '../specs/NativeBookTTS';

let indexCb: ((index: number) => void) | null = null;
let stateCb: ((state: string) => void) | null = null;
let registered = false;

function ensureRegistered() {
  if (registered || !NativeBookTTS) return;
  try {
    NativeBookTTS.setOnIndexChanged((i: number) => indexCb?.(i));
    NativeBookTTS.setOnStateChanged((s: string) => stateCb?.(s));
    registered = true;
  } catch (e) {
    console.warn('[bookTts] register callbacks failed', e);
  }
}

export function onTtsIndex(cb: (index: number) => void) {
  indexCb = cb;
  ensureRegistered();
}
export function onTtsState(cb: (state: string) => void) {
  stateCb = cb;
  ensureRegistered();
}

export function ttsPlay(paragraphs: string[], lang: string) {
  ensureRegistered();
  NativeBookTTS?.speak(paragraphs.filter((p) => p && p.trim().length > 0), lang);
}
export function ttsPause() {
  NativeBookTTS?.pause();
}
export function ttsResume() {
  NativeBookTTS?.resume();
}
export function ttsStop() {
  NativeBookTTS?.stop();
}
export function ttsIsSpeaking(): boolean {
  return NativeBookTTS?.isSpeaking() ?? false;
}
