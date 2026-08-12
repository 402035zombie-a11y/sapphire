// App.tsx — точка входа: провайдеры темы + навигатор
import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import AppNavigator from './navigation/AppNavigator';
import { screenBg } from './theme/neu';
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

// Корень внутри ThemeProvider: градиентный фон на ВЕСЬ viewport (включая поля
// по бокам на широких экранах), чтобы screenBg не обрывался на коротком контенте.
// Градиент ставим на document.body (он = 100% viewport), т.к. RN-root на web может
// быть transparent и пропускать плоский фон body на oversize-экранах.
function Root() {
  const theme = useTheme();
  React.useEffect(() => {
    const g = `linear-gradient(160deg, ${theme.bgTop} 0%, ${theme.background} 45%, ${theme.bgBot} 100%)`;
    document.body.style.backgroundImage = g;
    document.body.style.backgroundColor = theme.bgBot;
  }, [theme.bgTop, theme.background, theme.bgBot]);
  return (
    <View style={{ flex: 1, ...screenBg(theme) }}>
      <AppNavigator />
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <Root />
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
