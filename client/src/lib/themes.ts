// Premium Theme System for LiLove
// Beautiful, customizable themes with dynamic color generation

export interface Theme {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  category: 'dark' | 'light' | 'special';
  colors: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
    // Additional colors for premium themes
    gradient?: string;
    glow?: string;
    highlight?: string;
  };
  font?: {
    family: string;
    heading?: string;
    mono?: string;
  };
  effects?: {
    blur?: boolean;
    animations?: 'subtle' | 'moderate' | 'vibrant';
    particles?: boolean;
    gradients?: boolean;
  };
}

// Premium Themes Collection
export const themes: Theme[] = [
  // === FREE THEMES ===
  {
    id: 'default-light',
    name: 'Default Light',
    description: 'Clean and professional light theme',
    isPremium: false,
    category: 'light',
    colors: {
      background: '0 0% 100%',
      foreground: '222.2 47.4% 11.2%',
      card: '0 0% 100%',
      cardForeground: '222.2 47.4% 11.2%',
      popover: '0 0% 100%',
      popoverForeground: '222.2 47.4% 11.2%',
      primary: '222.2 47.4% 11.2%',
      primaryForeground: '210 40% 98%',
      secondary: '210 40% 96.1%',
      secondaryForeground: '222.2 47.4% 11.2%',
      muted: '210 40% 96.1%',
      mutedForeground: '215.4 16.3% 46.9%',
      accent: '210 40% 96.1%',
      accentForeground: '222.2 47.4% 11.2%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '210 40% 98%',
      border: '214.3 31.8% 91.4%',
      input: '214.3 31.8% 91.4%',
      ring: '222.2 47.4% 11.2%',
    },
  },
  {
    id: 'default-dark',
    name: 'Default Dark',
    description: 'Easy on the eyes dark theme',
    isPremium: false,
    category: 'dark',
    colors: {
      background: '222.2 84% 4.9%',
      foreground: '210 40% 98%',
      card: '222.2 84% 4.9%',
      cardForeground: '210 40% 98%',
      popover: '222.2 84% 4.9%',
      popoverForeground: '210 40% 98%',
      primary: '210 40% 98%',
      primaryForeground: '222.2 47.4% 11.2%',
      secondary: '217.2 32.6% 17.5%',
      secondaryForeground: '210 40% 98%',
      muted: '217.2 32.6% 17.5%',
      mutedForeground: '215 20.2% 65.1%',
      accent: '217.2 32.6% 17.5%',
      accentForeground: '210 40% 98%',
      destructive: '0 62.8% 30.6%',
      destructiveForeground: '210 40% 98%',
      border: '217.2 32.6% 17.5%',
      input: '217.2 32.6% 17.5%',
      ring: '212.7 26.8% 83.9%',
    },
  },

  // === PREMIUM DARK THEMES ===
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep blues and purples for late night focus',
    isPremium: true,
    category: 'dark',
    colors: {
      background: '234 45% 8%',
      foreground: '213 31% 91%',
      card: '234 40% 12%',
      cardForeground: '213 31% 91%',
      popover: '234 40% 12%',
      popoverForeground: '213 31% 91%',
      primary: '263 70% 65%',
      primaryForeground: '0 0% 100%',
      secondary: '234 35% 20%',
      secondaryForeground: '213 31% 91%',
      muted: '234 30% 25%',
      mutedForeground: '213 20% 70%',
      accent: '263 60% 55%',
      accentForeground: '0 0% 100%',
      destructive: '350 80% 55%',
      destructiveForeground: '0 0% 100%',
      border: '234 30% 18%',
      input: '234 30% 18%',
      ring: '263 70% 65%',
      gradient: 'linear-gradient(135deg, hsl(234 45% 8%) 0%, hsl(263 70% 20%) 100%)',
      glow: '263 70% 65%',
    },
    font: {
      family: 'Inter, system-ui, sans-serif',
      heading: 'Poppins, sans-serif',
    },
    effects: {
      blur: true,
      animations: 'subtle',
      gradients: true,
    },
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    description: 'Calming ocean depths with aqua accents',
    isPremium: true,
    category: 'dark',
    colors: {
      background: '200 50% 6%',
      foreground: '200 10% 94%',
      card: '200 45% 10%',
      cardForeground: '200 10% 94%',
      popover: '200 45% 10%',
      popoverForeground: '200 10% 94%',
      primary: '180 65% 55%',
      primaryForeground: '200 50% 6%',
      secondary: '200 40% 18%',
      secondaryForeground: '200 10% 94%',
      muted: '200 35% 22%',
      mutedForeground: '200 15% 75%',
      accent: '180 55% 45%',
      accentForeground: '200 50% 6%',
      destructive: '0 75% 50%',
      destructiveForeground: '0 0% 100%',
      border: '200 35% 15%',
      input: '200 35% 15%',
      ring: '180 65% 55%',
      gradient: 'linear-gradient(180deg, hsl(200 50% 6%) 0%, hsl(180 65% 15%) 100%)',
      glow: '180 65% 55%',
    },
    font: {
      family: 'Outfit, system-ui, sans-serif',
    },
    effects: {
      blur: true,
      animations: 'moderate',
      particles: true,
    },
  },
  {
    id: 'forest-night',
    name: 'Forest Night',
    description: 'Natural greens and earthy tones',
    isPremium: true,
    category: 'dark',
    colors: {
      background: '150 25% 7%',
      foreground: '90 20% 92%',
      card: '150 20% 11%',
      cardForeground: '90 20% 92%',
      popover: '150 20% 11%',
      popoverForeground: '90 20% 92%',
      primary: '142 71% 45%',
      primaryForeground: '0 0% 100%',
      secondary: '150 15% 20%',
      secondaryForeground: '90 20% 92%',
      muted: '150 15% 25%',
      mutedForeground: '90 15% 70%',
      accent: '142 60% 40%',
      accentForeground: '0 0% 100%',
      destructive: '0 65% 48%',
      destructiveForeground: '0 0% 100%',
      border: '150 15% 17%',
      input: '150 15% 17%',
      ring: '142 71% 45%',
      gradient: 'linear-gradient(135deg, hsl(150 25% 7%) 0%, hsl(142 40% 15%) 100%)',
    },
    font: {
      family: 'DM Sans, system-ui, sans-serif',
    },
    effects: {
      animations: 'subtle',
      gradients: true,
    },
  },

  // === PREMIUM LIGHT THEMES ===
  {
    id: 'sunrise',
    name: 'Sunrise',
    description: 'Warm oranges and soft yellows',
    isPremium: true,
    category: 'light',
    colors: {
      background: '36 100% 99%',
      foreground: '20 14% 10%',
      card: '36 50% 98%',
      cardForeground: '20 14% 10%',
      popover: '36 50% 98%',
      popoverForeground: '20 14% 10%',
      primary: '24 95% 53%',
      primaryForeground: '0 0% 100%',
      secondary: '36 40% 93%',
      secondaryForeground: '20 14% 10%',
      muted: '36 35% 90%',
      mutedForeground: '20 10% 40%',
      accent: '24 85% 48%',
      accentForeground: '0 0% 100%',
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 100%',
      border: '36 30% 85%',
      input: '36 30% 85%',
      ring: '24 95% 53%',
      gradient: 'linear-gradient(135deg, hsl(36 100% 99%) 0%, hsl(24 60% 95%) 100%)',
      highlight: '36 100% 75%',
    },
    font: {
      family: 'Plus Jakarta Sans, system-ui, sans-serif',
    },
    effects: {
      animations: 'moderate',
      gradients: true,
    },
  },
  {
    id: 'cloud-nine',
    name: 'Cloud Nine',
    description: 'Soft blues and whites like floating clouds',
    isPremium: true,
    category: 'light',
    colors: {
      background: '210 100% 99%',
      foreground: '210 24% 12%',
      card: '210 60% 98%',
      cardForeground: '210 24% 12%',
      popover: '210 60% 98%',
      popoverForeground: '210 24% 12%',
      primary: '210 78% 60%',
      primaryForeground: '0 0% 100%',
      secondary: '210 40% 94%',
      secondaryForeground: '210 24% 12%',
      muted: '210 35% 91%',
      mutedForeground: '210 15% 45%',
      accent: '210 68% 55%',
      accentForeground: '0 0% 100%',
      destructive: '0 70% 55%',
      destructiveForeground: '0 0% 100%',
      border: '210 30% 88%',
      input: '210 30% 88%',
      ring: '210 78% 60%',
      gradient: 'linear-gradient(180deg, hsl(210 100% 99%) 0%, hsl(210 60% 94%) 100%)',
    },
    font: {
      family: 'Rubik, system-ui, sans-serif',
    },
    effects: {
      blur: true,
      animations: 'subtle',
    },
  },
  {
    id: 'zen-garden',
    name: 'Zen Garden',
    description: 'Peaceful greens and natural tones',
    isPremium: true,
    category: 'light',
    colors: {
      background: '120 25% 98%',
      foreground: '120 20% 10%',
      card: '120 20% 97%',
      cardForeground: '120 20% 10%',
      popover: '120 20% 97%',
      popoverForeground: '120 20% 10%',
      primary: '142 52% 45%',
      primaryForeground: '0 0% 100%',
      secondary: '120 18% 92%',
      secondaryForeground: '120 20% 10%',
      muted: '120 15% 88%',
      mutedForeground: '120 10% 40%',
      accent: '142 45% 40%',
      accentForeground: '0 0% 100%',
      destructive: '0 60% 50%',
      destructiveForeground: '0 0% 100%',
      border: '120 15% 85%',
      input: '120 15% 85%',
      ring: '142 52% 45%',
      gradient: 'linear-gradient(135deg, hsl(120 25% 98%) 0%, hsl(142 30% 93%) 100%)',
    },
    font: {
      family: 'Nunito, system-ui, sans-serif',
    },
    effects: {
      animations: 'subtle',
      gradients: true,
    },
  },

  // === PREMIUM SPECIAL THEMES ===
  {
    id: 'matrix',
    name: 'Matrix',
    description: 'Enter the digital realm with green on black',
    isPremium: true,
    category: 'special',
    colors: {
      background: '120 100% 2%',
      foreground: '120 100% 65%',
      card: '120 100% 5%',
      cardForeground: '120 100% 65%',
      popover: '120 100% 5%',
      popoverForeground: '120 100% 65%',
      primary: '120 100% 50%',
      primaryForeground: '120 100% 2%',
      secondary: '120 100% 10%',
      secondaryForeground: '120 100% 65%',
      muted: '120 50% 15%',
      mutedForeground: '120 80% 55%',
      accent: '120 90% 45%',
      accentForeground: '120 100% 2%',
      destructive: '0 100% 40%',
      destructiveForeground: '0 0% 100%',
      border: '120 100% 12%',
      input: '120 100% 12%',
      ring: '120 100% 50%',
      glow: '120 100% 50%',
    },
    font: {
      family: 'JetBrains Mono, monospace',
      mono: 'JetBrains Mono, monospace',
    },
    effects: {
      animations: 'vibrant',
      particles: true,
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon purple and cyan in a dark future',
    isPremium: true,
    category: 'special',
    colors: {
      background: '280 30% 5%',
      foreground: '180 80% 85%',
      card: '280 35% 9%',
      cardForeground: '180 80% 85%',
      popover: '280 35% 9%',
      popoverForeground: '180 80% 85%',
      primary: '180 100% 60%',
      primaryForeground: '280 30% 5%',
      secondary: '300 70% 25%',
      secondaryForeground: '180 80% 85%',
      muted: '280 25% 20%',
      mutedForeground: '180 60% 70%',
      accent: '300 100% 65%',
      accentForeground: '280 30% 5%',
      destructive: '340 90% 60%',
      destructiveForeground: '0 0% 100%',
      border: '280 30% 15%',
      input: '280 30% 15%',
      ring: '180 100% 60%',
      gradient: 'linear-gradient(135deg, hsl(280 30% 5%) 0%, hsl(300 50% 15%) 50%, hsl(180 50% 15%) 100%)',
      glow: '180 100% 60%',
      highlight: '300 100% 65%',
    },
    font: {
      family: 'Orbitron, system-ui, sans-serif',
      heading: 'Audiowide, sans-serif',
    },
    effects: {
      blur: true,
      animations: 'vibrant',
      particles: true,
      gradients: true,
    },
  },
  {
    id: 'retro-terminal',
    name: 'Retro Terminal',
    description: 'Amber phosphor CRT nostalgia',
    isPremium: true,
    category: 'special',
    colors: {
      background: '30 10% 3%',
      foreground: '38 100% 60%',
      card: '30 15% 6%',
      cardForeground: '38 100% 60%',
      popover: '30 15% 6%',
      popoverForeground: '38 100% 60%',
      primary: '38 100% 50%',
      primaryForeground: '30 10% 3%',
      secondary: '30 20% 12%',
      secondaryForeground: '38 100% 60%',
      muted: '30 15% 18%',
      mutedForeground: '38 80% 50%',
      accent: '38 90% 45%',
      accentForeground: '30 10% 3%',
      destructive: '0 80% 45%',
      destructiveForeground: '0 0% 100%',
      border: '30 20% 10%',
      input: '30 20% 10%',
      ring: '38 100% 50%',
      glow: '38 100% 50%',
    },
    font: {
      family: 'IBM Plex Mono, monospace',
      mono: 'IBM Plex Mono, monospace',
    },
    effects: {
      animations: 'subtle',
    },
  },
];

