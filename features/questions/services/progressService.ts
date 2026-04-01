/**
 * 학습 진행도 서비스
 * 학습 결과를 기록하고 통계를 계산하는 서비스
 */

import type { CategoryId, QuestionProgress, CategoryStats } from '../types';
import { nowISO } from '@/lib/utils';

/** 학습 결과 기록 */
export function recordAnswer(
  questionId: string,
  result: 'correct' | 'incorrect' | 'known' | 'unknown',
  existing?: QuestionProgress
): QuestionProgress {
  const base: QuestionProgress = existing || {
    questionId,
    status: 'unseen',
    attempts: 0,
    lastAttemptAt: '',
    isBookmarked: false,
  };

  return {
    ...base,
    questionId,
    status: result,
    attempts: base.attempts + 1,
    lastAttemptAt: nowISO(),
  };
}

/** 카테고리별 통계 계산 */
export function calculateCategoryStats(
  categoryId: CategoryId,
  progress: Record<string, QuestionProgress>,
  questionIds: string[]
): CategoryStats {
  let seenCount = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let bookmarkedCount = 0;

  for (const qId of questionIds) {
    const p = progress[qId];
    if (!p) continue;

    if (p.status !== 'unseen') seenCount++;
    if (p.status === 'correct' || p.status === 'known') correctCount++;
    if (p.status === 'incorrect' || p.status === 'unknown') incorrectCount++;
    if (p.isBookmarked) bookmarkedCount++;
  }

  const totalQuestions = questionIds.length;
  const accuracy = seenCount > 0 ? correctCount / seenCount : 0;

  return {
    categoryId,
    totalQuestions,
    seenCount,
    correctCount,
    incorrectCount,
    bookmarkedCount,
    accuracy,
  };
}

/** 특정 문제 ID 목록 기준 통계 계산 */
export function calculateOverallStatsFiltered(
  progress: Record<string, QuestionProgress>,
  questionIds: string[]
): { totalSeen: number; totalCorrect: number; accuracy: number } {
  let totalSeen = 0;
  let totalCorrect = 0;

  for (const qId of questionIds) {
    const p = progress[qId];
    if (!p) continue;
    if (p.status !== 'unseen') totalSeen++;
    if (p.status === 'correct' || p.status === 'known') totalCorrect++;
  }

  return {
    totalSeen,
    totalCorrect,
    accuracy: totalSeen > 0 ? totalCorrect / totalSeen : 0,
  };
}

/** 전체 통계 계산 */
export function calculateOverallStats(
  progress: Record<string, QuestionProgress>,
  totalQuestions: number
): { totalSeen: number; totalCorrect: number; accuracy: number } {
  let totalSeen = 0;
  let totalCorrect = 0;

  for (const p of Object.values(progress)) {
    if (p.status !== 'unseen') totalSeen++;
    if (p.status === 'correct' || p.status === 'known') totalCorrect++;
  }

  return {
    totalSeen,
    totalCorrect,
    accuracy: totalSeen > 0 ? totalCorrect / totalSeen : 0,
  };
}
