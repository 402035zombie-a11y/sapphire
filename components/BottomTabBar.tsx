// components/BottomTabBar.tsx
// Неоморфный плавающий таб-бар (dock): выпуклый контейнер + активный таб ВЫПУКЛЫЙ (raised), неактивные ВДАВЛЕНЫ (inset).
// Подпись — СПРАВА от значка (горизонтально), чтобы текст не обрезался.
// Когда места не хватает (узкий экран) — только значки.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { metal, neuShadowPad, screenBg, metalText } from '../theme/neu';
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
          // N1 ревізія: док = контейнер сцени → СЛАБКИЙ raised (depth 0.55).
          // Елементи всередині завжди глибші за контейнер, інакше об'єм не читається.
          ...metal(theme, 'raised', { radius: Math.round(a.radius * 1.6), strength: 0.55 }),
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
              // N1 ревізія v2 (юзер): активний таб = ВИПУКЛИЙ (raised + зовнішні тіні),
              // неактивні = ВДАВЛЕНІ (inset-лунка). Контраст станів через протилежні тіні.
              ...(focused
                ? metal(theme, 'raised', { radius: a.radius, strength: 1 })
                : metal(theme, 'inset', { radius: a.radius })),
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
