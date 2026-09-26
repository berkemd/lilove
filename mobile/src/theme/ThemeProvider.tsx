import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  Appearance,
  useColorScheme,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemePreference, themeColor, themeStyle, type ColorRole } from './theme';

type ThemeContextValue = {
  isDark: boolean;
  ready: boolean;
  saving: boolean;
  setDarkMode(value: boolean): Promise<void>;
  color(value: string, role?: ColorRole): string;
};
const preference = new ThemePreference(AsyncStorage);
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceMode = useColorScheme();
  const state = useSyncExternalStore(preference.subscribe, preference.getSnapshot);
  const isDark = (state.mode ?? deviceMode) === 'dark';
  useEffect(() => {
    void preference.initialize();
  }, []);
  useEffect(() => {
    if (state.ready) Appearance.setColorScheme(state.mode ?? null);
  }, [state.mode, state.ready]);
  const value = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      ready: state.ready,
      saving: state.saving,
      setDarkMode: preference.setDarkMode,
      color: (color, role) => themeColor(color, isDark, role),
    }),
    [isDark, state.ready, state.saving]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('ThemeProvider is required');
  return value;
}

export function useThemedStyles<T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(
  base: T
): T {
  const { isDark } = useTheme();
  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(base).map(([key, style]) => [key, themeStyle(style, isDark)])
      ) as T,
    [base, isDark]
  );
}
