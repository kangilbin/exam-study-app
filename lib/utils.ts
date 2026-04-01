/**
 * 공통 유틸리티 함수
 */

/**
 * Fisher-Yates 셔플 알고리즘
 * 배열을 무작위로 섞어 새 배열을 반환한다 (원본 불변)
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 현재 ISO 8601 문자열 반환
 */
export function nowISO(): string {
  return new Date().toISOString();
}

