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
 * 퍼센트 계산 (소수점 1자리)
 */
export function calcPercent(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}

/**
 * 초(second)를 "분:초" 형식으로 변환
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 현재 ISO 8601 문자열 반환
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * 배열에서 n개 랜덤 추출 (비복원)
 */
export function sampleN<T>(array: T[], n: number): T[] {
  const shuffled = shuffle(array);
  return shuffled.slice(0, Math.min(n, array.length));
}
