# Sapphire — DEV GUIDE (handoff для агентів)

Додаток: **Android native** (Expo RN, NOT web). Package `com.mike.wolfskin`, назва **Sapphire** (APP_NAME у app.config.js). Акаунт EAS: `mike2424`, проєкт `sapphire`.

## Швидкий цикл (без білду)
Після того як dev-client APK встановлений на телефон — ЗВИЧАЙНІ правки (UI/логіка/стилі/тексти) НЕ потребують білду:
1. Телефон підключений по USB (`adb devices`).
2. Запущено Metro: `npx expo start --host lan` (у WSL: `wsl.exe -e bash -lc 'cd /mnt/c/Users/DELL/Sapphire && export ANDROID_HOME=/opt/android-sdk ANDROID_SDK=/opt/android-sdk JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 && npx expo start --host lan'`).
3. `adb reverse tcp:8081 tcp:8081` (телефон→ПК).
4. Відкрити apку: `adb shell am start -n host.exp.exponent/.LauncherActivity -d "exp://192.168.1.207:8081"` (LAN IP = РЕАЛЬНИЙ WiFi ПК, НЕ WSL 172.x! Дивитись `ipconfig` Ethernet IPv4).
5. Правка коду → Hot Reload на телефоні за 1-3с.

## ВЕРИФІКАЦІЯ — ТІЛЬКИ НА ТЕЛЕФОНІ (вказівка користувача 2026-08-24)
Веб-версія НЕ використовується (була тільки для дебаггінгу, більше не актуальна):
- НЕ запускати `expo start --web` / `expo export --platform web`.
- `expo export --platform web` взагалі падає на `wa-sqlite.wasm` (передіснуючий баг web-бандла) — це НЕ сигнал про зламаний код.
- Верифікація = `npx tsc --noEmit` (EXIT 0) + перевірка користувачем на телефоні по списку змін одним проходом у кінці сесії.

## Коли ПОТРІБЕН білд (dev-client)
Лише якщо міняєш НАТИВНУ залежність: додаєш бібліотеку, міняєш версію mmkv/expo-dev-client, `app.config.js` (назва/permissions/AdMob), RN/Expo.
Звичайні правки → білд НЕ потрібен.

## КРИТИЧНІ помилки (НЕ повторювати)

### 1. Expo Go НЕ працює
`react-native-mmkv` — нативний модуль, якого нема в Expo Go. Apka падає:
`Failed to create a new MMKV instance: react-native-mmkv 3.x.x requires TurboModules, but the new architecture is not enabled!`
→ Використовувати ТІЛЬКИ dev-build (expo-dev-client), не Expo Go.

### 2. expo-dev-client версія
Для Expo SDK 54 / RN 0.81.5 потрібен `expo-dev-client@~6.0.21`. Версія `57.x` НЕСУМІСНА → падає gradle:
`e: Unresolved reference 'OptimizedRecord'` у `expo-dev-menu/DevMenuModule.kt`.
FIX: `npm i expo-dev-client@~6.0.21`.

### 3. react-native-mmkv версія (old-arch dev-client)
dev-client працює на OLD architecture (ігнорує `newArchEnabled:true` з app.config.js).
→ dev-client потребує `react-native-mmkv@2.12.2` (не 3.x!).
→ production білд (devel) лишається new-arch + mmkv `^3.3.3` (ОК там).
⚠️ Якщо змінив версію mmkv у package.json — dev-client APK треба ПЕРЕЗІБРАТИ (native+JS мусять збігатись), інакше: `The native MMKV Module could not be found`.

### 4. Локальний білд падає без ANDROID_HOME
Градл шукає `ANDROID_HOME` (не тільки `ANDROID_SDK`). Для локального білду експортувати ОБИДВА:
`export ANDROID_HOME=/opt/android-sdk ANDROID_SDK=/opt/android-sdk JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64` (WSL: SDK у `/opt/android-sdk`, JDK17).
Локальний білд повільний (WSL + native C++ для 4 архітектур ~20-40 хв) і може зависнути.

### 5. Хмарний білд (рекомендовано)
Через WSL (cmd не бачить `eas`):
`wsl.exe -e bash -lc 'cd /mnt/c/Users/DELL/Sapphire && eas build --profile development --platform android --non-interactive --no-wait'`
Дає URL білду (https://expo.dev/accounts/mike2424/projects/sapphire/builds/<id>). Коли `finished` → APK URL у "Application Archive URL".
Скачати: `curl -L -o sapphire-dev.apk <APK_URL>` (шлях Windows `C:/...`, не MSYS!).
Встановити: `adb install -r "C:/.../sapphire-dev.apk"`.

### 6. Metro не бачить модуль (UnableToResolveError react-native-mmkv)
Після `npm install` СТАРИЙ Metro на 8081 тримає кеш → нова версія не резолвиться.
FIX: вбити старого Metro (`netstat -ano | grep :8081` → `taskkill /PID <holder> /F`), видалити `.expo` + `node_modules/.cache`, запустити `expo start --clear`.
⚠️ `npm install` іноді залишає ПОРОЖНЮ папку `node_modules/react-native-mmkv` (зрив докачки) — перевірити `ls node_modules/react-native-mmkv/lib/`, якщо пусто → `rm -rf` + `npm install` знову.

### 7. LAN IP для телефону
НЕ `172.31.144.1` (WSL віртуалка). Реальний WiFi IP ПК дивитись `ipconfig` → Ethernet IPv4 (зазвичай `192.168.1.x`). Телефон і ПК в одній підмережі.

## Перевірка перед білдом
- `npm i expo-dev-client@~6.0.21`
- `npm i react-native-mmkv@2.12.2` (для dev-client)
- `eas build --profile development --platform android` (хмара)
- встановити APK, запустити Metro, відкрити Sapphire.

## Play Console
Package `com.mike.wolfskin` (не міняти). Назва апки = Sapphire. Internal testing трек створений, AAB неактивний (треба список тестерів + Roll out). Production гейт: ≥14 днів + ≥20 реальних тестерів.
