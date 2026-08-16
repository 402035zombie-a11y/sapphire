// components/SentenceRow.tsx
// Одна строка чтения: оригинал + per-paragraph перевод (перевод подгружается автоматически
// при скролле/простое >3с), кнопка ▶ слева — озвучка абзаца. КАЖДОЕ слово (токен с буквами)
// кликабельно -> словарь.
// Кликабельность реализована через Text.onPress (валидно в RN/RN-web), а не TouchableOpacity
// внутри текста, который ломает инлайн-вёрстку и часть слов перестаёт ловить тап.
import React, { useMemo, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/constants';
import { useAdaptive } from '../theme/useAdaptive';
import { metal, neuShadowPad, screenBg, metalText } from '../theme/neu';

interface Props {
  index: number;
  original: string;
  translation?: string;
  loading?: boolean;
  showTranslation?: boolean;
  fontSize?: number;
  lineHeight?: number;
  justify?: boolean;
  query?: string;
  bookmarked?: boolean;
  forceHideTranslation?: boolean;
  mode?: 'read' | 'dual' | 'speed';
  fontFamily?: string;
  fontWeight?: number;
  textAlign?: 'left' | 'justify' | 'hyphenation';
  pageMargins?: boolean;
  onToggleBookmark?: () => void;
  onCopy?: () => void;
  onSpeak: (text: string) => void;
  onTranslate?: (index: number) => void;
  showSpeak?: boolean;
  showTranslate?: boolean;
  onWordPress: (word: string, sentence: string) => void;
  onRowLayout?: (index: number, height: number) => void;
}

// делим по пробелам, сохраняя сами пробелы как токены
function tokenize(text: string): string[] {
  // split без capturing group — пробіли видаляються, проміжки додаються у renderToken через {' '}
  return text.split(/\s+/).filter((t) => t.length > 0);
}

// слово = токен, содержащий хотя бы одну букву (любого алфавита)
function isWordToken(tok: string): boolean {
  return /\p{L}/u.test(tok);
}

// Підсвітка збігів пошуку ОДНИМ Text (без токенізації → пробіли зберігаються).
// Повертає масив React-елементів: звичайний текст + <Text> з highlight для збігів.
function highlightMatches(text: string, query: string, theme: any): React.ReactNode[] {
  if (!query) return [text];
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) {
      parts.push(text.slice(i));
      break;
    }
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <Text key={key++} style={{ backgroundColor: theme.highlight, color: theme.readerText }}>
        {text.slice(idx, idx + q.length)}
      </Text>,
    );
    i = idx + q.length;
  }
  return parts;
}

