// navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../theme/constants';

import LibraryScreen from '../screens/LibraryScreen';
import DictionaryScreen from '../screens/DictionaryScreen';
import TrainingScreen from '../screens/TrainingScreen';
import ReaderScreen from '../screens/ReaderScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ReaderScreen открывается поверх Tabs через Native Stack (параллельный перевод во весь экран).
function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.secondaryText,
      }}
    >
      <Tab.Screen name="Library" component={LibraryScreen} options={{ title: 'Библиотека' }} />
      <Tab.Screen name="Dictionary" component={DictionaryScreen} options={{ title: 'Словарь' }} />
      <Tab.Screen name="Training" component={TrainingScreen} options={{ title: 'Тренировка' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Настройки' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Reader" component={ReaderScreen} options={{ title: 'Чтение' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Настройки' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
