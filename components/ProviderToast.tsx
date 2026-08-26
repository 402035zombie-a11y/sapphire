// components/ProviderToast.tsx
// Плаваючий тост: показує перемикання провайдера перекладу через ліміт
// та відновлення ліміту з автоматичним поверненням.
import React, { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { Text } from 'react-native';
import { onProviderEvent, ProviderEvent } from '../services/translationProviders';

export default function ProviderToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const off = onProviderEvent((e: ProviderEvent) => {
      let text = '';
      if (e.type === 'switched') {
        text = `${e.fromLabel} limit reached — switched to ${e.toLabel}`;
      } else if (e.type === 'recovered') {
        text = `${e.label} limit reset — provider available again`;
      }
      if (!text) return;
      setMsg(text);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setMsg(null));
      }, 3500);
    });
    return () => {
      off();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [opacity]);

  if (!msg) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 96,
        backgroundColor: 'rgba(20,22,28,0.92)',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        opacity,
        zIndex: 500,
        elevation: 6,
      }}
    >
      <Text style={{ color: '#EDEFF5', fontSize: 13, textAlign: 'center' }}>{msg}</Text>
    </Animated.View>
  );
}
