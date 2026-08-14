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
  mode?: 'read' | 'dual';
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
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

// слово = токен, содержащий хотя бы одну букву (любого алфавита)
function isWordToken(tok: string): boolean {
  return /\p{L}/u.test(tok);
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
  const lh = Math.max(lineHeight ?? 1.4, 1.5) * fs;
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
    const base = [styles.word, baseText, { color: theme.readerText, fontSize: fs, lineHeight: lh }];

    if (hit) {
      return (
        <Text key={i} style={[styles.word, baseText, { backgroundColor: theme.highlight, color: theme.readerText, fontSize: fs, lineHeight: lh }]}>
          {tok}
        </Text>
      );
    }
    if (isWord) {
      return (
        <TouchableOpacity key={i} onPress={() => onWordPress(tok, original)} hitSlop={2}>
          <Text style={[...base, styles.tapWord]}>{tok}{' '}</Text>
        </TouchableOpacity>
      );
    }
    // пунктуация / пробелы — обычный текст, не кликабельны
    return <Text key={i} style={base}>{tok}</Text>;
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
        <Text style={[styles.paragraph, baseText]}>
          {tokens.map((tok, i) => renderToken(tok, i))}
        </Text>

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
  word: { fontFamily: FONTS.regular, paddingVertical: 2 },
  tapWord: { fontFamily: FONTS.regular, paddingVertical: 2 },
  translation: { marginTop: 6, fontStyle: 'italic' },
});
