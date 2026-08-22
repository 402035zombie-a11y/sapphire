package com.bookreader.app.booktts

import android.os.Build
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/**
 * BookTTSModule — нативний TTS через Android TextToSpeech.
 *
 * Ключова перевага над expo-speech: черга параграфів живе У Kotlin.
 * UtteranceProgressListener дає ЧІТКИЙ поділ:
 *   - onDone(reason=null)    → речення завершилось → грай наступне
 *   - onStop / onDone(reason!=null) → зупинено користувачем → НЕ грай наступне
 * Це усуває баг expo-speech (onDone після stop → стрибок позиції).
 *
 * Стан керується атомарними полями (thread-safe):
 *   - pos: поточний індекс параграфа
 *   - playing: чи активне озвучення
 *   - paused: чи на паузі
 */
@ReactModule(name = BookTTSModule.NAME)
class BookTTSModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val NAME = "NativeBookTTS"
  }

  private var tts: TextToSpeech? = null
  private var paragraphs: List<String> = emptyList()
  private val pos = AtomicInteger(0)
  private val playing = AtomicBoolean(false)
  private val paused = AtomicBoolean(false)
  private var currentUtteranceId: String? = null

  // JS-колбеки (через invokeDefault, з головного потоку)
  private var onIndexChanged: ((Double) -> Unit)? = null
  private var onStateChanged: ((String) -> Unit)? = null

  override fun getName(): String = NAME

  @ReactMethod
  fun setOnIndexChanged(callback: (Double) -> Unit) {
    onIndexChanged = callback
  }

  @ReactMethod
  fun setOnStateChanged(callback: (String) -> Unit) {
    onStateChanged = callback
  }

  @ReactMethod
  fun isSpeaking(promise: Promise) {
    promise.resolve(playing.get())
  }

  private fun ensureTts(): TextToSpeech {
    if (tts == null) {
      tts = TextToSpeech(reactApplicationContext) { status ->
        if (status == TextToSpeech.SUCCESS) {
          tts?.setOnUtteranceCompletedListener { utteranceId ->
            // Завершено чергове речення → грай наступне (якщо не на паузі/зупинці)
            if (paused.get() || !playing.get()) return@setOnUtteranceCompletedListener
            val next = pos.incrementAndGet()
            if (next >= paragraphs.size) finish() else { emitIndex(next); speakAt(next) }
          }
        }
      }
    }
    return tts!!
  }

  private fun emitIndex(index: Int) {
    onIndexChanged?.let { cb ->
      reactApplicationContext.runOnUiQueueThread { cb(index.toDouble()) }
    }
  }

  private fun emitState(state: String) {
    onStateChanged?.let { cb ->
      reactApplicationContext.runOnUiQueueThread { cb(state) }
    }
  }

  private fun speakAt(index: Int) {
    if (index < 0 || index >= paragraphs.size) return
    val text = paragraphs[index]
    val id = "utt_$index"
    currentUtteranceId = id
    val params = java.util.HashMap<String, String>().apply {
      put(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, id)
    }
    tts?.speak(text, TextToSpeech.QUEUE_FLUSH, params)
  }

  @ReactMethod
  fun speak(items: List<String>, lang: String) {
    paragraphs = items.filter { it.isNotBlank() }
    if (paragraphs.isEmpty()) {
      emitState("done")
      return
    }
    val t = ensureTts()
    try {
      val loc = Locale.forLanguageTag(lang.replace('_', '-'))
      // Спочатку пробуємо знайти voice з точним локалем (щоб уникнути акценту дефолтного голосу)
      val target = loc.toString() // напр. "en_US" або "uk_UA"
      val voice = t.voices?.firstOrNull { v ->
        !v.isNetworkConnectionRequired && (v.locale.toString() == target || v.locale.language == loc.language)
      }
      if (voice != null) {
        t.voice = voice
      } else {
        // Немає локального voice → хоча б сетимо мову (Android підхопить доступний)
        val res = t.setLanguage(loc)
        if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
          android.util.Log.w("BookTTS", "TTS lang missing data for $target, using default")
        }
      }
    } catch (e: Throwable) {
      t.language = Locale.ENGLISH
    }
    pos.set(0)
    playing.set(true)
    paused.set(false)
    emitState("playing")
    emitIndex(0)
    speakAt(0)
  }

  @ReactMethod
  fun pause() {
    if (!playing.get()) return
    paused.set(true)
    tts?.stop()
    emitState("paused")
  }

  @ReactMethod
  fun resume() {
    if (!playing.get() || !paused.get()) return
    paused.set(false)
    emitState("playing")
    // продовжуємо з ПОТОЧНОГО pos (не з 0)
    emitIndex(pos.get())
    speakAt(pos.get())
  }

  @ReactMethod
  fun stop() {
    playing.set(false)
    paused.set(false)
    pos.set(0)
    tts?.stop()
    emitState("stopped")
  }

  private fun finish() {
    playing.set(false)
    paused.set(false)
    pos.set(0)
    emitState("done")
  }

  override fun invalidate() {
    tts?.stop()
    tts?.shutdown()
    tts = null
    super.invalidate()
  }
}