// Premium Fonts Collection
export const premiumFonts = [
  { id: 'inter', name: 'Inter', family: 'Inter, system-ui, sans-serif', isPremium: false },
  { id: 'poppins', name: 'Poppins', family: 'Poppins, sans-serif', isPremium: true },
  { id: 'plusjakarta', name: 'Plus Jakarta Sans', family: 'Plus Jakarta Sans, sans-serif', isPremium: true },
  { id: 'outfit', name: 'Outfit', family: 'Outfit, sans-serif', isPremium: true },
  { id: 'dmsans', name: 'DM Sans', family: 'DM Sans, sans-serif', isPremium: true },
  { id: 'rubik', name: 'Rubik', family: 'Rubik, sans-serif', isPremium: true },
  { id: 'nunito', name: 'Nunito', family: 'Nunito, sans-serif', isPremium: true },
  { id: 'jetbrains', name: 'JetBrains Mono', family: 'JetBrains Mono, monospace', isPremium: true },
  { id: 'ibmplex', name: 'IBM Plex Mono', family: 'IBM Plex Mono, monospace', isPremium: true },
  { id: 'orbitron', name: 'Orbitron', family: 'Orbitron, sans-serif', isPremium: true },
];

// Layout Options
export const layoutOptions = [
  { id: 'compact', name: 'Compact', description: 'Minimal spacing for maximum content', isPremium: true },
  { id: 'comfortable', name: 'Comfortable', description: 'Balanced spacing (default)', isPremium: false },
  { id: 'spacious', name: 'Spacious', description: 'Extra breathing room', isPremium: true },
];

