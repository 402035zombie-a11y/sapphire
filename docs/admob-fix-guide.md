# ADMOB — FIX GUIDE (критично)

> **Якщо AdMob зламається (краш на старті або порожній APPLICATION_ID в маніфесті) — читай це ПЕРШИМ.**

## Симптоми

| Симптом | Діагноз |
|---|---|
| Краш на старті: `MobileAdsInitProvider: Invalid application ID` | `APPLICATION_ID` порожній у маніфесті |
| `aapt2 dump xmltree --file AndroidManifest.xml app.apk` показує `android:value=""` | Значення не застосувалось |
| Реклама не завантажується, консоль мовчить | Те саме — порожній ID |

## ПЕРВИЙ крок діагностики (ЗАВЖДИ)

```bash
cd C:/Users/DELL/BookReader
/c/Users/DELL/AppData/Local/Android/Sdk/build-tools/35.0.0/aapt2 \
  dump xmltree --file AndroidManifest.xml <APK> | grep -A2 "APPLICATION_ID"
```

Очікувано:
```
A: android:name="com.google.android.gms.ads.APPLICATION_ID"
A: android:value="ca-app-pub-5113967448800652~8371247908"   ← НЕ ПОРОЖНЄ!
```

Якщо `value=""` → конфіг не застосувався. Читай далі.

---

## КОРЕНЬ ПРОБЛЕМИ (3 відомі причини)

### Причина 1: НЕПРАВИЛЬНИЙ СИНТАКСИС `expo-build-properties` (НАЙЧАСТІШЕ)

**НЕ працює** (значення порожнє):
```js
{ "$": { "android:name": "...", "android:value": "..." } }
```

**ПРАЦЮЄ** (перевірено, коміти `20b94a47`, `37c25a20`):
```js
{ "name": "com.google.android.gms.ads.APPLICATION_ID", "value": "ca-app-pub-5113967448800652~8371247908" }
```

> ⚠️ Синтаксис залежить від версії плагіна. Для `expo-build-properties@57.0.10`
> працює саме `name/value`. Формат `$` — з іншої версії/іншого плагіна.

### Причина 2: `process.env` не резолвиться

`expo-build-properties` **НЕ** резолвить `process.env` — значення стає порожнім.
**ЗАВЖДИ хардкодь** ID в `app.config.js`, не читай з env.

```js
// ❌ НЕ працює:
const ADMOB_APP_ID = process.env.EXPO_PUBLIC_ADMOB_APP_ID || "ca-app-pub-...";

// ✅ Працює:
const ADMOB_APP_ID = "ca-app-pub-5113967448800652~8371247908";
```

### Причина 3: `react-native-google-mobile-ads` plugin НЕСУМІСНИЙ

Цей plugin **ламає** `expo config --json` в expo 54 / eas-cli 22 (падає мовчки, exit 1).
Тому він **видалений** з `plugins`. Не додавати назад.

---

## ПРАВИЛЬНИЙ КОНФІГ (робочий)

`app.config.js`:
```js
plugins: [
  ["expo-build-properties", {
    android: {
      manifest: {
        application: {
          "meta-data": [
            { "name": "com.google.android.gms.ads.APPLICATION_ID", "value": "ca-app-pub-5113967448800652~8371247908" }
          ]
        }
      }
    }
  }],
],
```

РЕЗЕРВ (на випадок якщо `expo-build-properties` знову не спрацює) —
захардкодити прямо в `android/app/src/main/AndroidManifest.xml`:
```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="ca-app-pub-5113967448800652~8371247908"
  tools:replace="android:value"/>
```

---

## ПРОВЕРКА після фіксу (обов'язково перед білдом)

```bash
# 1. Конфіг резолвиться?
npx expo config --json 2>&1 | grep -A2 "APPLICATION_ID"   # exit 0

# 2. В зібраному APK значення НЕ порожнє?
aapt2 dump xmltree --file AndroidManifest.xml app.apk | grep -A2 APPLICATION_ID
```

---

## РЕАЛЬНІ ID (production, НЕ тестові)

| Тип | ID |
|---|---|
| App ID | `ca-app-pub-5113967448800652~8371247908` |
| Banner | `ca-app-pub-5113967448800652/4712038644` |
| Rewarded | `ca-app-pub-5113967448800652/1663349260` |

Тестовий префікс `ca-app-pub-3940256099942544` — ТІЛЬКИ в `__mocks__/`,
в production-конфіг не потрапляє (перевірка `isRealAdUnit` в `monetization.native.ts`).

---

## Де ще перевіряти

- `.env`, `eas.json` (production + preview), `app.config.js`, `AndroidManifest.xml` —
  усі 4 місця мають однакові ID.
- Рантайм: `services/monetization.native.ts` — `initAds()` → `MobileAds().initialize()`;
  помилки НЕ глушаться (повертають false, не фейковий успіх).
- `components/AdBanner.native.tsx` — lazy `require` (dev-client safe).

## УРОК

**Білд падає/реклама не працює → 90% це порожній `APPLICATION_ID`.**
Перевіряй `aapt2` ПЕРШИМ, а не витрачай білд-спроби EAS.
EAS free builds обмежені — один фікс = один білд, не більше.
