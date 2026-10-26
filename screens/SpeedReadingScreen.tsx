// screens/SpeedReadingScreen.tsx
// RSVP-скорочтение: слова книги показываются по одному в центре с заданной скоростью (WPM).
// Управление: play/pause, переход ±1 предложение (стрелки слева/справа), скорость — кнопки +/− и цифровой ввод (справа на уровне play/pause).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, Easing, ScrollView, useWindowDimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import IconButton from '../components/ui/IconButton';
import Screen from '../components/Screen';
import ModalSheet from '../components/ModalSheet';
import TextField from '../components/ui/TextField';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { FONTS } from '../theme/constants';
import { useLibraryStore } from '../store/libraryStore';
import { getBookParagraphs } from '../services/bookText';
import { useSettingsStore } from '../store/settingsStore';
import Icon from '../components/Icon';
import SupportButton from '../components/SupportButton';
import { surface, neuShadowPad, screenBg, surfaceText } from '../theme/neu';
import { useT } from '../i18n';

const ABBREV = /^(т\.к|т\.е|т\.д|др|пр|им|т\.п|п\.п|с\.р|г\.г|в\.т|ч\.л|т\.н|п\.с|с\.ш|ю\.ш|з\.г|вв|н\.э|пр\.-т|ст)$/i;
const OPEN_PUNCT = /^[("\u201C\[]/;
const isPunctOnly = (s: string) => /^[^\p{L}\p{N}]+$/u.test(s);

export default function SpeedReadingScreen() {
  const { height, width } = useWindowDimensions();
  const a = useAdaptive();
  const route = useRoute();
  const params = (route.params as { bookId?: string; variant?: 'rsvp' | 'ticker' } | undefined) ?? {};
  const initialBookId = params.bookId;
  const variant: 'rsvp' | 'ticker' = params.variant === 'rsvp' ? 'rsvp' : 'ticker';
  const [bookId, setBookId] = useState<string | undefined>(initialBookId);
  const theme = useTheme();
  const t = useT();
  const navigation = useNavigation<any>();
  const isShort = height < 640;
  const styles = useMemo(() => makeStyles(a, theme), [a, theme]);
  const wordSize = Math.max(a.tiny ? 18 : 24, Math.min(a.landscape ? 44 : 56, Math.round(height * (a.landscape ? 0.1 : a.tiny ? 0.06 : 0.075))));
  const stagePad = a.landscape ? 18 : isShort ? 26 : Math.round(60 * a.scale);
  const ctrlSize = Math.round(Math.max(38, Math.min(60, (a.landscape ? 46 : 56) * a.scale)));
  const book = useLibraryStore((s) => s.books.find((b) => b.id === bookId));

  const words = useMemo(() => {
    if (!book) return [];
    const raw: { text: string; para: number }[] = [];
    const paras = bookId
      ? getBookParagraphs(bookId, useLibraryStore.getState().books.find((b) => b.id === bookId)?.paragraphs)
      : [];
    for (const p of paras) {
      const toks = p.original.match(/[\p{L}][\p{L}\p{M}'’-]*[^\p{L}\p{N}\s]*|\p{N}+[^\p{L}\p{N}\s]*|[^\p{L}\p{N}\s]+/gu) ?? [];
      for (const t of toks) raw.push({ text: t, para: p.index });
    }
    const merged: { text: string; para: number }[] = [];
    let pendingOpen = '';
    for (const t of raw) {
      if (isPunctOnly(t.text)) {
        if (OPEN_PUNCT.test(t.text)) {
          pendingOpen += t.text;
        } else {
          if (merged.length > 0) {
            const prev = merged[merged.length - 1];
            merged[merged.length - 1] = { ...prev, text: prev.text + t.text };
          } else if (pendingOpen) {
            pendingOpen += t.text;
          } else {
            merged.push(t);
          }
        }
      } else {
        merged.push({ ...t, text: pendingOpen + t.text });
        pendingOpen = '';
      }
    }
    if (pendingOpen) merged.push({ text: pendingOpen, para: raw.length ? raw[raw.length - 1].para : 0 });
    const out: { text: string; para: number; boundaryType: 'sent' | 'comma' | 'bracketOpen' | 'bracketClose' | null }[] = [];
    for (const m of merged) {
      let boundaryType: 'sent' | 'comma' | 'bracketOpen' | 'bracketClose' | null = null;
      if (/[.!?…]["')\]»’]*$/u.test(m.text)) boundaryType = 'sent';
      else if (/[,;:—]$/u.test(m.text)) boundaryType = 'comma';
      else if (/^(\u201C|\[)/u.test(m.text)) boundaryType = 'bracketOpen';
      else if (/[)"\u201D]$/u.test(m.text)) boundaryType = 'bracketClose';
      const base = m.text.replace(/[^\p{L}\p{N}]+$/u, '');
      if (boundaryType === 'sent' && ABBREV.test(base)) boundaryType = null;
      out.push({ text: m.text, para: m.para, boundaryType });
    }
    return out;
  }, [book, bookId]);

  const [wpm, setWpm] = useState(300);
  const [microPauses, setMicroPauses] = useState(useSettingsStore((s) => s.reader.microPauses ?? true));
  const [pauseCommaMs, setPauseCommaMs] = useState(useSettingsStore((s) => s.reader.pauseCommaMs ?? 400));
  const [pauseSentMs, setPauseSentMs] = useState(useSettingsStore((s) => s.reader.pauseSentMs ?? 400));
  const [pauseBracketMs, setPauseBracketMs] = useState(useSettingsStore((s) => s.reader.pauseBracketMs ?? 400));
  const [tickerDir, setTickerDir] = useState<'rtl' | 'ltr'>('rtl');
  const setReader = useSettingsStore((s) => s.setReader);
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  useEffect(() => { posRef.current = pos; }, [pos]);
  const [playing, setPlaying] = useState(false);
  const [resetPrompt, setResetPrompt] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseCommaRef = useRef(pauseCommaMs);
  useEffect(() => { pauseCommaRef.current = pauseCommaMs; }, [pauseCommaMs]);
  const pauseSentRef = useRef(pauseSentMs);
  useEffect(() => { pauseSentRef.current = pauseSentMs; }, [pauseSentMs]);
  const pauseBracketRef = useRef(pauseBracketMs);
  useEffect(() => { pauseBracketRef.current = pauseBracketMs; }, [pauseBracketMs]);
  const microRef = useRef(microPauses);
  useEffect(() => { microRef.current = microPauses; }, [microPauses]);

  useEffect(() => {
    if (!playing || words.length === 0) return;
    let cancelled = false;
    let idx = posRef.current;
    const base = Math.max(40, Math.round(60000 / wpm));
    const tick = () => {
      if (cancelled) return;
      const cur = words[idx];
      const bt = microRef.current && cur ? cur.boundaryType : null;
      const delay = bt === 'sent' ? Math.max(base, pauseSentRef.current)
        : bt === 'comma' ? Math.max(base, pauseCommaRef.current)
        : bt === 'bracketOpen' || bt === 'bracketClose' ? Math.max(base, pauseBracketRef.current)
        : base;
      timer.current = setTimeout(() => {
        if (cancelled) return;
        idx += 1;
        if (idx >= words.length) { setPos(words.length - 1); setPlaying(false); return; }
        setPos(idx);
        tick();
      }, delay);
    };
    tick();
    return () => { cancelled = true; if (timer.current) clearTimeout(timer.current); };
  }, [playing, wpm, words.length, words]);

  if (!bookId || !book) {
    return (
      <Screen contentStyle={{ alignItems: 'center', justifyContent: 'center' }}>
        <TouchableOpacity
          style={[surface(theme, 'primary', { radius: a.radius }), { paddingVertical: 12, paddingHorizontal: 24 }]}
          onPress={() => navigation.navigate('Library' as never)}
        >
          <Text style={{ color: theme.onPrimary, fontFamily: FONTS.bold, fontSize: a.body }}>{t('Select a book')}</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  if (words.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: 'transparent' }]}>
        <Text style={{ color: theme.secondaryText }}>{t('No words in the book for speed reading.')}</Text>
      </View>
    );
  }

  const sentenceStarts = useMemo(() => {
    const starts: number[] = [0];
    for (let i = 1; i < words.length; i++) {
      if (words[i - 1].boundaryType === 'sent') starts.push(i);
    }
    if (starts.length <= 1) {
      let lastPara = words[0]?.para ?? -1;
      for (let i = 1; i < words.length; i++) {
        if (words[i].para !== lastPara) {
          starts.push(i);
          lastPara = words[i].para;
        }
      }
    }
    return starts;
  }, [words]);

  const animateTickerTo = (target: number) => {
    if (tickerRAF.current != null) { cancelAnimationFrame(tickerRAF.current); tickerRAF.current = null; }
    if (tickerWidth <= 0 || tickerTextWidth <= 0) return;
    const clamped = Math.max(-tickerTextWidth, Math.min(tickerWidth, target));
    tickerFrom.current = tickerTranslateX;
    tickerTo.current = clamped;
    tickerStart.current = performance.now();
    tickerDuration.current = 480;
    const tick = (now: number) => {
      const elapsed = now - tickerStart.current;
      const t = Math.min(1, elapsed / tickerDuration.current);
      const eased = 1 - Math.pow(1 - t, 3);
      const x = tickerFrom.current + (tickerTo.current - tickerFrom.current) * eased;
      tickerRef.current?.setNativeProps({ style: { transform: [{ translateX: x }] } });
      setTickerTranslateX(x);
      if (t >= 1) { tickerRAF.current = null; return; }
      tickerRAF.current = requestAnimationFrame(tick);
    };
    tickerRAF.current = requestAnimationFrame(tick);
  };

  const seekToWord = (target: number) => {
    const clamped = Math.max(0, Math.min(words.length - 1, target));
    if (variant === 'ticker') {
      setPlaying(false);
      animateTickerTo(clamped);
      setPos(clamped);
    } else {
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      setPos(clamped);
    }
  };

  const goPrevSentence = () => {
    setPlaying(false);
    const idx = [...sentenceStarts].reverse().find((s) => s < pos);
    seekToWord(idx ?? 0);
  };
  const goNextSentence = () => {
    setPlaying(false);
    const idx = sentenceStarts.find((s) => s > pos);
    seekToWord(idx ?? words.length - 1);
  };
  const stopAll = () => {
    setPlaying(false);
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (variant === 'ticker') animateTickerTo(0);
    setPos(0);
  };

  const clampWpm = (v: number) => Math.max(100, Math.min(1000, Math.round(v) || 100));

  const speedBox = (
    <View style={styles.speedBox}>
      <TouchableOpacity style={[styles.speedBtn, surface(theme, 'circle', { size: a.fab() })]} onPress={() => setWpm((v) => clampWpm(v - 25))}>
        <Text style={[styles.speedBtnText, { color: theme.primaryText }]}>−</Text>
      </TouchableOpacity>
      <TextField
        radius={10}
        style={[styles.speedInput, { borderWidth: 0, color: theme.primaryText }]}
        value={String(wpm)}
        keyboardType="numeric"
        onChangeText={(t) => setWpm(clampWpm(Number(t.replace(/\D/g, ''))))}
      />
      <TouchableOpacity style={[styles.speedBtn, surface(theme, 'circle', { size: a.fab() })]} onPress={() => setWpm((v) => clampWpm(v + 25))}>
        <Text style={[styles.speedBtnText, { color: theme.primaryText }]}>+</Text>
      </TouchableOpacity>
      <Text style={[styles.speedLabel, { color: theme.secondaryText }]}>{t('words/min')}</Text>
    </View>
  );

  const current = words[pos];
  const tickerText = useMemo(() => words.map((w) => w.text).join(' '), [words]);
  const tickerRef = useRef<View>(null);
  const [tickerWidth, setTickerWidth] = useState(0);
  const [tickerTextWidth, setTickerTextWidth] = useState(0);
  const tickerRAF = useRef<number | null>(null);
  const tickerStart = useRef<number>(0);
  const tickerFrom = useRef<number>(0);
  const tickerTo = useRef<number>(0);
  const tickerDuration = useRef<number>(1);
  const [tickerTranslateX, setTickerTranslateX] = useState(0);

  useEffect(() => {
    if (variant !== 'ticker') return;
    if (!playing) return;
    if (tickerWidth <= 0 || tickerTextWidth <= 0) return;
    const total = Math.max(2000, Math.round((words.length / wpm) * 60000));
    const startPos = posRef.current >= words.length - 1 ? 0 : posRef.current;
    const fromT = startPos / Math.max(1, words.length - 1);
    tickerFrom.current = tickerDir === 'rtl' ? tickerWidth - fromT * (tickerWidth + tickerTextWidth) : -fromT * (tickerWidth + tickerTextWidth);
    tickerTo.current = tickerDir === 'rtl' ? -tickerTextWidth : tickerWidth;
    tickerDuration.current = total;
    tickerStart.current = performance.now();
    let cancelled = false;

    const step = () => {
      if (cancelled) return;
      const now = performance.now();
      const t = Math.min(1, (now - tickerStart.current) / tickerDuration.current);
      const eased = t;
      const x = tickerFrom.current + (tickerTo.current - tickerFrom.current) * eased;
      tickerRef.current?.setNativeProps({ style: { transform: [{ translateX: x }] } });
      setTickerTranslateX(x);
      if (t >= 1) {
        if (posRef.current >= words.length - 1) {
          setPos(words.length - 1);
          setPlaying(false);
        }
        return;
      }
      tickerRAF.current = requestAnimationFrame(step);
    };
    tickerRAF.current = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      if (tickerRAF.current != null) cancelAnimationFrame(tickerRAF.current);
      tickerRAF.current = null;
    };
  }, [variant, playing, wpm, words.length, tickerWidth, tickerTextWidth, tickerDir]);

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={{ backgroundColor: 'transparent' }}
      contentContainerStyle={[styles.container, { paddingTop: a.tabBarH + a.fab() + a.gap, paddingBottom: a.tabBarH + a.pad * 2 + a.gap }]}
      showsVerticalScrollIndicator={false}
    >

      <View style={[styles.stage, surface(theme, 'raised', { radius: a.radius, strength: 0.6 }), { paddingVertical: stagePad }]}>
        {variant === 'ticker' ? (
          <View
            style={styles.tickerWrap}
            onLayout={(e) => setTickerWidth(e.nativeEvent.layout.width)}
          >
            <View
              ref={tickerRef}
              style={[
                styles.tickerTrack,
                { transform: [{ translateX: tickerTranslateX }] },
              ]}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="clip"
                style={[styles.tickerText, { color: theme.primaryText, flexWrap: 'nowrap' as any }]}
                onLayout={(e) => setTickerTextWidth(e.nativeEvent.layout.width)}
              >
                {tickerText}
              </Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={[styles.word, { color: theme.primaryText, fontSize: wordSize }]}>{current.text}</Text>
            <Text style={[styles.paraInfo, { color: theme.secondaryText, marginTop: a.small ? 8 : 16 }]}>{t('Paragraph {n}').replace(/\{n\}/g, String(current.para + 1))}</Text>
            <View style={[styles.progressTrack, { backgroundColor: theme.border, marginTop: a.small ? 12 : 24, width: '100%' }]}>
              <View style={[styles.progressFill, { width: `${Math.round(((pos + 1) / words.length) * 100)}%`, backgroundColor: theme.primary }]} />
            </View>
          </>
        )}
      </View>

      <View style={[styles.playerRow, { marginTop: a.small ? 8 : 16 }]}>
        <View style={styles.controls}>
          <TouchableOpacity style={[styles.ctrlBtn, surface(theme, 'circle', { size: ctrlSize })]} onPress={() => setResetPrompt(true)}>
            <Icon name="close" size={a.dim(0.032, 18, 26)} color={theme.primaryText} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ctrlBtn, surface(theme, 'circle', { size: ctrlSize })]} onPress={goPrevSentence}>
            <Icon name="chevron-back" size={a.dim(0.032, 18, 26)} color={theme.primaryText} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.playBtn, surface(theme, 'primary', { size: ctrlSize + 12 })]} onPress={() => {
            if (!playing && pos >= words.length - 1) setPos(0);
            setPlaying((p) => !p);
          }}>
            <Icon name={playing ? 'pause' : 'play'} size={a.dim(0.042, 22, 34)} color={theme.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ctrlBtn, surface(theme, 'circle', { size: ctrlSize })]} onPress={goNextSentence}>
            <Icon name="chevron-forward" size={a.dim(0.032, 18, 26)} color={theme.primaryText} />
          </TouchableOpacity>
        </View>
        {speedBox}
      </View>

      {variant === 'rsvp' && (
        <View style={{ width: '92%', maxWidth: 320, alignSelf: 'center', marginTop: a.gap }}>
          <TouchableOpacity
            style={[styles.microToggle, surface(theme, 'raised', { radius: a.radius, strength: 0.6 }), { paddingVertical: a.small ? 8 : 12, paddingHorizontal: a.pad, justifyContent: 'center' }]}
            onPress={() => setMicroPauses((v) => !v)}
          >
            <View style={[styles.microDot, { backgroundColor: microPauses ? theme.success : theme.border }, !microPauses && { backgroundColor: theme.border }]} />
            <Text style={[styles.microLabel, { color: theme.primaryText }]}>{t('Micro-pauses after punctuation')}</Text>
          </TouchableOpacity>
          {microPauses && (
            <View style={{ width: '100%', marginTop: 6 }}>
              <View style={[styles.pauseRow, surface(theme, 'inset', { radius: a.radius })]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity style={styles.pauseBtn} onPress={() => { const v = Math.max(0, pauseCommaMs - 10); setPauseCommaMs(v); setReader({ pauseCommaMs: v }); }}>
                    <Text style={[styles.pauseBtnText, { color: theme.primaryText }]}>−</Text>
                  </TouchableOpacity>
                  <Text style={[styles.pauseValue, { color: theme.primaryText }]}>{pauseCommaMs} {t('ms')}</Text>
                  <TouchableOpacity style={styles.pauseBtn} onPress={() => { const v = Math.min(1000, pauseCommaMs + 10); setPauseCommaMs(v); setReader({ pauseCommaMs: v }); }}>
                    <Text style={[styles.pauseBtnText, { color: theme.primaryText }]}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.pauseHint, { color: theme.secondaryText }]}>{t('comma , ; :')}</Text>
              </View>
              <View style={[styles.pauseRow, surface(theme, 'inset', { radius: a.radius })]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity style={styles.pauseBtn} onPress={() => { const v = Math.max(0, pauseSentMs - 10); setPauseSentMs(v); setReader({ pauseSentMs: v }); }}>
                    <Text style={[styles.pauseBtnText, { color: theme.primaryText }]}>−</Text>
                  </TouchableOpacity>
                  <Text style={[styles.pauseValue, { color: theme.primaryText }]}>{pauseSentMs} {t('ms')}</Text>
                  <TouchableOpacity style={styles.pauseBtn} onPress={() => { const v = Math.min(1000, pauseSentMs + 10); setPauseSentMs(v); setReader({ pauseSentMs: v }); }}>
                    <Text style={[styles.pauseBtnText, { color: theme.primaryText }]}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.pauseHint, { color: theme.secondaryText }]}>{t('end . ! ?')}</Text>
              </View>
              <View style={[styles.pauseRow, surface(theme, 'inset', { radius: a.radius })]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity style={styles.pauseBtn} onPress={() => { const v = Math.max(0, pauseBracketMs - 10); setPauseBracketMs(v); setReader({ pauseBracketMs: v }); }}>
                    <Text style={[styles.pauseBtnText, { color: theme.primaryText }]}>−</Text>
                  </TouchableOpacity>
                  <Text style={[styles.pauseValue, { color: theme.primaryText }]}>{pauseBracketMs} {t('ms')}</Text>
                  <TouchableOpacity style={styles.pauseBtn} onPress={() => { const v = Math.min(1000, pauseBracketMs + 10); setPauseBracketMs(v); setReader({ pauseBracketMs: v }); }}>
                    <Text style={[styles.pauseBtnText, { color: theme.primaryText }]}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.pauseHint, { color: theme.secondaryText }]}>{t('brackets ( )')}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {variant === 'ticker' && (
        <TouchableOpacity
          style={[styles.microToggle, surface(theme, 'raised', { radius: a.radius, strength: 0.6 }), { marginTop: a.small ? 8 : 16, paddingVertical: a.small ? 8 : 12, paddingHorizontal: a.pad }]}
          onPress={() => setTickerDir((d) => (d === 'rtl' ? 'ltr' : 'rtl'))}
        >
          <View style={[styles.microDot, { backgroundColor: tickerDir === 'rtl' ? theme.success : theme.border }, tickerDir !== 'rtl' && { backgroundColor: theme.border }]} />
          <Text style={[styles.microLabel, { color: theme.primaryText }]}>{t('Direction:')} {tickerDir === 'rtl' ? t('right → left') : t('left → right')}</Text>
        </TouchableOpacity>
      )}

      {resetPrompt && (
        <ModalSheet visible={resetPrompt} onClose={() => setResetPrompt(false)} role="raised">
          <View style={[styles.resetModal]}>
            <Text style={[styles.resetTitle, { color: theme.primaryText }]}>{t('Start over?')}</Text>
            <View style={styles.resetRow}>
              <TouchableOpacity
                style={[styles.resetBtn, surface(theme, 'primary', { radius: a.radius })]}
                onPress={() => { setResetPrompt(false); stopAll(); }}
              >
                <Text style={{ color: theme.onPrimary, fontFamily: FONTS.bold, fontSize: a.body }}>{t('Yes')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.resetBtn, surface(theme, 'inset', { radius: a.radius })]}
                onPress={() => setResetPrompt(false)}
              >
                <Text style={{ color: theme.primaryText, fontFamily: FONTS.bold, fontSize: a.body }}>{t('No')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ModalSheet>
      )}

    </ScrollView>
      <View style={[styles.topRow, { position: 'absolute', top: a.tabBarH + a.gap, left: a.pad, right: a.pad, zIndex: 100 }]}>
        <IconButton icon="arrow-back" onPress={() => navigation.goBack()} variant="circle" size={a.fab()} hitSlop={8} />
        <View style={[styles.counterBar, { paddingVertical: a.small ? 4 : 8, flex: 1, marginLeft: a.tiny ? 4 : 8 }]}>
          <Text style={[styles.bookTitle, { color: theme.primaryText }]} numberOfLines={1}>{book.title}</Text>
          <Text style={[styles.counter, { color: theme.secondaryText }]}>{t('Word {n} of {m}').replace(/\{n\}/g, String(pos + 1)).replace(/\{m\}/g, String(words.length))}</Text>
        </View>
        <SupportButton />
      </View>
    </View>
  );
}

