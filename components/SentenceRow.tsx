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
import { surface, neuShadowPad, screenBg, surfaceText } from '../theme/neu';

interface Props {
  index: number;
  paragraphIndex?: number;
  original: string;
  translation?: string;
  /** Зміна тригерить перерендер memo-рядка (нові переклади з БД). */
  extraKey?: number;
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
  letterSpacing?: number;
  paragraphSpacing?: number;
  pageMarginPx?: number;
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
  paragraphIndex,
  original,
  translation,
  extraKey: _extraKey,
  showTranslation,
  fontSize,
  lineHeight,
  query,
  forceHideTranslation,
  mode = 'dual',
  fontFamily = 'default',
  fontWeight = 400,
  textAlign = 'justify',
  letterSpacing = 0,
  paragraphSpacing = 0,
  pageMarginPx = 12,
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
  const lh = (lineHeight ?? 1.4) * fs;
  const open = !forceHideTranslation && (!!translation || showTranslation);
  // Dual-режим: justify по оригіналу дає "кишені" і хвости справа (вузька колонка через
  // колонку кнопок + блок перекладу під абзацом). Тому justify/переноси — тільки в read.
  const effectiveTextAlign = mode === 'read' ? textAlign : 'left';
  const textAlignValue = effectiveTextAlign === 'left' ? 'left' : 'justify';
  const hyphenation = mode === 'read' && textAlign === 'hyphenation';
  const fontFamilyValue =
    fontFamily === 'serif' ? 'serif'
    : fontFamily === 'sans' ? 'sans-serif'
    : fontFamily === 'mono' ? 'monospace'
    : undefined;
  const baseText = {
    fontFamily: fontFamilyValue,
    fontWeight: fontWeight as any,
    textAlign: textAlignValue as any,
    ...(hyphenation ? { hyphenationFactor: 1, wordBreak: 'break-word' } as any : null),
  };
  const base = [baseText, { color: theme.primaryText }];
  const paragraphStyle = [styles.paragraph, base, { fontSize: fs, lineHeight: lh }];
  const q = (query ?? '').trim().toLowerCase();
  // токенизируем только когда меняется исходник (иначе пересоздание массива на каждый рендер)
  const tokens = useMemo(() => tokenize(original), [original]);

  const renderToken = (tok: string, i: number) => {
    const isWord = isWordToken(tok);
    const lower = tok.toLowerCase();
    const hit = q.length > 0 && lower.includes(q);

    if (hit) {
      return (
        <Text
          key={i}
          style={[styles.word, { backgroundColor: theme.highlight, color: theme.readerText }]}
          onPress={() => onWordPress(tok, original)}
        >
          {tok}{' '}
        </Text>
      );
    }
    if (isWord) {
      return (
        <Text
          key={i}
          style={styles.tapWord}
          onPress={() => onWordPress(tok, original)}
        >
          {tok}{' '}
        </Text>
      );
    }
    // пунктуація / пробіли — звичайний текст
    return <Text key={i}>{tok}{' '}</Text>;
  };

  const isPlain = mode === 'read';

  return (
    <View style={[styles.row, isPlain && styles.rowPlain, pageMarginPx !== 0 ? { paddingHorizontal: pageMarginPx } : null, paragraphSpacing ? { marginBottom: paragraphSpacing } : null, { borderBottomColor: theme.border }]} onLayout={(e) => onRowLayout?.(paragraphIndex ?? index, Math.round((e.nativeEvent?.layout?.height) || 0))}>
      {!isPlain && (showSpeak || (onTranslate && !translation && showTranslate)) && (
        <View style={styles.controls}>
          {/* ▶ озвучка — Профіль 3: спеціалізована роль speakBtn */}
          {showSpeak && (
            <TouchableOpacity style={surface(theme, 'speakBtn', { size: a.icon(30) })} onPress={() => onSpeak(original)} hitSlop={8}>
              <Text style={[styles.playIcon, { color: theme.primaryText }]}>▶</Text>
            </TouchableOpacity>
          )}
          {/* Перевести — Профіль 3: спеціалізована роль speakBtn */}
          {onTranslate && !translation && showTranslate && (
            <TouchableOpacity style={surface(theme, 'speakBtn', { size: a.icon(30) })} onPress={() => onTranslate(index)} hitSlop={8}>
              <Text style={[styles.translateIcon, { color: theme.primaryText }]}>⇄</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.body}>
        <Text style={paragraphStyle}>
          {tokens.map((tok, i) => renderToken(tok, i))}
        </Text>

        {(!isPlain && translation) || open ? (
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
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 0.5, width: '100%', alignSelf: 'center', overflow: 'visible' },
  rowPlain: { paddingVertical: 0, paddingHorizontal: 0, borderBottomWidth: 0 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 8, marginTop: 2, padding: 6, overflow: 'visible' },
  playBtn: { paddingTop: 4, paddingRight: 8, width: 28 },
  playIcon: { fontSize: 13 },
  translateBtn: { paddingTop: 2, paddingRight: 6, width: 22 },
  translateIcon: { fontSize: 15 },
  bmBtn: { paddingTop: 2, paddingRight: 6, width: 22 },
  body: { flex: 1, minWidth: 0 },
  paragraph: { flexShrink: 1 },
  justified: { textAlign: 'justify' },
  word: { fontFamily: FONTS.regular },
  tapWord: { fontFamily: FONTS.regular },
  translation: { marginTop: 6, fontStyle: 'italic' },
});
