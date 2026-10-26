# ПРОТОКОЛ БІЛДУ SAPPHIRE — без 100% CPU / RAM

> Машина: Windows 10, **15.7 GB RAM**, 6 ядер. WSL2 + Ubuntu, Android SDK всередині WSL.
> Білд — це **memory-bound** задача, не CPU-bound. 100% CPU майже завжди означає, що
> машина товарить RAM (swap/tmpfs), а не реально рахує.

---

## 0. Чому буває 100% — 8 кореневих причин (і фікс кожної)

| # | Причина | Симптом | Фікс |
|---|---|---|---|
| 1 | **Компілюються 4 ABI** | білд іде 4× довше, OOM у `buildCMakeRelWithDebInfo` | `android.buildArchs: ["arm64-v8a"]` |
| 2 | **`/tmp` = tmpfs (на RAM)** | `No space left on device` у `:app:mergeReleaseJavaResource`, хоча `df -h /` показує терабайти вільних | `TMPDIR=/var/tmp` |
| 3 | **WSL без swap** | лог застигає посеред таски, `WSAETIMEDOUT`, дистрибутив "Running" | `.wslconfig` з `swap=8GB` |
| 4 | **Осиротілі демони копляться** | 2–3 GB тримають Gradle/Kotlin/clang++ між спробами | `pre-build-cleanup.ps1` |
| 5 | **Два білди одночасно** | другий cleanup вбиває перший білд | `.sapphire-build.lock` |
| 6 | **Рекурсивний `find`/`grep`** | ядро зависло на години, `find.exe` у списку процесів | `search_files` або `find -maxdepth` |
| 7 | **`export VAR=val cmd`** | eas не запускається, exit code виглядає чисто | форма `VAR=val cmd` |
| 8 | **Немає `ANDROID_HOME`** | `SDK location not found` на gradle configure | задати `ANDROID_HOME` + `ANDROID_SDK` |

### #1 — ABI-фільтр мовчки ігнорується, якщо вказати не той ключ
`expo-build-properties` **не має поля `gradleProperties`**. Цей код — мертвий:
```js
android: { gradleProperties: { reactNativeArchitectures: "arm64-v8a" } }   // ІГНОРУЄТЬСЯ
```
Плагін викидає ключ → `android/gradle.properties` лишає дефолт
`armeabi-v7a,arm64-v8a,x86,x86_64` → **компілюються всі 4 ABI**. Кожен зайвий ABI
множить час CMake/clang++ і пікову RAM, і на 15.7 GB білд вмирає від OOM.

**Правильно:**
```js
android: { buildArchs: ["arm64-v8a"] }
```
**Перевіряти ЗАВЖДИ згенерований файл, не конфіг:**
```bash
grep reactNativeArchitectures android/gradle.properties   # має бути ТІЛЬКИ arm64-v8a
```
Ознака, що фільтр не застосувався: у логу є `buildCMakeRelWithDebInfo[armeabi-v7a]`
або `[x86]`. Тільки `[arm64-v8a]` = фільтр працює.

Трейд-офф: arm64-v8a покриває фізичний пристрій (23124RA7EO). Google Play також хоче
`armeabi-v7a` для 32-бітного покриття — повертати ТІЛЬКИ для release/AAB, і тільки якщо
машина це витримує.

### #2 — `/tmp` це RAM, а не диск
```
Filesystem      Size  Used Avail Use% Mounted on
tmpfs           3.9G     0  3.9G   0% /tmp      <-- RAM-backed, ліміт 3.9 GB
```
`eas-cli` рахує temp-каталог через `env-paths` → `path.join(os.tmpdir(), 'eas-cli')`,
тому весь workingdir (копія проєкту + node_modules + Gradle-проміжні файли) лежить у `/tmp`.
Повний RN-білд там перевищує 3.9 GB → ENOSPC. **Це ж причина, чому VM клинить:**
витрати на tmpfs = витрати RAM, тож #2 і #3 — один ресурс.

**Порядок діагностики ENOSPC:** спочатку `df -h /tmp` (ліміт tmpfs), потім `df -h /`
і `df -i /` (реальний диск, іноди). Не роби висновок "диск заповнений" лише по `/`.

