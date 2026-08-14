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
import { View, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
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
  blurBackdrop = true,
  allowNested = false,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  variant?: ModalVariant;
  maxWidth?: number;
  maxHeight?: number | string;
  panelStyle?: any;
  dismissable?: boolean;
  // blur фона позади модалки (без затемнения). FontSettingsSheet отключает,
  // чтобы пользователь видел изменения шрифта на заднем фоне в реальном времени.
  blurBackdrop?: boolean;
  // Дозволяє вкладені ModalSheet (напр. LanguagePicker всередині Settings) не
  // обрізатися батьківським overflow:hidden. Вимикає overflow:hidden на панелі.
  allowNested?: boolean;
}) {
  const theme = useTheme();
  const a = useAdaptive();
  if (!visible) return null;
  const mw = maxWidth ?? Math.min(480, a.contentMaxW - a.pad * 2);
  const mh = maxHeight ?? '88%';
  const isSheet = variant === 'sheet';
  return (
    <View style={[{ position: 'absolute' as any, left: 0, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }, { paddingVertical: a.pad, paddingHorizontal: a.pad }] as any}>
      {blurBackdrop && (
        <BlurView intensity={14} tint="light" style={{ position: 'absolute' as any, left: 0, right: 0, top: 0, bottom: 0 }} />
      )}
      {!blurBackdrop && <View style={{ position: 'absolute' as any, left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'transparent' }} />}
      {dismissable && <TouchableOpacity style={{ position: 'absolute' as any, left: 0, right: 0, top: 0, bottom: 0 }} activeOpacity={1} onPress={onClose} />}
      <View
        style={[
          metal(theme, 'inset', { radius: a.radius }),
          {
            width: '100%',
            maxHeight: mh,
            padding: a.pad,
            backgroundColor: theme.surface ?? theme.neu.base,
            overflow: allowNested ? 'visible' : 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignSelf: isSheet ? (a.landscape ? 'flex-end' : 'center') : 'center',
            marginBottom: isSheet ? 0 : undefined,
          },
          panelStyle,
          // жёсткий потолок ширины ВСЕГДА после panelStyle,
          // чтобы дочерний panelStyle не мог растянуть панель на весь экран
          { maxWidth: mw, pointerEvents: 'auto' as any },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

