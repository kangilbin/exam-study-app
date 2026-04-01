/**
 * 앱 전역 상수 정의
 */

/** AsyncStorage 키 */
export const STORAGE_KEYS = {
  USER_STORE: '@user-store',
} as const;

/** 앱 색상 팔레트 */
export const COLORS = {
  primary: '#6366f1',      // 인디고
  primaryLight: '#a5b4fc',
  success: '#22c55e',      // 초록
  successLight: '#bbf7d0',
  danger: '#ef4444',       // 빨강
  dangerLight: '#fecaca',
  warning: '#f59e0b',      // 노랑
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  background: '#ffffff',
  backgroundDark: '#111827',
  text: '#111827',
  textDark: '#f9fafb',
  textSecondary: '#6b7280',
  textSecondaryDark: '#9ca3af',
} as const;
