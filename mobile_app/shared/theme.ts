export const Colors = {
  primary: '#0c1c48',
  secondary: '#805522',
  tertiary: '#2f1b00',

  success: '#16a34a',
  warning: '#d97706',
  error: '#ba1a1a',
  info: '#0369a1',

  light: {
    background: '#fbf8fd',
    surface: '#f5f3f7',
    surface2: '#efedf1',
    card: '#ffffff',
    border: '#e2e0e4',
    text: '#1b1b1f',
    textSecondary: '#47464f',
    textMuted: '#77757f',
    inputBg: '#ffffff',
  },
  dark: {
    background: '#0d0f14',
    surface: '#1a1c24',
    surface2: '#22242e',
    card: '#1a1c24',
    border: '#2d2f3a',
    text: '#e2e4ea',
    textSecondary: '#c4c6d0',
    textMuted: '#8b8d97',
    inputBg: '#22242e',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 34,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#0c1c48',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0c1c48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0c1c48',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 25,
    elevation: 8,
  },
} as const;

export const AVATAR_COLORS = [
  '#0c1c48', '#805522', '#16a34a', '#0369a1',
  '#7c3aed', '#be185d', '#0891b2', '#65a30d',
];

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
};

export const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};
