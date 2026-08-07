// screens/SettingsScreen.tsx
// Настройки: целевой язык, бэкенд перевода и пользовательский API-ключ.
// Сценарий «пользователь тратит свой лимит»: он вводит свой ключ (DeepL Free / Google Cloud).
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { COLORS, SIZES, FONTS } from '../theme/constants';
import { useSettingsStore } from '../store/settingsStore';
import { LANGUAGES } from '../utils/languages';
import LanguagePicker from '../components/LanguagePicker';
import { TranslationBackend } from '../services/translationService';

const BACKENDS: { id: TranslationBackend; label: string; needsKey: boolean }[] = [
  { id: 'googleGtx', label: 'Google (бесплатно, без ключа)', needsKey: false },
  { id: 'googlePaid', label: 'Google Cloud (свой ключ)', needsKey: true },
  { id: 'deepl', label: 'DeepL (свой ключ)', needsKey: true },
];

export default function SettingsScreen() {
  const { backend, apiKey, targetLang, setBackend, setApiKey, setTargetLang } = useSettingsStore();
  const [langPicker, setLangPicker] = useState(false);

  const onBackend = (b: TranslationBackend, needsKey: boolean) => {
    setBackend(b);
    if (!needsKey && apiKey) {
      // при возврате на бесплатный — ключ больше не нужен, но не стираем его
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.section}>Переводить на язык:</Text>
      <TouchableOpacity style={styles.langButton} onPress={() => setLangPicker(true)}>
        <Text style={styles.langButtonText}>
          {LANGUAGES.find((l) => l.code === targetLang)?.name ?? targetLang}
        </Text>
        <Text style={styles.arrow}>▾</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Поставщик перевода:</Text>
      {BACKENDS.map((b) => (
        <TouchableOpacity
          key={b.id}
          style={[styles.backendRow, backend === b.id && styles.backendActive]}
          onPress={() => onBackend(b.id, b.needsKey)}
        >
          <Text style={[styles.backendText, backend === b.id && styles.backendTextActive]}>{b.label}</Text>
          {backend === b.id && <Text style={styles.check}>✓</Text>}
        </TouchableOpacity>
      ))}

      <Text style={styles.section}>Ваш API-ключ (необязательно):</Text>
      <TextInput
        style={styles.input}
        value={apiKey}
        onChangeText={setApiKey}
        placeholder="оставьте пустым для бесплатного"
        placeholderTextColor={COLORS.secondaryText}
        autoCapitalize="none"
        secureTextEntry
      />
      <Text style={styles.hint}>
        Введите свой ключ DeepL Free или Google Cloud — запросы пойдут от вашего аккаунта/квоты.
      </Text>

      <LanguagePicker
        visible={langPicker}
        value={targetLang}
        allowAuto={false}
        onSelect={(code) => setTargetLang(code)}
        onClose={() => setLangPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SIZES.padding },
  section: { fontSize: 14, color: COLORS.secondaryText, marginTop: SIZES.gap, marginBottom: 8 },
  langButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  langButtonText: { color: COLORS.primaryText, fontSize: 15 },
  arrow: { color: COLORS.secondaryText },
  backendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  backendActive: { borderColor: COLORS.primary, backgroundColor: COLORS.selected },
  backendText: { color: COLORS.primaryText, fontSize: 15 },
  backendTextActive: { fontFamily: FONTS.bold, color: COLORS.primary },
  check: { color: COLORS.primary },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.primaryText,
  },
  hint: { color: COLORS.secondaryText, fontSize: 12, marginTop: 8, lineHeight: 18 },
});
