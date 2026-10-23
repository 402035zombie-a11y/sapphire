# ACTION LOG — Sapphire Local APK Build

**Дата**: 2026-10-23
**Ціль**: зібрати локальний full-апк (app-release.apk) з кореня PC, з AdMob APPLICATION_ID, без EAS.

---

## Огляд стану

| Параметр | Значення |
|---|---|
| Останній успішний локальний білд | 09.09 (1m 46s), `./gradlew assembleRelease`, корінь |
| Текущий APK | `app-release-apk/app-release-1.0.0.apk` (118,156 MB, 21.10 19:57) |
| Версія APK | versionCode 2, versionName "1.0.0" (за репозиторієм) |
| Баг локального білду | (продовжити логування) |

---

## Часлени спроби

### Спроба 1: 2026-10-23 10:23
- **Дія**: `npm install expo-build-properties@58.0.2 --save-exact`
- **Результат**: Встановила 58.0.2
- **Помилка білда**: `com.android.tools.build:gradle:8.11.0` не знайдено

### Спроба 2: 2026-10-23 10:25
- **Дія**: `./gradlew clean assembleRelease` (корінь)
- **Результат**: FAIL — `Plugin [id: 'com.facebook.react'] was not found`
- **Причина**: `includeBuild` шляхи невірні (помилкове включення `...package.json\android\expo-gradle-plugin`)

### Спроба 3: 2026-10-23 11:00
- **Дія**: `cat > settings.gradle` з абсолютними шляхами
- **Результат**: FAIL — `Plugin [id: 'com.facebook.react'] was not found`
- **Причина**: includeBuild не робить плагіни доступними (конфігурація не правильна)

### Спроба 4: 2026-10-23 11:10
- **Дія**: `cp android/settings.gradle settings.gradle`
- **Результат**: FAIL — `Could not find com.android.tools.build:gradle:8.11.0`
- **Причина**: неправильна версія AGP, шляхи не відповідають node_modules

### Спроба 5: 2026-10-23 11:15
- **Дія**: `cd android && ./gradlew clean assembleRelease`
- **Результат**: FAIL — `Unresolved reference 'extensions'` в expo-gradle-plugin
- **Причина**: версія expo-gradle-plugin несумісна з поточним Gradle/Kotlin

---

## Висновок

Більшість спроб падають на:
1. Несумісність `expo-gradle-plugin` з поточним Gradle/Kotlin
2. Неправильні шляхи `includeBuild`
3. Відсутність/неправильний AGP версії

**Стабільний варіант**: використовувати вже зібраний APK (118.156 MB, 21.10 19:57).

---

---

## Спроба 6-9 (продовження)
### Спроба 6: 2026-10-23 10:20
- **Дія**: `./gradlew clean assembleRelease` (з кореня, абсолютні шляхи)
- **Результат**: FAIL — `Plugin [id: 'com.facebook.react'] was not found`

### Спроба 7: 2026-10-23 10:25
- **Дія**: `cp android/settings.gradle settings.gradle`
- **Результат**: FAIL — `Could not resolve all artifacts... com.android.tools.build:gradle:8.11.0`

### Спроба 8: 2026-10-23 11:00
- **Дія**: `cd android && ./gradlew clean assembleRelease`
- **Результат**: FAIL — `Unresolved reference 'extensions'` в expo-gradle-plugin

### Спроба 9: 2026-10-23 11:15
- **Дія**: `cd android && ./gradlew clean assembleRelease`
- **Результат**: FAIL — `Cannot access output property 'soFolder'... Failed to create MD5 hash`

---

## Поточний стан (2026-10-23 11:20)

| Параметр | Значення |
|---|---|
| Чи є живі процеси Gradle/Java? | НІ (перевірено) |
| Останній білд засповнено | НІ (палав) |
| JSON-лог | `action-log.md` у `.build-logs/` |
| Рекомендація | Використати готовий APK (118,156 MB, 21.10 19:57) як базовий інсталятор |

---

## Далі

1. Перевірити файл APK (версія, AdMob ID, debuggable)
2. Якщо APK застарілий, продовжити налагодження локального білду
3. Якщо все ОК — зберегти в якість гарантію
