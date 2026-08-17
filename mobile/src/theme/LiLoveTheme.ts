import { Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const LiLoveTheme = {
  colors: {
    primary: {
      50: '#FAF5FF',
      100: '#F3E8FF',
      200: '#E9D5FF',
      300: '#D8B4FE',
      400: '#C084FC',
      500: '#8B5CF6',
      600: '#7C3AED',
      700: '#6D28D9',
      800: '#5B21B6',
      900: '#4C1D95',
    },

    secondary: {
      50: '#F0FDFA',
      100: '#CCFBF1',
      200: '#99F6E4',
      300: '#5EEAD4',
      400: '#2DD4BF',
      500: '#14B8A6',
      600: '#0D9488',
      700: '#0F766E',
      800: '#115E59',
      900: '#134E4A',
    },

    accent: {
      50: '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#FB923C',
      500: '#F97316',
      600: '#EA580C',
      700: '#C2410C',
      800: '#9A3412',
      900: '#7C2D12',
    },

    success: {
      light: '#86EFAC',
      main: '#22C55E',
      dark: '#16A34A',
    },

    warning: {
      light: '#FDE047',
      main: '#EAB308',
      dark: '#CA8A04',
    },

    error: {
      light: '#FCA5A5',
      main: '#EF4444',
      dark: '#DC2626',
    },

    neutral: {
      50: '#FAFAFA',
      100: '#F4F4F5',
      200: '#E4E4E7',
      300: '#D4D4D8',
      400: '#A1A1AA',
      500: '#71717A',
      600: '#52525B',
      700: '#3F3F46',
      800: '#27272A',
      900: '#18181B',
    },

    light: {
      background: '#FFFFFF',
      surface: '#F9FAFB',
      surfaceElevated: '#FFFFFF',
      text: '#111827',
      textSecondary: '#6B7280',
      textTertiary: '#9CA3AF',
      border: '#E5E7EB',
      borderLight: '#F3F4F6',
    },

    dark: {
      background: '#0F0F0F',
      surface: '#1A1A1A',
      surfaceElevated: '#262626',
      text: '#F9FAFB',
      textSecondary: '#9CA3AF',
      textTertiary: '#6B7280',
      border: '#374151',
      borderLight: '#1F2937',
    },
  },

  gradients: {
    primary: ['#8B5CF6', '#6D28D9'],
    primarySoft: ['#F3E8FF', '#E9D5FF'],
    secondary: ['#14B8A6', '#0D9488'],
    secondarySoft: ['#CCFBF1', '#99F6E4'],
    accent: ['#F97316', '#EA580C'],
    accentSoft: ['#FFEDD5', '#FED7AA'],
    
    sanctuary: {
      dawn: ['#FECDD3', '#FBB6CE', '#D8B4FE'],
      day: ['#7DD3FC', '#60A5FA', '#3B82F6'],
      dusk: ['#FB923C', '#C084FC', '#6366F1'],
      night: ['#312E81', '#581C87', '#0F172A'],
    },
    
    hero: ['#8B5CF6', '#14B8A6'],
    heroVertical: ['#8B5CF6', '#F97316'],
    
    darkOverlay: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)'],
    lightOverlay: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)'],
    
    glass: {
      light: ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.4)'],
      dark: ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)'],
    },
  },

  typography: {
    fontFamily: {
      primary: Platform.select({
        ios: 'SF Pro Display',
        android: 'Roboto',
        default: 'System',
      }),
      secondary: Platform.select({
        ios: 'SF Pro Text',
        android: 'Roboto',
        default: 'System',
      }),
      mono: Platform.select({
        ios: 'SF Mono',
        android: 'Roboto Mono',
        default: 'monospace',
      }),
    },
    
    h1: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '700' as const,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600' as const,
      letterSpacing: -0.2,
    },
    h4: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    h5: {
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    h6: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    
    bodyLarge: {
      fontSize: 18,
      lineHeight: 28,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    bodySmall: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    
    caption: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400' as const,
      letterSpacing: 0.2,
    },
    captionSmall: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '400' as const,
      letterSpacing: 0.3,
    },
    
    label: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500' as const,
      letterSpacing: 0.1,
    },
    labelSmall: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500' as const,
      letterSpacing: 0.2,
    },
    
    button: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
    },
    buttonSmall: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600' as const,
      letterSpacing: 0.3,
    },
  },

  spacing: {
    xxxs: 2,
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 40,
    huge: 48,
    massive: 64,
  },

  layout: {
    screenPaddingHorizontal: 16,
    screenPaddingVertical: 16,
    cardPadding: 16,
    sectionGap: 24,
    itemGap: 12,
    gridGap: 16,
    
    safeAreaTop: Platform.OS === 'ios' ? 44 : 24,
    safeAreaBottom: Platform.OS === 'ios' ? 34 : 16,
    
    headerHeight: 56,
    tabBarHeight: Platform.OS === 'ios' ? 85 : 65,
    
    maxContentWidth: 428,
    
    touchTargetMin: 44,
    buttonHeight: {
      sm: 36,
      md: 44,
      lg: 52,
    },
    
    inputHeight: 48,
    inputBorderRadius: 12,
    
    cardBorderRadius: 16,
    buttonBorderRadius: 12,
    chipBorderRadius: 20,
    avatarBorderRadius: 9999,
  },

  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 12,
    },
    
    glow: {
      primary: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
      },
      secondary: {
        shadowColor: '#14B8A6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
      },
      accent: {
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
      },
    },
    
    inner: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 0,
    },
  },

  animation: {
    duration: {
      instant: 100,
      fast: 150,
      normal: 250,
      slow: 350,
      slower: 500,
      slowest: 750,
    },
    
    easing: {
      linear: [0, 0, 1, 1] as const,
      easeIn: [0.42, 0, 1, 1] as const,
      easeOut: [0, 0, 0.58, 1] as const,
      easeInOut: [0.42, 0, 0.58, 1] as const,
      spring: [0.175, 0.885, 0.32, 1.275] as const,
      bounce: [0.68, -0.55, 0.265, 1.55] as const,
      smooth: [0.25, 0.1, 0.25, 1] as const,
    },
    
    spring: {
      gentle: { damping: 20, stiffness: 100 },
      wobbly: { damping: 10, stiffness: 180 },
      stiff: { damping: 30, stiffness: 300 },
      slow: { damping: 40, stiffness: 80 },
      molasses: { damping: 60, stiffness: 50 },
    },
    
    gesture: {
      swipeVelocityThreshold: 500,
      swipeDistanceThreshold: 50,
      tapDuration: 200,
      longPressDuration: 500,
      doubleTapDelay: 300,
    },
  },

  haptics: {
    light: 'light' as const,
    medium: 'medium' as const,
    heavy: 'heavy' as const,
    success: 'success' as const,
    warning: 'warning' as const,
    error: 'error' as const,
    selection: 'selection' as const,
  },

  breakpoints: {
    phone: 0,
    phoneLarge: 375,
    tablet: 768,
    desktop: 1024,
  },

  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    isSmall: SCREEN_WIDTH < 375,
    isMedium: SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 768,
    isLarge: SCREEN_WIDTH >= 768,
  },
} as const;

