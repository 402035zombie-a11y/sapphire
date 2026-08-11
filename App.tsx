// App.tsx — точка входа: провайдеры темы + навигатор
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './theme/ThemeContext';
import AppNavigator from './navigation/AppNavigator';
import { COLORS } from './theme/constants';
import { initAds } from './services/monetization';

// Инициализируем рекламный SDK при старте (натив только; на web — no-op).
initAds();

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // выводим в консоль и на экран
    console.error('APP_ERROR:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <pre style={{ padding: 20, color: 'red', fontSize: 14, whiteSpace: 'pre-wrap' }}>
          {String(this.state.error && (this.state.error.stack || this.state.error.message))}
        </pre>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.darkBackground }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <AppNavigator />
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </View>
  );
}
