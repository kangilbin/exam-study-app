/**
 * 앱 전역 상수 정의
 */

/** 스와이프 임계값 (px) */
export const SWIPE_THRESHOLD = 120;

/** 카드 뒤집기 애니메이션 시간 (ms) */
export const FLIP_DURATION = 400;

/** 블러 해제 애니메이션 시간 (ms) */
export const BLUR_REVEAL_DURATION = 300;

/** AsyncStorage 키 */
export const STORAGE_KEYS = {
  PROGRESS: '@progress',
  BOOKMARKS: '@bookmarks',
  SETTINGS: '@settings',
  LAST_SYNC: '@lastSync',
  USER_STORE: '@user-store',
} as const;

/** 최대 선택지 수 */
export const MAX_CHOICES = 4;

/** 카테고리 그리드 열 수 */
export const CATEGORY_GRID_COLUMNS = 2;

/** 코드 테마 */
export const CODE_THEME = {
  light: 'github',
  dark: 'atomOneDark',
} as const;

/** 코드 폰트 크기 */
export const CODE_FONT_SIZES = {
  small: 12,
  medium: 14,
  large: 16,
} as const;

/** 카드 스와이프 회전 각도 (deg) */
export const SWIPE_ROTATION = 15;

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
