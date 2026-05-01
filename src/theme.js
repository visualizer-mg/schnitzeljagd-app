// GitHub Dark Theme — extracted from Obsidian GitHub Theme
// All colors match the .theme-dark section of the theme CSS

export const colors = {
  // Backgrounds
  bgPrimary: '#0d1117',
  bgSecondary: '#161b22',
  bgTertiary: '#010409',
  bgHover: 'rgba(177, 186, 196, 0.12)',
  bgSelected: 'rgba(177, 186, 196, 0.08)',

  // Borders
  border: '#30363d',
  borderSubtle: '#21262d',
  borderHover: '#8b949e',

  // Text
  text: '#c9d1d9',
  textMuted: '#8b949e',
  textSubtle: '#6e7681',
  textBright: '#f0f6fc',

  // Accent colors
  green: '#7ee787',
  greenDark: '#238636',
  greenHover: '#2ea043',
  blue: '#6CB6FF',
  red: '#F47067',
  orange: '#FFA657',
  yellow: '#d29922',
  cyan: '#A5D6FF',
  purple: '#D2A8FF',
  pink: '#f778ba',

  // Semantic
  accent: '#6CB6FF',
  success: '#7ee787',
  warning: '#d29922',
  danger: '#F47067',
};

export const fonts = {
  mono: "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', Menlo, Consolas, monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
};

// Person colors — each family member gets a distinct color from the theme
export const personColors = {
  andreas: colors.red,
  beate: colors.orange,
  theresa: colors.blue,
  mark: colors.green,
  andrea: colors.purple,
  rowena: colors.yellow,
  chris: colors.cyan,
  ellen: colors.pink,
};

// Status colors
export const statusColors = {
  ausstehend: colors.textSubtle,
  angefragt: colors.orange,
  'in Arbeit': colors.yellow,
  geliefert: colors.green,
  eingebaut: colors.blue,
  geplant: colors.textSubtle,
  designed: colors.orange,
  getestet: colors.green,
};
