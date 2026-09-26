export type ColorRole = 'text' | 'background' | 'border';
export type ThemeMode = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'lilove.appearance.v1';

const background: Record<string, string> = {
  '#ffffff': '#151F30',
  '#f9fafb': '#0B1220',
  '#f8fafc': '#0B1220',
  '#f5f5f5': '#0B1220',
  '#f3f4f6': '#202C40',
  '#f1f5f9': '#202C40',
  '#e5e7eb': '#334155',
  '#e2e8f0': '#334155',
  '#d1d5db': '#475569',
  '#f5f3ff': '#251B42',
  '#ede9fe': '#30204E',
  '#e9d5ff': '#3B2458',
  '#faf5ff': '#251B42',
  '#f3e8ff': '#30204E',
  '#f0fdf4': '#102C25',
  '#dcfce7': '#153B2E',
  '#d1fae5': '#153B2E',
  '#ecfdf5': '#102C25',
  '#eff6ff': '#142B46',
  '#dbeafe': '#193651',
  '#fef2f2': '#3A202A',
  '#fee2e2': '#45252E',
  '#fff7ed': '#382A21',
  '#ffedd5': '#453121',
  '#fffbeb': '#342C1D',
  '#fef3c7': '#403522',
};
const text: Record<string, string> = {
  '#000000': '#F1F5F9',
  '#111827': '#F1F5F9',
  '#1f2937': '#F1F5F9',
  '#0f172a': '#F1F5F9',
  '#374151': '#E2E8F0',
  '#334155': '#E2E8F0',
  '#333333': '#E2E8F0',
  '#666666': '#ABB8CB',
  '#4b5563': '#C0CAD8',
  '#475569': '#C0CAD8',
  '#6b7280': '#ABB8CB',
  '#64748b': '#ABB8CB',
  '#9ca3af': '#94A3B8',
  '#8b5cf6': '#C4B5FD',
  '#7c3aed': '#C4B5FD',
  '#6d28d9': '#C4B5FD',
  '#9333ea': '#D8B4FE',
  '#059669': '#6EE7B7',
  '#16a34a': '#86EFAC',
  '#166534': '#86EFAC',
  '#065f46': '#6EE7B7',
  '#047857': '#6EE7B7',
  '#10b981': '#6EE7B7',
  '#2563eb': '#93C5FD',
  '#3b82f6': '#93C5FD',
  '#dc2626': '#FCA5A5',
  '#991b1b': '#FCA5A5',
  '#ef4444': '#FCA5A5',
  '#d97706': '#FCD34D',
  '#92400e': '#FCD34D',
};

function normalizeColor(value: string) {
  const lower = value.toLowerCase();
  if (lower === 'white') return '#ffffff';
  if (lower === 'black') return '#000000';
  return /^#[\da-f]{3}$/.test(lower)
    ? '#' +
        lower
          .slice(1)
          .split('')
          .map((digit) => digit + digit)
          .join('')
    : lower;
}

// Role matters: a white button label stays white while a white surface becomes dark.
export function themeColor(value: string, isDark: boolean, role: ColorRole = 'text') {
  if (!isDark) return value;
  const key = normalizeColor(value);
  if (role === 'background') return background[key] ?? value;
  if (role === 'border') return background[key] ? '#334155' : value;
  return text[key] ?? value;
}

export function themeStyle<T extends object>(style: T, isDark: boolean): T {
  if (!isDark) return style;
  const result: Record<string, unknown> = Object.fromEntries(Object.entries(style));
  for (const [key, value] of Object.entries(result)) {
    if (typeof value !== 'string') continue;
    if (key === 'backgroundColor') result[key] = themeColor(value, true, 'background');
    else if (key.startsWith('border') && key.endsWith('Color'))
      result[key] = themeColor(value, true, 'border');
    else if (['color', 'textDecorationColor', 'tintColor'].includes(key))
      result[key] = themeColor(value, true, 'text');
  }
  if (!('color' in result) && ('fontSize' in result || 'fontWeight' in result))
    result.color = '#F1F5F9';
  return result as T;
}

type PreferenceState = { mode: ThemeMode | null; ready: boolean; saving: boolean };
type PreferenceStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export class ThemePreference {
  private state: PreferenceState = { mode: null, ready: false, saving: false };
  private listeners = new Set<() => void>();
  private initialization?: Promise<void>;

  constructor(private storage: PreferenceStorage) {}

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(state: PreferenceState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }

  initialize = () => {
    if (!this.initialization) {
      this.initialization = (async () => {
        let mode: ThemeMode | null = null;
        try {
          const stored = await this.storage.getItem(THEME_STORAGE_KEY);
          if (stored === 'dark' || stored === 'light') mode = stored;
        } catch {
          // A read failure must not prevent the app from opening or a later preference save.
        }
        this.publish({ mode, ready: true, saving: false });
      })();
    }
    return this.initialization;
  };

  setDarkMode = async (isDark: boolean) => {
    await this.initialize();
    if (this.state.saving) return;
    const previous = this.state;
    const mode: ThemeMode = isDark ? 'dark' : 'light';
    this.publish({ ...previous, saving: true });
    try {
      await this.storage.setItem(THEME_STORAGE_KEY, mode);
      this.publish({ mode, ready: true, saving: false });
    } catch (error) {
      this.publish({ ...previous, saving: false });
      throw error;
    }
  };
}
