import { Colors } from '../constants/colors';

export const Theme = {
  colors: Colors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 28,
    pill: 999,
  },
  typography: {
    heading: {
      fontFamily: 'serif',
      fontWeight: '700',
      letterSpacing: 0,
    },
    body: {
      fontFamily: 'System',
      letterSpacing: 0,
    },
  },
  shadows: {
    soft: {
      shadowColor: '#102822',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 30,
      elevation: 8,
    },
    glow: {
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.22,
      shadowRadius: 32,
      elevation: 10,
    },
  },
};

export default Theme;
