// navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';

import LibraryScreen from '../screens/LibraryScreen';
import DictionaryScreen from '../screens/DictionaryScreen';
import TrainingScreen from '../screens/TrainingScreen';
import { useT } from '../i18n';
import BottomTabBar from '../components/BottomTabBar';
import ReaderScreen from '../screens/ReaderScreen';
import SectionsScreen from '../screens/SectionsScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import SpeedReadingScreen from '../screens/SpeedReadingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  const a = useAdaptive();
  const t = useT();
  return (
    <Tab.Navigator
      // Свой неоморфный таб-бар: иконка+подпись справа, активный таб вдавлен в акцент.
      tabBar={(props: any) => <BottomTabBar {...props} />}
      screenOptions={{
        // Хедер не нужен: активный таб и так показывает раздел, а названия экранов убраны.
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarLabel: t('Library'),
          tabBarIcon: ({ color }) => <Icon name="book" size={a.icon(26)} color={color} />,
        }}
      />
      <Tab.Screen
        name="Dictionary"
        options={{
          tabBarLabel: t('Dictionary'),
          tabBarIcon: ({ color }) => <Icon name="bookmark" size={a.icon(26)} color={color} />,
        }}
      >
        {() => (
          <DictionaryScreen />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Training"
        options={{
          tabBarLabel: t('Training'),
          tabBarIcon: ({ color }) => <Icon name="school" size={a.icon(26)} color={color ? color : undefined} />,
        }}
      >
        {() => (
          <TrainingScreen />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const theme = useTheme();
  const a = useAdaptive();
  // React Navigation по умолчанию ставит свой background на контейнеры (Tab/Stack),
  // перекрывая наш глобальный фон. Делаем его прозрачным, чтобы меню было оверлеем
  // поверх тёмного фона из App.tsx (виден фон под контентом — эффект глубины).
  const navTheme = {
    ...DefaultTheme,
    dark: true,
    colors: {
      ...DefaultTheme.colors,
      background: 'transparent',
      card: 'transparent',
      border: 'transparent',
      primary: theme.primary,
      text: theme.primaryText,
    },
  };
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Tabs"
        // Нативный хедер не показываем: он пустой (названия экранов убраны), место зря.
        // Стрелка «назад» — плавающая BackFab внутри каждого экрана.
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />

        <Stack.Screen
          name="Reader"
          component={ReaderScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Sections" component={SectionsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Bookmarks" component={BookmarksScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SpeedReading" component={SpeedReadingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Dictionary" component={DictionaryScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Training" component={TrainingScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