### #3 — застиглий лог = КЛИНЧ VM, а не краш білду
Усі чотири разом:
- лог **застигає посеред таски**: немає ні рядка помилки, ні `BUILD FAILED`, ні `BUILD SUCCESSFUL`
- `wsl.exe -e bash -lc '...'` повертає `WSAETIMEDOUT`
- `wsl.exe -l -v` досі показує дистрибутив як `Running`
- хост здоровий (RAM вільна, орфан-процесів нуль)

Корінь: VM без swap. Під навантаженням мережевий стек guest'а помирає, і дистрибутив
стає недосяжним, хоча таблиця процесів ціла. **Робити висновок "білд упав" з застиглого
логу — неправильна діагностика**, і вона відправляє шукати неіснуючий конфіг-баг.

**Фікс — `C:/Users/DELL/.wslconfig` (перевірено, на цій машині присутній):**
```ini
[wsl2]
memory=8GB
processors=6
swap=8GB
swapfile=C:\Users\DELL\AppData\Local\Temp\wsl-swap.vhdx
guiApplications=false
```
Застосувати через `wsl.exe --shutdown`, потім перевірити: `wsl.exe -e bash -lc 'free -h'`
мусить показати рядок `Swap:` більше нуля.

Допустимі ключі в WSL 3.x — будь-який інший друкує попередження на кожному виклику і
мовчки ігнорується:
- `pageReporting` — **не є** ключем
- `networkingMode` приймає `Bridged|Consomme|Mirrored|Nat|None|VirtioProxy` — не `default`
- `firewall=true` потребує підтримки Hyper-V firewall

**Відновлення заразклининої VM:**
```bash
ps -W | grep wsl.exe              # знайти завислий wsl.exe (бік Windows)
wsl.exe --shutdown ; sleep 8      # скинути VM
wsl.exe -e bash -lc 'free -h; nproc'   # переконатися, що guest здоровий
```
Заклинина VM відновлюється чисто — переконфігуровувати білд не треба.

---

## 1. ПРОТОКОЛ — виконувати по порядку, нічого не пропускати

### Фаза 0 — pre-flight (30 секунд, ловить більшість збоїв)
```bash
# Запас RAM — треба >= 2 GB ДО старту (всього 15.7 GB на цій машині)
powershell.exe -NoProfile -Command "Get-CimInstance Win32_OperatingSystem | Select-Object @{n='FreeGB';e={[math]::Round(\$_.FreePhysicalMemory/1MB,1)}},@{n='TotalGB';e={[math]::Round(\$_.TotalVisibleMemorySize/1MB,1)}} | Format-List"

# чи не запущено вже білд
ls -la "C:/Users/DELL/AppData/Local/hermes/cache/scratch/.sapphire-build.lock" 2>/dev/null && echo "ЗАБЛОКОВАНО — не стартуй"

# здоров'я WSL-госта
wsl.exe -e bash -lc 'free -h; nproc; df -h /tmp | tail -1'

# чи застосований ABI-фільтр
grep reactNativeArchitectures android/gradle.properties   # тільки arm64-v8a
```
**Не стартуй білд**, якщо RAM < 2 GB, якщо є лок, або якщо немає ABI-фільтра.
Спочатку усунь причину.

### Фаза 1 — pre-build-cleanup (ОБОВ'ЯЗКОВО, перед кожним білдом)
```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File \
  "C:/Users/DELL/AppData/Local/hermes/skills/devops/pre-build-cleanup/scripts/pre-build-cleanup.ps1"
```
Порядок дій: бере лок → scoped-вбиває осиротілі `kotlin-daemon`/`kotlinc`/`gradle`/`java`/
`node`/`clang++`/`find`/`grep` **лише цього проєкту** (захищає `hermes/installs`,
`hermes/hermes-agent`, `hermes/agent-hooks`, тож не може вбити самого агента) →
`wsl.exe --shutdown` → перевіряє → exit 1, якщо RAM < 2 GB.