// Apply theme to DOM
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  
  // Apply color variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    if (key === 'gradient' || key === 'glow' || key === 'highlight') {
      if (value) {
        root.style.setProperty(`--${key}`, value);
      }
    } else {
      // Convert HSL string to CSS variable format
      root.style.setProperty(`--${key}`, value);
    }
  });
  
  // Apply font if specified
  if (theme.font?.family) {
    root.style.setProperty('--font-sans', theme.font.family);
  }
  if (theme.font?.heading) {
    root.style.setProperty('--font-heading', theme.font.heading);
  }
  if (theme.font?.mono) {
    root.style.setProperty('--font-mono', theme.font.mono);
  }
  
  // Apply effects
  if (theme.effects) {
    root.setAttribute('data-theme-effects', JSON.stringify(theme.effects));
  }
  
  // Store theme ID
  root.setAttribute('data-theme-id', theme.id);
}

// Get theme by ID
export function getThemeById(id: string): Theme | undefined {
  return themes.find(t => t.id === id);
}

// Get available themes based on subscription
export function getAvailableThemes(isPremium: boolean): Theme[] {
  return isPremium ? themes : themes.filter(t => !t.isPremium);
}

// Custom color generation for user-created themes
export function generateCustomTheme(baseColor: string, name: string): Theme {
  // This would use color theory to generate a full palette
  // from a single base color - simplified for now
  return {
    id: `custom-${Date.now()}`,
    name,
    description: 'Your custom theme',
    isPremium: true,
    category: 'special',
    colors: {
      // Would generate full palette from baseColor
      background: '0 0% 100%',
      foreground: '222.2 47.4% 11.2%',
      card: '0 0% 100%',
      cardForeground: '222.2 47.4% 11.2%',
      popover: '0 0% 100%',
      popoverForeground: '222.2 47.4% 11.2%',
      primary: baseColor,
      primaryForeground: '210 40% 98%',
      secondary: '210 40% 96.1%',
      secondaryForeground: '222.2 47.4% 11.2%',
      muted: '210 40% 96.1%',
      mutedForeground: '215.4 16.3% 46.9%',
      accent: '210 40% 96.1%',
      accentForeground: '222.2 47.4% 11.2%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '210 40% 98%',
      border: '214.3 31.8% 91.4%',
      input: '214.3 31.8% 91.4%',
      ring: baseColor,
    },
  };
}