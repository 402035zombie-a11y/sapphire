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

interface Props {
  visible: boolean;
  mode?: 'read' | 'dual' | 'speed';
  onClose: () => void;
}

const THEMES: { id: ThemeMode; label: string }[] = [
  { id: 'day', label: "Day" },
  { id: 'night', label: "Night" },
  { id: 'blackout', label: "Blackout" },
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
  // Debounce оновлення reader: швидкі тапи +/- не спричиняють десятки re-render ReaderScreen
  // (lineHeight/margin тригерять re-layout всього ScrollView → лаг 5-10с на великих книгах).
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const setReaderDebounced = React.useCallback((patch: any) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setReader(patch), 500);
  }, [setReader]);
  const appTheme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  if (!visible) return null;

  return (
    <ModalSheet visible={visible} onClose={onClose} blurBackdrop={false} dimBackdrop={false} role="raised" panelStyle={[styles.card, a.landscape && { paddingRight: 0 }]}>
      <View style={{ width: '100%' }}>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={10}
          style={[metal(theme, 'circle', { size: a.fab() }), { position: 'absolute', top: a.pad, right: a.pad, zIndex: 20, padding: 0 }]}
        >
          <Icon name="close" size={a.icon(22)} color={theme.secondaryText} />
        </TouchableOpacity>
          <ScrollView
            style={{ maxHeight: Math.round(a.height * (a.landscape ? 0.72 : 0.78)) }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >

          <NumberStepper label={t("Font size")} value={reader.fontSize} min={12} max={32} step={1} suffix=" px" onChange={(v) => setReaderDebounced({ fontSize: v })} st={styles} a={a} />
          <NumberStepper label={t("Line height")} value={reader.lineHeight} min={1} max={2.2} step={0.1} onChange={(v) => setReaderDebounced({ lineHeight: v })} st={styles} a={a} />
          <NumberStepper label={t("Text side margins")} value={reader.margin} min={-64} max={64} step={2} suffix=" px" onChange={(v) => setReaderDebounced({ margin: v })} st={styles} a={a} />
          <NumberStepper label={t("Letter spacing")} value={reader.letterSpacing} min={0} max={6} step={0.5} suffix=" px" onChange={(v) => setReaderDebounced({ letterSpacing: v })} st={styles} a={a} />
          <NumberStepper label={t("Paragraph spacing")} value={reader.paragraphSpacing} min={0} max={48} step={2} suffix=" px" onChange={(v) => setReaderDebounced({ paragraphSpacing: v })} st={styles} a={a} />

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
                    style={[metal(theme, active ? 'primary' : 'inset', { radius: 8 }), styles.chip, active && { backgroundColor: theme.primary }]}
                    onPress={() => setReader({ fontFamily: f.id })}
                  >
                    <Text style={[styles.chipText, { color: active ? theme.onPrimary : theme.primaryText }]}>{t(f.label)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Font thickness — жирность */}
          <NumberStepper label={t("Font weight")} value={reader.fontWeight} min={300} max={800} step={100} onChange={(v) => setReaderDebounced({ fontWeight: v })} st={styles} a={a} />

          {/* Text align — выравнивание: в режиме перевода (dual) не нужно (лейаут диктует выравнивание) */}
          {mode !== 'dual' && (
          <View style={styles.sectionLabelWrap}>
            <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>{t("Text alignment")}</Text>
            <View style={styles.chipRow}>
              {[
                { id: 'left', label: "Left" },
                { id: 'justify', label: "Justified" },
                { id: 'hyphenation', label: "Justified + hyphens" },
              ].map((al) => {
                const active = reader.textAlign === al.id;
                return (
                  <TouchableOpacity
                    key={al.id}
                    style={[metal(theme, active ? 'primary' : 'inset', { radius: 8 }), styles.chip, active && { backgroundColor: theme.primary }]}
                    onPress={() => setReader({ textAlign: al.id as any })}
                  >
                    <Text style={[styles.chipText, { color: active ? theme.onPrimary : theme.primaryText }]}>{t(al.label)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          )}

          {/* Page margins тепер через stepper (внутрішній паддінг рядків), а не тумблер */}
          <NumberStepper label={t("Paragraph side padding")} value={reader.pageMarginPx ?? 12} min={-32} max={32} step={2} suffix=" px" onChange={(v) => setReaderDebounced({ pageMarginPx: v })} st={styles} a={a} />

          {mode !== 'read' && (
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: theme.primaryText }]}>{t("Speak button (▶) next to paragraph")}</Text>
            <Switch
              value={reader.showSpeakButton ?? true}
              onValueChange={(v) => setReader({ showSpeakButton: v })}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#fff"
            />
          </View>
          )}

          {/* МЕРТВИЙ ДУБЛЬ ПРИБРАНО: тумблер "Justify text" (reader.justify) ніде не використовувався —
              вирівнювання керується виключно чипами Text alignment (reader.textAlign). */}

          {mode !== 'read' && (
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: theme.primaryText }]}>{t("“Translate” button (⇄) next to paragraph")}</Text>
            <Switch
              value={reader.showTranslateButton ?? true}
              onValueChange={(v) => setReader({ showTranslateButton: v })}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#fff"
            />
          </View>
          )}

          <View style={styles.sectionLabelWrap}>
            <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>{t("Color theme")}</Text>
            <View style={styles.chipRow}>
              {THEMES.map((th) => {
                const active = appTheme === th.id;
                return (
                  <TouchableOpacity
                    key={th.id}
                    style={[metal(theme, active ? 'primary' : 'inset', { radius: 8 }), styles.chip, active && { backgroundColor: theme.primary }]}
                    onPress={() => setTheme(th.id)}
                  >
                    <Text style={[styles.chipText, { color: active ? theme.onPrimary : theme.primaryText }]}>{t(th.label)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
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
      borderRadius: a.radius + 4,
    },
    scrollContent: { padding: a.pad, paddingTop: a.fab() + a.pad * 1.5, gap: Math.max(8, Math.round(a.gap * 0.8)), paddingBottom: a.pad },
    stepperBlock: { gap: 4 },
    stepperLabel: { fontSize: a.fs(14) },
    stepperRow: {
      backgroundColor: 'transparent',
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