**Scoped kills критичні.** v1 вбивав усі java/gradle/node на хості, тому cleanup
другого агента вбивав запущений білд першого. Скоупи:
`eas-build-local-nodejs`, `Sapphire`, `com.mike.wolfskin`, `GradleDaemon`, `/root/.gradle`.
`GradleDaemon` МАЄ бути в списку: командні рядки демонів **не містять** шляху проєкту.

### Фаза 2 — команда білду
```bash
wsl.exe -e bash -lc 'cd /mnt/c/Users/DELL/Sapphire && \
  TMPDIR=/var/tmp \
  ANDROID_HOME=/opt/android-sdk ANDROID_SDK=/opt/android-sdk \
  JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
  EAS_SKIP_AUTO_FINGERPRINT=1 \
  eas build --local --profile preview --platform android --non-interactive \
  2>&1 | tee -a /mnt/c/Users/DELL/Desktop/HermesFiles/build-logs/build-$(date +%Y%m%d-%H%M%S).log'
```
- `TMPDIR=/var/tmp` — **обов'язково** (причина #2).
- `EAS_SKIP_AUTO_FINGERPRINT=1` — пропускає зайвий прохід фінгерпринта ассетів.
- `--profile preview` для ітерацій; `--profile production` — тільки для релізного артефакта.
- Форма `VAR=val cmd`. **Ніколи** `export A=1 B=2 eas build ...` — bash парсить це як одну
  команду `export`, eas не запускається, а exit code виглядає чисто.

**Лог писати на диск.** Ніколи `tee /tmp/*.log` — WSL VM витирає `/tmp` при кожному
`wsl --shutdown`, і корінь крашу зникає до того, як його прочитають. Шлях:
`/mnt/c/Users/DELL/Desktop/HermesFiles/build-logs/`.

### Фаза 3 — post-build-cleanup (і на успіху, і на провалі)
```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File \
  "C:/Users/DELL/AppData/Local/hermes/skills/devops/pre-build-cleanup/scripts/post-build-cleanup.ps1"
```
Звільняє лок. Без цього лок старіє через 60 хв і наступний білд даремно чекає.

### Фаза 4 — перевірити артефакт (обов'язково, перш ніж довіряти)
```bash
/c/Users/DELL/AppData/Local/Android/Sdk/build-tools/36.0.0/aapt2 \
  dump xmltree --file AndroidManifest.xml "C:/Users/DELL/Sapphire/build-<id>.apk" | grep -A2 APPLICATION_ID
/c/Users/DELL/AppData/Local/Android/Sdk/build-tools/36.0.0/aapt2 \
  dump badging "C:/Users/DELL/Sapphire/build-<id>.apk" | grep native-code
```
- `APPLICATION_ID` має бути **непорожній** (`ca-app-pub-5113967448800652~8371247908`), інакше AdMob
  падає на старті.
- `native-code` має бути рівно `'arm64-v8a'` — будь-який інший ABI означає, що `buildArchs`
  проігноровано і білд обійшовся в 4× дорожче.
- Передавати `aapt2` **Windows-шлях** (`C:/Users/...`). Це нативний бінар, він не розуміє
  MSYS-форму (`/c/Users/...`) і падає з `Unable to open ...: No such file or directory`,
  хоча файл існує. Відносний шлях теж не працює.
- Python `zipfile` для маніфесту **не працює** — це бінарний AXML. Тільки `aapt2`.

### Фаза 5 — decision log + checkpoint-коміти
Кожну спробу дописувати в `C:/Users/DELL/Desktop/HermesFiles/build-logs/decision-log-<date>.md`:
```
## Attempt N | status=pass/fail | root=<точний рядок помилки> | fix=<що змінив + коміт>
```
Чекпоінт перед кожною правкою: `git add -A && git commit -m "ckpt: <стан до фіксу>"`.
Регресія відкатується через `git revert <ckpt>` — ніколи не виводити фікс наново.