export type LiLoveThemeType = typeof LiLoveTheme;
export type ColorPalette = typeof LiLoveTheme.colors;
export type Typography = typeof LiLoveTheme.typography;
export type Spacing = typeof LiLoveTheme.spacing;
export type Shadows = typeof LiLoveTheme.shadows;
export type Animation = typeof LiLoveTheme.animation;

export const useThemedColors = (isDark: boolean) => {
  const mode = isDark ? LiLoveTheme.colors.dark : LiLoveTheme.colors.light;
  return {
    ...LiLoveTheme.colors,
    mode,
    background: mode.background,
    surface: mode.surface,
    surfaceElevated: mode.surfaceElevated,
    text: mode.text,
    textSecondary: mode.textSecondary,
    textTertiary: mode.textTertiary,
    border: mode.border,
    borderLight: mode.borderLight,
  };
};

export const createResponsiveValue = <T>(
  small: T,
  medium: T,
  large?: T
): T => {
  if (LiLoveTheme.screen.isSmall) return small;
  if (LiLoveTheme.screen.isMedium) return medium;
  return large ?? medium;
};

export const createDynamicStyles = (isDark: boolean) => {
  const colors = useThemedColors(isDark);
  
  return {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    card: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: LiLoveTheme.layout.cardBorderRadius,
      padding: LiLoveTheme.spacing.md,
      ...LiLoveTheme.shadows.md,
    },
    text: {
      color: colors.text,
      ...LiLoveTheme.typography.body,
    },
    textSecondary: {
      color: colors.textSecondary,
      ...LiLoveTheme.typography.bodySmall,
    },
    button: {
      primary: {
        backgroundColor: LiLoveTheme.colors.primary[500],
        borderRadius: LiLoveTheme.layout.buttonBorderRadius,
        height: LiLoveTheme.layout.buttonHeight.md,
        paddingHorizontal: LiLoveTheme.spacing.lg,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      secondary: {
        backgroundColor: LiLoveTheme.colors.secondary[500],
        borderRadius: LiLoveTheme.layout.buttonBorderRadius,
        height: LiLoveTheme.layout.buttonHeight.md,
        paddingHorizontal: LiLoveTheme.spacing.lg,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: LiLoveTheme.layout.buttonBorderRadius,
        height: LiLoveTheme.layout.buttonHeight.md,
        paddingHorizontal: LiLoveTheme.spacing.lg,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: LiLoveTheme.layout.inputBorderRadius,
      height: LiLoveTheme.layout.inputHeight,
      paddingHorizontal: LiLoveTheme.spacing.md,
      color: colors.text,
      ...LiLoveTheme.typography.body,
    },
  };
};

export default LiLoveTheme;
