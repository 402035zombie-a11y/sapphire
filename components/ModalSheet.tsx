// components/ModalSheet.tsx
// Единая замена <Modal> для экранов внутри навигатора (Rule 23):
// react-native <Modal> и @gorhom/bottom-sheet НЕ рендерятся надёжно в RN-web навигаторе.
// Собственный оверлей на чистом RN (View+TouchableOpacity) — гарантированно рисуется на web.
// ModalSheet = оверлей (затемнение) + ЕДИНСТВЕННАЯ metal-панель. Дочерние компоненты
// рисуют ТОЛЬКО контент (заголовок, кнопки) — НЕ свою панель, иначе «окно-в-окне».
//
// КЛАССЫ (props) — один компонент, разные варианты без дублирования:
//   variant:  'center' (дефолт: панель по центру, maxWidth 560)
//             'sheet'  (прижата к низу/боку, как FontSettingsSheet — для десктопа справа)
//   maxWidth / maxHeight  — переопределение размеров панели
//   panelStyle            — доп. стили панели (bg, radius)
//   dismissable           — закрытие по тапу вне (дефолт true)
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { metal } from '../theme/neu';

export type ModalVariant = 'center' | 'sheet';

export default function ModalSheet({
  visible,
  onClose,
  children,
  variant = 'center',
  maxWidth,
  maxHeight,
  panelStyle,
  dismissable = true,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  variant?: ModalVariant;
  maxWidth?: number;
  maxHeight?: number | string;
  panelStyle?: any;
  dismissable?: boolean;
}) {
  const theme = useTheme();
  const a = useAdaptive();
  if (!visible) return null;
  const mw = maxWidth ?? Math.min(560, a.contentMaxW - a.pad * 2);
  const mh = maxHeight ?? '88%';
  const isSheet = variant === 'sheet';
  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { paddingTop: a.pad, paddingHorizontal: a.pad }]}>
      {dismissable && <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />}
      <View
        style={[
          metal(theme, 'inset', { radius: a.radius }),
          {
            width: '100%',
            maxWidth: mw,
            maxHeight: mh,
            padding: a.pad,
            backgroundColor: theme.surface ?? theme.neu.base,
            overflow: 'visible',
            alignSelf: isSheet ? (a.landscape ? 'flex-end' : 'center') : 'center',
            marginBottom: isSheet ? 0 : undefined,
          },
          panelStyle,
        ]}
        pointerEvents="auto"
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