### Фаза 6 — жорсткий стоп
**Максимум три РІЗНІ кореневі причини.** Якщо спробував три різні причини і білд усе одно
падає — СТОП, і писати `build-failed-report.md` (3 спроби + фінальна помилка + обрізані логи).
Не повторювати: спроба №4 зазвичай є причиною №2 удруге (цикл, що тягне назад).
Цей стоп має пріоритет над будь-яким бюджетом циклів.

---

## 2. Моніторинг ресурсів під час білду

**Міряти ДЕЛЬТУ, ніколи кумулятивне значення.** `Get-Process CPU` — це накопичені секунди
від старту процесу; реальне навантаження = різниця двох вимірів.

```bash
# дельта RAM хоста (GB) — опитувати кожні 60с, слідкувати за підлогою
powershell.exe -NoProfile -Command "Get-CimInstance Win32_OperatingSystem | Select-Object @{n='FreeGB';e={[math]::Round(\$_.FreePhysicalMemory/1MB,1)}}"

# топ споживачів RAM на хості
powershell.exe -NoProfile -Command "Get-Process | Sort-Object WS -Descending | Select-Object -First 8 Name,@{n='RAM_MB';e={[math]::Round(\$_.WS/1MB)}},CPU | Format-Table -Auto"

# WSL-гість — це число, що справді важливе
wsl.exe -e bash -lc 'free -h; echo ---; ps -eo pcpu,pmem,comm --sort=-pcpu | head -6'
```

Інтерпретація:
- `free` в гості < 1 GB і swap зростає → білд зараз помре. Зупинити і фіксити #2/#3.
- `clang++` > 6 і росте → норма під час CMake; якщо стоїть 10+ хв, а лог застиг — VM клинить (#3).
- `java.exe` на боці **Windows** = idle-демон Android Studio Gradle = **норма**, не чіпати.
- `node.exe` = 0 і порт 8081 вільний = Metro немає = активного JS-білду немає.
- `find.exe` / `grep.exe` присутні = пішов рекурсивний пошук (#6). Вбити.

---

## 3. Жорсткі правила

**РОБИ**
- Запускати `pre-build-cleanup.ps1` перед кожним білдом.
- Ставити `TMPDIR=/var/tmp`.
- Перевіряти згенерований `android/gradle.properties`, а не конфіг.
- Тримати лог білду на `/mnt/c/...`.
- Комітити чекпоінт перед кожною правкою.
- Тримати лок весь час прогону.

**НЕ РОБИ**
- Ніколи не запускати два білди або два cleanup одночасно.
- Ніколи не робити рекурсивний `find`/`grep` по `C:\Users\DELL`.
- Ніколи не писати `export VAR=val cmd` (пастка парсингу).
- Ніколи не вбивати `python.exe` — це сам Hermes (gateway/managed_worker/kanban).
- Ніколи не вбивати `java.exe` без перевірки, що це не демон Android Studio.
- Ніколи не вважати `expo doctor` блокером — він падає на цьому проєкті і не критичний для `--local`.
- Ніколи не робити висновок "диск заповнений" лише по `df -h /`.
- Ніколи не робити висновок "білд упав" лише по застиглому логу.

---

## 4. Чекліст верифікації
- [ ] RAM вільної >= 2 GB перед стартом
- [ ] `.sapphire-build.lock` відсутній
- [ ] `reactNativeArchitectures=arm64-v8a` в `android/gradle.properties`
- [ ] `.wslconfig` має `swap=8GB` і `free -h` в гості показує Swap > 0
- [ ] `pre-build-cleanup.ps1` exit 0
- [ ] білд ішов з `TMPDIR=/var/tmp`
- [ ] `aapt2` показує непорожній `APPLICATION_ID`
- [ ] `aapt2` показує `native-code: 'arm64-v8a'` тільки
- [ ] `post-build-cleanup.ps1` виконаний, лок звільнено
- [ ] decision log доповнений

---

## 5. Пов'язані скіли
- `sapphire-build-resource-safety` — цей протокол у пам'яті агента
- `sapphire-apk-build-windows` — команда білду + build-пастки
- `pre-build-cleanup` / `self-cleanup` — скрипти чистки
- `sapphire-play-publish` — що робити з готовим AAB
