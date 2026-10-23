# ADMOB FIX GUIDE — COMPACT VERSION (for future agents)

## Problem
AdMob APPLICATION_ID is empty in the APK manifest.

## Root Cause
`app.config.js` uses `$` syntax which is **not resolved** by expo-build-properties@57.0.10:
```js
{ "$": { "android:name": "...", "android:value": "..." } }  ❌
```

## Fix
Change to proper `name/value` format (verified working in commit `37c25a20`):
```js
"meta-data": [
  { "name": "com.google.android.gms.ads.APPLICATION_ID", "value": "ca-app-pub-5113967448800652~8371247908" }
]
```

## Steps
1. Open `app.config.js`
2. Replace `$` block with `name/value`
3. Run `npx expo config --json` to verify
4. Complete EAS build (production)
5. Verify APK with:
   ```bash
   /path/to/sdk/aapt2 dump xmltree --file AndroidManifest.xml app.apk | grep APPLICATION_ID
   ```
   Expect: `android:value="ca-app-pub-..."`

## Testing
After build, open APK in any APK extractor and check MANIFEST:

```xml
<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-5113967448800652~8371247908" />
```

---

## REMEMBER
- **NEVER use `$` syntax** for meta-data with expo-build-properties@57.0.10
- **ALWAYS hardcode values** (do NOT use process.env for AdMob ID)
- **NEVER use `react-native-google-mobile-ads` plugin** (breaks EAS)
- **ALWAYS verify** APK after build completes

## Current State
- ✅ App.config.js fixed (name/value)
- ❌ Build 1a816bc1 (production) errored (no error logs visible)
- ❌ Phone connected via ADB (`1d32a2e2` device present)
- ❌ Need to complete/retry build after fixing EAS build process

## WORKAROUND (if builds continue to fail)
If EAS builds keep failing:
1. Use local Gradle build instead
2. Skip EAS and publish directly to Play Console
3. Use `npx expo build:android --configuration release` locally

---

## ERROR CHECKLIST (when AdMob breaks again)
1. Check `app.config.js` for `$` syntax
2. Verify expo-build-properties version in package.json
3. Confirm `npx expo config --json` resolves the value
4. Verify APK with aapt2
5. Ensure `react-native-google-mobile-ads` plugin is NOT in project

---

## Production ID (MUST NOT CHANGE)
```
current: ca-app-pub-5113967448800652~8371247908
```
