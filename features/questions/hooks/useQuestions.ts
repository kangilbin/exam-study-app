/**
 * 문제 조회 커스텀 훅
 * 카테고리별 문제 목록을 로드하고 셔플/북마크 필터를 지원하는 훅
 */

import { useState, useEffect, useCallback } from 'react';
import type { Question, CategoryId } from '../types';
import {
  loadQuestionsByCategory,
  shuffleQuestions,
  getIncorrectQuestions,
} from '../services/questionService';
import { useUserStore } from '@/store/useUserStore';

interface UseQuestionsOptions {
  /** 조회할 카테고리 ID */
  categoryId: CategoryId;
  /** 북마크된 문제만 필터링 */
  bookmarkedOnly?: boolean;
  /** 오답 문제만 필터링 */
  incorrectOnly?: boolean;
}

interface UseQuestionsReturn {
  /** 로드된 문제 목록 */
  questions: Question[];
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** 문제 목록 재로드 */
  refetch: () => void;
}

export const useQuestions = ({
  categoryId,
  bookmarkedOnly = false,
  incorrectOnly = false,
}: UseQuestionsOptions): UseQuestionsReturn => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 셔플 설정 및 진행도를 스토어에서 구독
  const shuffleMode = useUserStore((state) => state.settings.shuffleMode);
  const bookmarks = useUserStore((state) => state.bookmarks);
  const progress = useUserStore((state) => state.progress);

  const loadQuestions = useCallback(() => {
    setIsLoading(true);
    setError(null);

    try {
      let result: Question[] = loadQuestionsByCategory(categoryId);

      // 오답 필터
      if (incorrectOnly) {
        result = getIncorrectQuestions(progress).filter(
          (q) => q.categoryId === categoryId
        );
      }

      // 북마크 필터
      if (bookmarkedOnly) {
        result = result.filter((q) => bookmarks.includes(q.id));
      }

      // 셔플 적용
      if (shuffleMode) {
        result = shuffleQuestions(result);
      }

      setQuestions(result);
    } catch (err) {
      console.warn('[useQuestions] 문제 로드 실패:', err);
      setError('문제를 불러오는 데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [categoryId, shuffleMode, bookmarkedOnly, incorrectOnly, bookmarks, progress]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  return { questions, isLoading, error, refetch: loadQuestions };
};
