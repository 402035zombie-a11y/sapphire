/**
 * Codegen-спека TurboModule для нативного TTS (Kotlin TextToSpeech).
 *
 * Чому нативно: JS-рекурсія через expo-speech дає глючний pause/resume
 * (onDone після stop → стрибок позиції). Kotlin тримає чергу речень/параграфів
 * у себе, має чіткий UtteranceProgressListener (onDone ≠ onStop), і шле
 * прогрес у JS через promise-callback onIndexChanged.
 *
 * Контракт:
 *  - speak(paragraphs: string[], lang: string): запускає чергу з індексу 0.
 *  - pause(): ставить на паузу (Kotlin не йде до наступного).
 *  - resume(): продовжує з поточного індексу.
 *  - stop(): скидає чергу в 0.
 *  - onIndexChanged(index): callback у JS з поточним індексом параграфа.
 *  - onStateChanged(state): 'playing' | 'paused' | 'stopped' | 'done'
 */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  speak(paragraphs: string[], lang: string): void;
  pause(): void;
  resume(): void;
  stop(): void;
  isSpeaking(): boolean;
  setOnIndexChanged(callback: (index: number) => void): void;
  setOnStateChanged(callback: (state: string) => void): void;
}

export default TurboModuleRegistry.get<Spec>('NativeBookTTS');
