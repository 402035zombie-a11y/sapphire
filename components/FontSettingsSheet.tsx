// components/FontSettingsSheet.tsx
// Попап настроек шрифта ридера: размер, интерлиньяж, отступ от края, выравнивание.
// Читает/пишет reader-секцию settingsStore.
// Поля ввода с +/− по бокам вместо ползунков (по требованию).
import ModalSheet from '../components/ModalSheet';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { useAdaptive, Adaptive } from '../theme/useAdaptive';
import { useTheme } from '../theme/ThemeContext';
import { useSettingsStore } from '../store/settingsStore';
import { ThemeMode } from '../theme/themes';
import Icon from '../components/Icon';
import { FONTS } from '../theme/constants';
import { neuInset, neuRaised, neuCircle , metal } from '../theme/neu';
import { useT } from '../i18n';
import { langName, translatableLangs } from '../utils/languages';
import LanguagePicker from './LanguagePicker';

interface Props {
  visible: boolean;
  mode?: 'read' | 'dual';
  onClose: () => void;
}

const THEMES: { id: ThemeMode; label: string }[] = [
  { id: 'day', label: "Day" },
  { id: 'night', label: "Night" },
];

function NumberStepper({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  st,
  a,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
  st: ReturnType<typeof makeStyles>;
  a: Adaptive;
}) {
  const theme = useTheme();
  const styles = st;
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const v = Number.isFinite(value) ? value : min;
  return (
    <View style={styles.stepperBlock}>
      <Text style={[styles.stepperLabel, { color: theme.primaryText }]}>{label}</Text>
      <View style={[styles.stepperRow]}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(clamp(v - step))} hitSlop={4}>
          <Text style={[styles.stepSign, { color: theme.primaryText }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.stepperVal, { color: theme.primaryText }]}>
          {Math.round(v * 10) / 10}
          {suffix}
        </Text>
        <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(clamp(v + step))} hitSlop={4}>
          <Icon name="plus" size={a.icon(18)} color={theme.primaryText} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FontSettingsSheet({ visible, mode = 'dual', onClose }: Props) {
  const theme = useTheme();
  const t = useT();
  const a = useAdaptive();
  const styles = React.useMemo(() => makeStyles(a, theme), [a, theme]);
  const reader = useSettingsStore((s) => s.reader);
  const setReader = useSettingsStore((s) => s.setReader);
  const appTheme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const targetLang = useSettingsStore((s) => s.targetLang);
  const setTargetLang = useSettingsStore((s) => s.setTargetLang);
  const [langPicker, setLangPicker] = React.useState(false);

  if (!visible) return null;

  return (
    <ModalSheet visible={visible} onClose={onClose} blurBackdrop={false} panelStyle={[styles.card, a.landscape && { paddingRight: 0 }]}>
      <View style={{ width: '100%' }}>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={10}
          style={[metal(theme, 'stamp', { size: a.fab() }), { position: 'absolute', top: a.pad, right: a.pad, zIndex: 20, padding: 0 }]}
        >
          <Icon name="close" size={a.icon(22)} color={theme.secondaryText} />
        </TouchableOpacity>
          <ScrollView
            style={{ maxHeight: Math.round(a.height * (a.landscape ? 0.72 : 0.78)) }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >

          <NumberStepper label={t("Font size")} value={reader.fontSize} min={12} max={32} step={1} suffix=" px" onChange={(v) => setReader({ fontSize: v })} st={styles} a={a} />
          <NumberStepper label={t("Line height")} value={reader.lineHeight} min={1} max={2.2} step={0.1} onChange={(v) => setReader({ lineHeight: v })} st={styles} a={a} />
          <NumberStepper label={t("Window edge padding")} value={reader.margin} min={0} max={64} step={2} suffix=" px" onChange={(v) => setReader({ margin: v })} st={styles} a={a} />

          {/* Font face — гарнитура */}
          <View style={styles.sectionLabelWrap}>
            <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>{t("Font")}</Text>
            <View style={styles.chipRow}>
              {[
                { id: 'default', label: "System" },
                { id: 'serif', label: "Serif" },
                { id: 'sans', label: "Sans-serif" },
                { id: 'mono', label: "Mono" },
              ].map((f) => {
                const active = reader.fontFamily === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.chip, active && { ...metal(theme, 'inset', { radius: 8 }), backgroundColor: theme.selected }]}
                    onPress={() => setReader({ fontFamily: f.id })}
                  >
                    <Text style={[styles.chipText, { color: active ? '#fff' : theme.primaryText }]}>{t(f.label)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Font thickness — жирность */}
          <NumberStepper label={t("Font weight")} value={reader.fontWeight} min={300} max={800} step={100} onChange={(v) => setReader({ fontWeight: v })} st={styles} a={a} />

          {/* Text align — выравнивание: в режиме перевода (dual) не нужно (лейаут диктует выравнивание) */}
          {mode !== 'dual' && (
          <View style={styles.sectionLabelWrap}>
            <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>{t("Text alignment")}</Text>
            <View style={styles.chipRow}>
              {[
                { id: 'left', label: "Left" },
                { id: 'justify', label: "Justified" },
                { id: 'hyphenation', label: "Hyphenation" },
              ].map((al) => {
                const active = reader.textAlign === al.id;
                return (
                  <TouchableOpacity
                    key={al.id}
                    style={[styles.chip, active && { ...metal(theme, 'inset', { radius: 8 }), backgroundColor: theme.selected }]}
                    onPress={() => setReader({ textAlign: al.id as any })}
                  >
                    <Text style={[styles.chipText, { color: active ? '#fff' : theme.primaryText }]}>{t(al.label)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          )}

          {/* Page flipping — направление */}
          <View style={styles.sectionLabelWrap}>
            <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>{t("Page flipping")}</Text>
            <View style={styles.chipRow}>
              {[
                { id: 'vertical', label: "Vertical" },
                { id: 'horizontal', label: "Horizontal" },
              ].map((p) => {
                const active = reader.pageFlip === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.chip, active && { ...metal(theme, 'inset', { radius: 8 }), backgroundColor: theme.selected }]}
                    onPress={() => setReader({ pageFlip: p.id as any })}
                  >
                    <Text style={[styles.chipText, { color: active ? '#fff' : theme.primaryText }]}>{t(p.label)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: theme.primaryText }]}>{t("Page margins")}</Text>
            <Switch
              value={reader.pageMargins}
              onValueChange={(v) => setReader({ pageMargins: v })}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: theme.primaryText }]}>{t("Speak button (▶) next to paragraph")}</Text>
            <Switch
              value={reader.showSpeakButton ?? true}
              onValueChange={(v) => setReader({ showSpeakButton: v })}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#fff"
            />
          </View>

          {mode === 'read' && (
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: theme.primaryText }]}>{t("Justify text")}</Text>
              <Switch
                value={reader.justify}
                onValueChange={(v) => setReader({ justify: v })}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#fff"
              />
            </View>
          )}

          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: theme.primaryText }]}>{t("“Translate” button (⇄) next to paragraph")}</Text>
            <Switch
              value={reader.showTranslateButton ?? true}
              onValueChange={(v) => setReader({ showTranslateButton: v })}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.sectionLabelWrap}>
            <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>{t("Color theme")}</Text>
            <View style={styles.chipRow}>
              {THEMES.map((th) => {
                const active = appTheme === th.id;
                return (
                  <TouchableOpacity
                    key={th.id}
                    style={[styles.chip, active && { ...metal(theme, 'inset', { radius: 8 }), backgroundColor: theme.selected }]}
                    onPress={() => setTheme(th.id)}
                  >
                    <Text style={[styles.chipText, { color: active ? '#fff' : theme.primaryText }]}>{t(th.label)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {mode === 'dual' && (
            <View style={styles.sectionLabelWrap}>
              <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>{t('Translation language')}</Text>
              <TouchableOpacity
                style={[{ borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: a.tiny ? 9 : 12, paddingHorizontal: 14, minHeight: a.hit, marginTop: 4, borderRadius: a.radius }]}
                onPress={() => setLangPicker(true)}
              >
                <Text style={{ fontSize: a.body, color: theme.primaryText }}>
                  {translatableLangs().find((l) => l.code === targetLang)?.name ?? langName(targetLang)}
                </Text>
                <Text style={{ color: theme.secondaryText }}>▾</Text>
              </TouchableOpacity>
            </View>
          )}
          <LanguagePicker
            visible={langPicker}
            value={targetLang}
            allowAuto={false}
            exclude={['ru']}
            onSelect={(code) => setTargetLang(code)}
            onClose={() => setLangPicker(false)}
          />
          </ScrollView>
      </View>
    </ModalSheet>
  );
}

function makeStyles(a: Adaptive, theme: ReturnType<typeof useTheme>) {
  const sheetWidth = a.sheetW as any;
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'center',
      alignItems: a.width < 480 ? 'center' : 'flex-end',
      paddingRight: a.width < 480 ? 0 : Math.round(a.pad * 0.8),
      paddingVertical: a.tiny ? 6 : 10,
    },
    capture: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#00000066' },
    card: {
      width: sheetWidth,
      maxWidth: Math.min(a.width - 16, 460),
      maxHeight: a.height * (a.landscape ? 0.94 : 0.88),
      borderRadius: a.width < 480 ? a.radius : 0,
      borderTopLeftRadius: a.radius + 2,
      borderBottomLeftRadius: a.radius + 2,
    },
    scrollContent: { padding: a.pad, gap: Math.max(8, Math.round(a.gap * 0.8)), paddingBottom: a.pad },
    stepperBlock: { gap: 4 },
    stepperLabel: { fontSize: a.fs(14) },
    stepperRow: {
      backgroundColor: theme.neu.base,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      minHeight: a.tiny ? 34 : 40,
    },
    stepBtn: { ...metal(theme, 'circle', { size: a.tiny ? 30 : 36 }), paddingVertical: a.tiny ? 4 : 6, paddingHorizontal: a.tiny ? 10 : 14 },
    stepSign: { fontSize: a.fs(20), fontFamily: FONTS.bold },
    stepperVal: { fontSize: a.body, fontFamily: FONTS.bold },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2, gap: 8 },
    toggleLabel: { fontSize: a.fs(14), flex: 1 },
    sectionLabelWrap: { gap: 6, marginTop: 2 },
    sectionLabel: { fontSize: a.fs(12), fontFamily: FONTS.bold },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      ...metal(theme, 'raised', { radius: 8 }),
      paddingVertical: a.tiny ? 5 : 7,
      paddingHorizontal: a.tiny ? 9 : 12,
      borderRadius: 8,
      borderWidth: 0,
    },
    chipText: { fontSize: a.fs(12), fontFamily: FONTS.bold },
  });
}
