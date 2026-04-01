/**
 * 학습 진행도 커스텀 훅
 * 문제별 학습 결과를 업데이트하고 통계를 제공하는 훅
 */

import { useCallback } from 'react';
import type { CategoryId, CategoryStats, QuestionProgress } from '../types';
import { calculateOverallStats } from '../services/progressService';
import { useUserStore } from '@/store/useUserStore';

interface UseProgressReturn {
  /** 전체 진행도 맵 (questionId -> QuestionProgress) */
  progress: Record<string, QuestionProgress>;
  /**
   * 문제 결과 업데이트
   * @param questionId 문제 ID
   * @param result 결과 (correct/incorrect: 퀴즈 모드, known/unknown: 암기 모드)
   */
  updateProgress: (
    questionId: string,
    result: 'correct' | 'incorrect' | 'known' | 'unknown'
  ) => void;
  /** 특정 문제의 진행도 조회 */
  getProgress: (questionId: string) => QuestionProgress | undefined;
  /** 카테고리별 통계 조회 */
  getCategoryStats: (categoryId: CategoryId) => CategoryStats;
  /** 전체 통계 조회 */
  getOverallStats: () => { totalSeen: number; totalCorrect: number; accuracy: number };
}

export const useProgress = (): UseProgressReturn => {
  const progress = useUserStore((state) => state.progress);
  const updateProgressStore = useUserStore((state) => state.updateProgress);
  const getProgressStore = useUserStore((state) => state.getProgress);
  const getCategoryStatsStore = useUserStore((state) => state.getCategoryStats);

  /** 문제 결과 업데이트 */
  const updateProgress = useCallback(
    (
      questionId: string,
      result: 'correct' | 'incorrect' | 'known' | 'unknown'
    ) => {
      updateProgressStore(questionId, result);
    },
    [updateProgressStore]
  );

  /** 특정 문제의 진행도 조회 */
  const getProgress = useCallback(
    (questionId: string): QuestionProgress | undefined => {
      return getProgressStore(questionId);
    },
    [getProgressStore]
  );

  /** 카테고리별 통계 조회 */
  const getCategoryStats = useCallback(
    (categoryId: CategoryId): CategoryStats => {
      return getCategoryStatsStore(categoryId);
    },
    [getCategoryStatsStore]
  );

  /** 전체 통계 조회 */
  const getOverallStats = useCallback(() => {
    return calculateOverallStats(progress, Object.keys(progress).length);
  }, [progress]);

  return {
    progress,
    updateProgress,
    getProgress,
    getCategoryStats,
    getOverallStats,
  };
};
