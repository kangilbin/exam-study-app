/**
 * 카테고리 조회 커스텀 훅
 * 카테고리 목록을 로드하고 진행도 통계를 통합하여 제공하는 훅
 */

import { useState, useEffect, useCallback } from 'react';
import type { Category, CategoryId, CategoryStats } from '@/features/questions/types';
import {
  getAllCategories,
  getCategoriesByGroup,
} from '../services/categoryService';
import { useUserStore } from '@/store/useUserStore';

interface UseCategoriesReturn {
  /** 전체 카테고리 목록 */
  categories: Category[];
  /** 로딩 상태 */
  isLoading: boolean;
  /** 그룹별 카테고리 필터링 */
  getByGroup: (group: Category['group']) => Category[];
  /** 카테고리별 학습 통계 조회 */
  getCategoryStats: (categoryId: CategoryId) => CategoryStats;
}

export const useCategories = (): UseCategoriesReturn => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 스토어에서 통계 함수 가져오기
  const getCategoryStatsFromStore = useUserStore((state) => state.getCategoryStats);

  // 카테고리 목록 초기 로드
  useEffect(() => {
    try {
      const all = getAllCategories();
      setCategories(all);
    } catch (error) {
      console.warn('[useCategories] 카테고리 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** 그룹별 카테고리 필터링 */
  const getByGroup = useCallback(
    (group: Category['group']): Category[] => getCategoriesByGroup(group),
    []
  );

  /** 카테고리별 학습 통계 조회 */
  const getCategoryStats = useCallback(
    (categoryId: CategoryId): CategoryStats => getCategoryStatsFromStore(categoryId),
    [getCategoryStatsFromStore]
  );

  return { categories, isLoading, getByGroup, getCategoryStats };
};
