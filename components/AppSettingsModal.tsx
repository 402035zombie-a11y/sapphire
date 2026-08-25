// components/AppSettingsModal.tsx
// Модалка настроек ВСЕГО ПРИЛОЖЕНИЯ (не ридера): тема, язык перевода, бэкенд, ключ, бэкап.
// Шрифты/отступы ридера живут внутри ридера (FontSettingsSheet) — здесь их нет.
import ModalSheet from '../components/ModalSheet';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Platform, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/constants';
import { useAdaptive } from '../theme/useAdaptive';
import { useSettingsStore } from '../store/settingsStore';
import { useLibraryStore } from '../store/libraryStore';
import { useDictionaryStore } from '../store/dictionaryStore';
import { useT } from '../i18n';
import { THEME_ORDER, THEME_LABELS, ThemeMode } from '../theme/themes';
import { LANGUAGES } from '../utils/languages';
import { neuInset, neuPrimary, neuCircle, neuShadowPad , metal } from '../theme/neu';
import Icon from './Icon';
import LanguagePicker from './LanguagePicker';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AppSettingsModal({ visible, onClose }: Props) {
  const theme = useTheme();
  const a = useAdaptive();
  const m = a.modal();
  const t = useT();
  const { setTheme, appLang, setAppLang } = useSettingsStore();
  const currentTheme = useSettingsStore((s) => s.theme);
  const books = useLibraryStore((s) => s.books);
  const dictionary = useDictionaryStore((s) => s.entries);
  const [appLangPicker, setAppLangPicker] = useState(false);

  const exportData = () => {
    const payload = {
      app: 'Sapphire',
      exportedAt: new Date().toISOString(),
      library: books.map((b) => ({
        id: b.id, title: b.title, author: b.author,
        language: b.language, targetLang: b.targetLang,
        progress: b.progress, lastPosition: b.lastPosition, bookmarks: b.bookmarks,
      })),
      dictionary,
    };
    const json = JSON.stringify(payload, null, 2);
    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const el = document.createElement('a');
      el.href = url; el.download = 'bookreader-backup.json';
      el.click();
      URL.revokeObjectURL(url);
    } else {
      Alert.alert(t('Export'), t('On this platform export is available in the web version.'));
    }
  };

  return (
    <>
      <ModalSheet visible={visible} onClose={onClose}>
        <View style={{ width: '100%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ flex: 1, fontSize: a.h2, fontFamily: FONTS.bold, color: theme.primaryText }}>{t('App settings')}</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={10}
            style={[metal(theme, 'circle', { size: a.fab() }), { position: 'absolute', top: m.padding, right: m.padding, zIndex: 20, padding: 0 }]}
          >
            <Icon name="close" size={a.icon(20)} color={theme.secondaryText} />
          </TouchableOpacity>

          <ScrollView style={{ marginTop: a.gap }} contentContainerStyle={{ padding: neuShadowPad(12) }} showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: a.fs(14), color: theme.secondaryText, marginBottom: 8, marginTop: 4 }}>{t('Theme')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: a.gap }}>
              {THEME_ORDER.map((tm: ThemeMode) => {
                const active = currentTheme === tm;
                return (
                  <TouchableOpacity
                    key={tm}
                    style={[
                      active
                        ? { ...metal(theme, 'primary', { radius: a.radius }), backgroundColor: theme.primary }
                        : metal(theme, 'convexConcave', { radius: a.radius, strength: 0.85 }),
                      { flex: 1, minWidth: 84, paddingVertical: a.tiny ? 9 : 12, alignItems: 'center' },
                    ]}
                    onPress={() => setTheme(tm)}
                  >
                    <Text style={{ fontSize: a.body, fontFamily: FONTS.bold, color: active ? theme.onPrimary : theme.primaryText }}>{t(THEME_LABELS[tm])}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ fontSize: a.fs(14), color: theme.secondaryText, marginBottom: 8, marginTop: 4 }}>{t('App language')}</Text>
            <TouchableOpacity
              style={[metal(theme, 'inset', { radius: a.radius }), { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: a.tiny ? 9 : 12, paddingHorizontal: 14, minHeight: a.hit, marginBottom: a.gap }]}
              onPress={() => setAppLangPicker(true)}
            >
              <Text style={{ fontSize: a.body, color: theme.primaryText }}>
                {LANGUAGES.find((l) => l.code === appLang)?.name ?? appLang}
              </Text>
              <Text style={{ color: theme.secondaryText }}>▾</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: a.fs(14), color: theme.secondaryText, marginBottom: 8 }}>{t('Data')}</Text>
            <TouchableOpacity
              style={[metal(theme, 'primary', { radius: a.radius }), { paddingVertical: a.tiny ? 10 : 14, alignItems: 'center', justifyContent: 'center', width: '100%' }]}
              onPress={exportData}
            >
              <Text style={{ color: theme.onPrimary, fontSize: a.body, fontFamily: FONTS.bold }}>{t('Export backup (JSON)')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ModalSheet>

      <LanguagePicker
        visible={appLangPicker}
        value={appLang}
        allowAuto={false}
        options={[
          { code: 'auto', name: 'Auto', en: 'Auto' },
          { code: 'system', name: 'As in system', en: 'As in system' },
          ...LANGUAGES.filter((l) => l.code !== 'auto' && l.code !== 'ru'),
        ]}
        onSelect={(code) => setAppLang(code)}
        onClose={() => setAppLangPicker(false)}
      />
    </>
  );
}
