// components/BottomTabBar.tsx
// Неоморфный плавающий таб-бар (dock): выпуклый контейнер + активный таб вдавлен (inset) в акцент.
// Подпись — СПРАВА от значка (горизонтально), чтобы текст не обрезался.
// Когда места не хватает (узкий экран) — только значки.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { neuInset } from '../theme/neu';
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

  // Подписи справа показываем только если на один таб хватает ширины (иначе только значки).
  const showLabel = a.width >= 640;

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        alignSelf: 'center',
        maxWidth: 520,
        marginHorizontal: a.pad,
        marginBottom: a.tiny ? 6 : 10,
        marginTop: a.tiny ? 4 : 6,
        paddingVertical: a.tiny ? 6 : 8,
        paddingHorizontal: a.tiny ? 6 : 10,
        backgroundColor: 'transparent',
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
              flexDirection: 'row',
              alignItems: 'center',
              gap: a.tiny ? 4 : 6,
              paddingVertical: a.tiny ? 6 : 9,
              paddingHorizontal: showLabel ? (a.tiny ? 10 : 14) : a.tiny ? 8 : 11,
              borderRadius: a.radius,
              ...(focused ? neuInset(theme, a.radius) : {}),
              backgroundColor: focused ? theme.primary : 'transparent',
            }}
          >
            <Icon
              name={iconName}
              size={a.icon(24)}
              color={focused ? '#fff' : theme.secondaryText}
            />
            {showLabel && (
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  color: focused ? '#fff' : theme.secondaryText,
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
  );
}
