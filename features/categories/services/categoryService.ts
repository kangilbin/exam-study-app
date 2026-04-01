/**
 * 카테고리 서비스
 * 카테고리 데이터를 로드하고 필터링하는 서비스
 */

import type { Category, CategoryId } from '@/features/questions/types';
import { getQuestionCountMap } from '@/features/questions/services/questionService';

const rawCategories: Category[] = require('@/data/categories.json');

/** 문제 수가 반영된 카테고리 목록 (캐시) */
let categoriesWithCount: Category[] | null = null;

/** 카테고리에 실제 문제 수를 반영 */
function getCategories(): Category[] {
  if (categoriesWithCount) return categoriesWithCount;

  const countMap = getQuestionCountMap();
  categoriesWithCount = rawCategories.map((cat) => ({
    ...cat,
    questionCount: countMap[cat.id] || 0,
  }));
  return categoriesWithCount;
}

/** 전체 카테고리 목록 조회 */
export function getAllCategories(): Category[] {
  return getCategories();
}

/** 그룹별 카테고리 조회 */
export function getCategoriesByGroup(group: Category['group']): Category[] {
  return getCategories().filter((cat) => cat.group === group);
}

/** 카테고리 ID로 조회 */
export function getCategoryById(categoryId: CategoryId): Category | null {
  return getCategories().find((cat) => cat.id === categoryId) || null;
}

/** 문제가 있는 카테고리만 조회 */
export function getCategoriesWithQuestions(): Category[] {
  return getCategories().filter((cat) => cat.questionCount > 0);
}
