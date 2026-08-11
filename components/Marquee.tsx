// components/Marquee.tsx
// Бегущая строка для длинных названий. На web — CSS-анимация (дубликат текста для зацикливания),
// запускается ТОЛЬКО если текст шире контейнера. На native — обычная обрезка с троеточием.
import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, LayoutChangeEvent } from 'react-native';

let injected = false;
function ensureKeyframes() {
  if (Platform.OS !== 'web' || injected || typeof document === 'undefined') return;
  if (document.getElementById('bookreader-marquee-kf')) return;
  const style = document.createElement('style');
  style.id = 'bookreader-marquee-kf';
  style.innerHTML =
    '@keyframes bookreader-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }';
  document.head.appendChild(style);
  injected = true;
}

export default function Marquee({
  text,
  textStyle,
  duration = 12,
}: {
  text: string;
  textStyle?: any;
  duration?: number;
}) {
  const [containerW, setContainerW] = useState(0);
  const [textW, setTextW] = useState(0);

  const onContainer = (e: LayoutChangeEvent) => setContainerW(e.nativeEvent.layout.width);
  const onText = (e: LayoutChangeEvent) => setTextW(e.nativeEvent.layout.width);

  ensureKeyframes();

  if (Platform.OS !== 'web') {
    return (
      <Text style={textStyle} numberOfLines={1} ellipsizeMode="tail">
        {text}
      </Text>
    );
  }

  const overflow = containerW > 0 && textW > containerW;
  const trackAnim = { animation: `bookreader-marquee ${duration}s linear infinite` } as any;
  return (
    <View style={styles.wrap} onLayout={onContainer}>
      {overflow ? (
        <View style={[styles.track, trackAnim]}>
          <Text style={[textStyle, styles.item, nowrap]} numberOfLines={1} onLayout={onText}>
            {text}
          </Text>
          <Text style={[textStyle, styles.item, nowrap]} numberOfLines={1}>
            {text}
          </Text>
        </View>
      ) : (
        // без numberOfLines измеряем РЕАЛЬНУЮ ширину текста, но nowrap обязателен —
        // иначе длинное имя файла переносится на 2 строки и распирает хедер.
        <Text style={[textStyle, styles.measureBase, nowrap]} onLayout={onText}>
          {text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', flex: 1, minWidth: 0, justifyContent: 'center' },
  track: { flexDirection: 'row', flexShrink: 0, width: 'max-content' as any },
  item: { paddingRight: 48, flexShrink: 0 },
  measureBase: { flexShrink: 0 },
});

// web-only свойства не входят в типы RN StyleSheet — задаём отдельным объектом.
const nowrap = { whiteSpace: 'nowrap', wordBreak: 'keep-all' } as any;
