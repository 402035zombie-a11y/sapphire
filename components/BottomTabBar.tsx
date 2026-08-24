// components/BottomTabBar.tsx
// Неоморфный плавающий таб-бар (dock): выпуклый контейнер + активный таб ВЫПУКЛЫЙ (raised), неактивные ВДАВЛЕНЫ (inset).
// Подпись — СПРАВА от значка (горизонтально), чтобы текст не обрезался.
// Когда места не хватает (узкий экран) — только значки.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { metal, neuPrimary, neuShadowPad, screenBg, metalText } from '../theme/neu';
import { FONTS } from '../theme/constants';

type RouteName = 'Library' | 'Dictionary' | 'Training';

const ICONS: Record<RouteName, 'book' | 'bookmark' | 'school'> = {
  Library: 'book',
  Dictionary: 'bookmark',
  Training: 'school',
};

export default function BottomTabBar({ state, descriptors, navigation }: any) {
  const theme = useTheme();
  const a = useAdaptive();

  // Подписи справа показываем если на один таб хватает ширины (порог снижен:
  // показываем почти всегда, кроме совсем узких телефонов в portrait).
  const showLabel = a.width >= 420;

  return (
    <View
      // ПЛАВАЮЩИЙ док: вне потока (absolute), чтобы контент экранов
      // (список книг) тянулся на весь экран И ПОД таб-бар, а не упирался в него.
      style={{
        position: 'absolute',
        left: a.pad,
        right: a.pad,
        bottom: a.tiny ? 3 : 4,
        zIndex: 200,
        flexDirection: 'row',
        justifyContent: 'center',
        pointerEvents: 'box-none',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
          alignSelf: 'center',
          width: '100%',
          maxWidth: a.width - a.pad * 2,
          gap: a.gap,
          paddingVertical: a.tiny ? 6 : 8,
          paddingHorizontal: a.tiny ? 6 : 10,
          borderRadius: Math.round(a.radius * 1.6),
          ...metal(theme, 'raised', { radius: Math.round(a.radius * 1.6) }),
          // Таб-бар = найбільший контейнер: компенсуємо нелінійну шкалу (size^0.75)
          // сильнішим власним світінням, щоб док зберіг об'єм (юзер: "хай залишається випуклим")
          ...(theme.flat
            ? {}
            : {
                boxShadow: `8px -8px 24px rgba(0,0,0,0.45), -4px 4px 14px ${(theme.neu.soft || 'rgba(0,0,0,0.2)')}`,
                elevation: 8,
              }),
        }}
      >
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const rawLabel =
          (typeof options.tabBarLabel === 'string' ? options.tabBarLabel : null) ?? route.name;
        const label = rawLabel && rawLabel.trim() ? rawLabel : route.name;
        const iconName = ICONS[route.name as RouteName] ?? 'book';

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.85}
            onPress={() => navigation.navigate(route.name)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: a.tiny ? 4 : 6,
              paddingVertical: a.tiny ? 6 : 9,
              paddingHorizontal: showLabel ? (a.tiny ? 10 : 14) : a.tiny ? 8 : 11,
              borderRadius: a.radius,
              ...(focused
                ? neuPrimary(theme, a.radius)
                : metal(theme, 'inset', { radius: a.radius })),
              // Neo: легка зовнішня неоморфічна тінь 3px; FLAT — без тіней
              ...(theme.flat ? {} : {
                boxShadow: focused
                  ? '2px 3px 6px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.25)'
                  : '2px 3px 6px rgba(0,0,0,0.28), inset 0 1px 1px rgba(255,255,255,0.18)',
              }),
            }}
          >
            <Icon
              name={iconName}
              size={a.icon(24)}
              color={focused ? theme.onPrimary : theme.secondaryText}
            />
            {showLabel && (
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  color: focused ? theme.onPrimary : theme.secondaryText,
                  fontSize: a.tabFs,
                  fontFamily: FONTS.bold,
                  fontWeight: '700',
                  flexShrink: 1,
                  minWidth: 0,
                }}
              >
                {label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
      </View>
    </View>
  );
}