function makeStyles(a: ReturnType<typeof useAdaptive>, theme: ReturnType<typeof useTheme>) {
  const wpmBtn = a.fab();
  const pauseSz = Math.round(Math.max(32, 40 * a.scale));
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: a.pad,
      paddingTop: a.pad + Math.round(a.fab()) + a.gap,
      alignItems: 'center',
      width: '100%',
      maxWidth: a.contentMaxW,
      alignSelf: 'center',
      paddingBottom: a.pad * 2,
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: a.pad },
    header: { width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: a.gap },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: a.tiny ? 4 : 8 },
    bookTitle: { fontSize: a.h2, fontFamily: FONTS.bold, textAlign: 'left' },
    counterBar: { width: '100%', alignItems: 'center', paddingVertical: a.small ? 4 : 8 },
    counter: { fontSize: a.small_fs, marginTop: 4 },
    stage: {
      width: '100%',
      borderRadius: a.radius,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      paddingHorizontal: a.pad,
      minHeight: a.landscape ? a.height * 0.28 : a.height * 0.2,
    },
    word: { fontFamily: FONTS.bold, textAlign: 'center' },
    paraInfo: { fontSize: a.small_fs },
    tickerWrap: {
      width: '100%',
      overflow: 'hidden',
      alignItems: 'flex-start',
      justifyContent: 'center',
      minHeight: Math.round(Math.max(40, 60 * a.scale)),
    },
    tickerTrack: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0, flexShrink: 0 },
    tickerText: { fontSize: a.fs(32), fontFamily: FONTS.bold, textAlign: 'left', flexShrink: 0 },
    speedLabel: { fontSize: a.small_fs, marginTop: 4 },
    wpmRow: { flexDirection: 'row', alignItems: 'center', gap: a.gap, marginTop: a.gap * 2 },
    wpmBtn: { width: wpmBtn, height: wpmBtn, borderRadius: wpmBtn / 2, alignItems: 'center', justifyContent: 'center' },
    wpmBtnText: { fontSize: a.fs(24), fontFamily: FONTS.bold },
    wpmValue: { fontSize: a.title, fontFamily: FONTS.bold, minWidth: 60, textAlign: 'center' },
    playerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      gap: a.gap,
      flexWrap: 'wrap',
    },
    speedBox: { alignItems: 'center', gap: 6, flexDirection: 'row' },
    speedBtn: { width: wpmBtn, height: Math.round(wpmBtn * 0.85), borderRadius: wpmBtn / 2, alignItems: 'center', justifyContent: 'center' },
    speedBtnText: { fontSize: a.fs(22), fontFamily: FONTS.bold },
    speedInput: {
      width: Math.round(Math.max(52, 64 * a.scale)),
      height: wpmBtn,
      borderRadius: 10,
      textAlign: 'center',
      fontSize: a.h2,
      fontFamily: FONTS.bold,
    },
    controls: { flexDirection: 'row', alignItems: 'center', gap: Math.round(Math.max(10, 24 * a.scale)), marginTop: a.small ? 8 : a.gap },
    playBtn: { alignItems: 'center', justifyContent: 'center' },
    ctrlBtn: { ...surface(theme, 'circle', { size: Math.round(Math.max(38, Math.min(60, (a.landscape ? 46 : 56) * a.scale))) }), borderRadius: Math.round(Math.max(38, Math.min(60, (a.landscape ? 46 : 56) * a.scale))) / 2 },
    progressTrack: { height: 6, width: '100%', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: 6 },
    microToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      borderRadius: a.radius,
    },
    microDot: { width: a.icon(18), height: a.icon(18), borderRadius: a.icon(18) / 2 },
    microLabel: { fontSize: a.fs(14), fontFamily: FONTS.bold, flexShrink: 1 },
    pauseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 10,
      paddingVertical: a.tiny ? 6 : 8,
      paddingHorizontal: a.pad,
      borderRadius: a.radius,
      flexWrap: 'nowrap',
    },
    pauseBtn: { ...surface(theme, 'circle', { size: pauseSz }), width: pauseSz, height: pauseSz, borderRadius: pauseSz / 2, alignItems: 'center', justifyContent: 'center' },
    pauseBtnText: { fontSize: a.fs(22), fontFamily: FONTS.bold },
    pauseValue: { fontSize: a.title, fontFamily: FONTS.bold, minWidth: 60, textAlign: 'center' },
    pauseHint: { fontSize: a.fs(12), flex: 1, textAlign: 'right', marginLeft: 8 },
    resetBackdrop: { backgroundColor: theme.backdrop, alignItems: 'center', justifyContent: 'center', zIndex: 50 },
    resetModal: { width: '100%', maxWidth: Math.min(320, a.contentMaxW - a.pad * 2), borderRadius: a.radius, padding: a.pad, alignItems: 'center', alignSelf: 'center', justifyContent: 'center' },
    resetTitle: { fontSize: a.h2, fontFamily: FONTS.bold, marginBottom: a.gap, textAlign: 'center', alignSelf: 'center', width: '100%' },
    resetRow: { flexDirection: 'row', gap: a.gap, width: '100%', justifyContent: 'center', alignItems: 'center' },
    resetBtn: { flex: 1, height: Math.round(Math.max(44, 52 * a.scale)), alignItems: 'center', justifyContent: 'center', paddingVertical: a.tiny ? 8 : 12, borderRadius: a.radius },
  });
}