function SentenceRow({
  index,
  original,
  translation,
  showTranslation,
  fontSize,
  lineHeight,
  query,
  forceHideTranslation,
  mode = 'dual',
  fontFamily = 'default',
  fontWeight = 400,
  textAlign = 'justify',
  pageMargins = true,
  onSpeak,
  onTranslate,
  showSpeak,
  showTranslate,
  onWordPress,
  onRowLayout,
}: Props) {
  const theme = useTheme();
  const a = useAdaptive();
  const fs = fontSize ?? 18;
  const lh = Math.max(lineHeight ?? 1.4, 1.8) * fs;
  const open = !forceHideTranslation && (!!translation || showTranslation);
  const textAlignValue = textAlign === 'justify' ? 'justify' : textAlign === 'hyphenation' ? 'justify' : 'left';
  const hyphenation = textAlign === 'hyphenation';
  const fontFamilyValue =
    fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif'
    : fontFamily === 'sans' ? 'Arial, Helvetica, sans-serif'
    : fontFamily === 'mono' ? '"Courier New", monospace'
    : undefined;
  const baseText = {
    fontFamily: fontFamilyValue,
    fontWeight: fontWeight as any,
    textAlign: textAlignValue as any,
    ...(hyphenation ? { hyphenationFactor: 1, wordBreak: 'break-word' } as any : null),
  };
  const q = (query ?? '').trim().toLowerCase();
  // токенизируем только когда меняется исходник (иначе пересоздание массива на каждый рендер)
  const tokens = useMemo(() => tokenize(original), [original]);

  const renderToken = (tok: string, i: number) => {
    const isWord = isWordToken(tok);
    const lower = tok.toLowerCase();
    const hit = q.length > 0 && lower.includes(q);
    const base = [baseText, { color: theme.readerText }];

    if (hit) {
      return (
        <Text key={i} style={[styles.word, { backgroundColor: theme.highlight, color: theme.readerText }]}>
          {tok}{'\u00A0'}
        </Text>
      );
    }
    if (isWord) {
      return (
        <TouchableOpacity key={i} onPress={() => onWordPress(tok, original)} hitSlop={2}>
          <Text style={[...base, styles.tapWord]}>{tok}{'\u00A0'}</Text>
        </TouchableOpacity>
      );
    }
    // пунктуация / пробелы — обычный текст, не кликабельны
    return <Text key={i} style={base}>{tok}{'\u00A0'}</Text>;
  };

  const isPlain = mode === 'read';

  return (
    <View style={[styles.row, isPlain && styles.rowPlain, pageMargins ? { paddingHorizontal: Math.round(12 * a.scale) } : null, { borderBottomColor: theme.border }]} onLayout={(e) => onRowLayout?.(index, Math.round((e.nativeEvent?.layout?.height) || 0))}>
      {!isPlain && (showSpeak || (onTranslate && !translation && showTranslate)) && (
        <View style={styles.controls}>
          {/* ▶ озвучка */}
          {showSpeak && (
            <TouchableOpacity style={[metal(theme, 'circle', { size: a.icon(30) }), { padding: 0 }]} onPress={() => onSpeak(original)} hitSlop={8}>
              <Text style={[styles.playIcon, { color: theme.primary }]}>▶</Text>
            </TouchableOpacity>
          )}
          {/* Перевести — по нажатию переводим этот абзац сразу */}
          {onTranslate && !translation && showTranslate && (
            <TouchableOpacity style={[metal(theme, 'circle', { size: a.icon(30) }), { padding: 0 }]} onPress={() => onTranslate(index)} hitSlop={8}>
              <Text style={[styles.translateIcon, { color: theme.primary }]}>⇄</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.body}>
        {isPlain ? (
          // Звичайний режим читання: рендеримо оригінал ОДНИМ Text (без токенізації → пробіли коректні)
          <Text style={[styles.paragraph, baseText, { fontSize: fs, lineHeight: lh }]}>
            {original}
          </Text>
        ) : q.length > 0 ? (
          // Режим з перекладом + активний пошук: підсвічуємо збіги, але рендеримо ОДНИМ Text (без токенізації)
          <Text style={[styles.paragraph, baseText, { fontSize: fs, lineHeight: lh }]}>
            {highlightMatches(original, q, theme)}
          </Text>
        ) : (
          // Режим з перекладом (без пошуку): оригінал ОДНИМ Text (пробіли коректні, клікабельність слів вимкнена)
          <Text style={[styles.paragraph, baseText, { fontSize: fs, lineHeight: lh }]}>
            {original}
          </Text>
        )}

        {open ? (
          <Text style={[styles.translation, { color: theme.secondaryText, fontSize: fs - 2, lineHeight: lh - 2 }]}>
            {translation}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default memo(SentenceRow);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 0.5, width: '100%', alignSelf: 'center' },
  rowPlain: { paddingVertical: 0, borderBottomWidth: 0 },
  controls: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  playBtn: { paddingTop: 4, paddingRight: 8, width: 28 },
  playIcon: { fontSize: 14 },
  translateBtn: { paddingTop: 2, paddingRight: 6, width: 22 },
  translateIcon: { fontSize: 16 },
  bmBtn: { paddingTop: 2, paddingRight: 6, width: 22 },
  body: { flex: 1, minWidth: 0 },
  paragraph: { flexShrink: 1 },
  justified: { textAlign: 'justify' },
  word: { fontFamily: FONTS.regular },
  tapWord: { fontFamily: FONTS.regular },
  translation: { marginTop: 6, fontStyle: 'italic' },
});
