/**
 * 문제 데이터 서비스
 * 로컬 JSON에서 문제 데이터를 로드하고 필터링하는 서비스
 */

import type {
  Question,
  Category,
  CategoryId,
  QuestionProgress,
} from '../types';
import { shuffle } from '@/lib/utils';

// 카테고리별 JSON 파일 매핑 (require로 번들에 포함)
const questionFiles: Record<string, Question[]> = {
  'code-c': require('@/data/questions/code-c.json'),
  'code-java': require('@/data/questions/code-java.json'),
  'code-python': require('@/data/questions/code-python.json'),
  'code-common': require('@/data/questions/code-common.json'),
  'sql-dml': require('@/data/questions/sql-dml.json'),
  'sql-ddl': require('@/data/questions/sql-ddl.json'),
  'sql-set': require('@/data/questions/sql-set.json'),
  'theory-se': require('@/data/questions/theory-se.json'),
  'theory-network': require('@/data/questions/theory-network.json'),
  'theory-db': require('@/data/questions/theory-db.json'),
  'theory-os': require('@/data/questions/theory-os.json'),
  'exam-2020-1': require('@/data/questions/exam-2020-1.json'),
  'exam-2020-2': require('@/data/questions/exam-2020-2.json'),
  'exam-2020-3': require('@/data/questions/exam-2020-3.json'),
  'exam-2020-4': require('@/data/questions/exam-2020-4.json'),
  'exam-2021-1': require('@/data/questions/exam-2021-1.json'),
  'exam-2021-2': require('@/data/questions/exam-2021-2.json'),
  'exam-2021-3': require('@/data/questions/exam-2021-3.json'),
  'exam-2022-1': require('@/data/questions/exam-2022-1.json'),
  'exam-2022-2': require('@/data/questions/exam-2022-2.json'),
  'exam-2022-3': require('@/data/questions/exam-2022-3.json'),
  'exam-2023-1': require('@/data/questions/exam-2023-1.json'),
  'exam-2023-2': require('@/data/questions/exam-2023-2.json'),
  'exam-2023-3': require('@/data/questions/exam-2023-3.json'),
  'exam-2024-1': require('@/data/questions/exam-2024-1.json'),
  'exam-2024-2': require('@/data/questions/exam-2024-2.json'),
  'exam-2024-3': require('@/data/questions/exam-2024-3.json'),
  'exam-2025-1': require('@/data/questions/exam-2025-1.json'),
  'exam-2025-2': require('@/data/questions/exam-2025-2.json'),
  'exam-2025-3': require('@/data/questions/exam-2025-3.json'),
  'memorize-se': require('@/data/questions/memorize-se.json'),
  'memorize-network': require('@/data/questions/memorize-network.json'),
  'memorize-db': require('@/data/questions/memorize-db.json'),
  'memorize-os': require('@/data/questions/memorize-os.json'),
};

/** 메모리 캐시 (앱 실행 중 유지) */
let allQuestionsCache: Question[] | null = null;

/** 전체 문제 로드 */
function loadAllQuestions(): Question[] {
  if (allQuestionsCache) return allQuestionsCache;

  const all: Question[] = [];
  for (const questions of Object.values(questionFiles)) {
    all.push(...questions);
  }
  allQuestionsCache = all;
  return all;
}

/** 카테고리별 문제 로드 */
export function loadQuestionsByCategory(categoryId: CategoryId): Question[] {
  return questionFiles[categoryId] || [];
}

/** 특정 문제 ID로 조회 */
export function getQuestionById(questionId: string): Question | null {
  const all = loadAllQuestions();
  return all.find((q) => q.id === questionId) || null;
}

/** 문제 배열 셔플 (Fisher-Yates) */
export function shuffleQuestions(questions: Question[]): Question[] {
  return shuffle(questions);
}

/** 오답 문제만 조회 (userStore 진행도 기반, group 필터 가능) */
export function getIncorrectQuestions(
  progress: Record<string, QuestionProgress>,
  group?: string
): Question[] {
  const categories: Category[] = require('@/data/categories.json');
  const groupCatIds = group
    ? new Set(categories.filter((c) => c.group === group).map((c) => c.id))
    : null;

  const all = loadAllQuestions();
  return all.filter((q) => {
    const p = progress[q.id];
    if (!p || p.status !== 'incorrect') return false;
    if (groupCatIds && !groupCatIds.has(q.categoryId)) return false;
    return true;
  });
}

/** 특정 그룹의 문제 ID 목록 */
export function getQuestionIdsByGroup(group: string): string[] {
  const categories: Category[] = require('@/data/categories.json');
  const groupCatIds = categories
    .filter((c) => c.group === group)
    .map((c) => c.id);

  const ids: string[] = [];
  for (const [catId, questions] of Object.entries(questionFiles)) {
    if (groupCatIds.includes(catId as CategoryId)) {
      ids.push(...questions.map((q) => q.id));
    }
  }
  return ids;
}

/** 특정 그룹 제외한 문제 수 */
export function getQuestionCountExcludingGroup(excludeGroup: string): number {
  const categories: Category[] = require('@/data/categories.json');
  const excludedIds = categories
    .filter((c) => c.group === excludeGroup)
    .map((c) => c.id);

  return Object.entries(questionFiles)
    .filter(([id]) => !excludedIds.includes(id as CategoryId))
    .reduce((sum, [, questions]) => sum + questions.length, 0);
}

/** 특정 그룹 제외한 문제 ID 목록 */
export function getQuestionIdsExcludingGroup(excludeGroup: string): string[] {
  const categories: Category[] = require('@/data/categories.json');
  const excludedIds = categories
    .filter((c) => c.group === excludeGroup)
    .map((c) => c.id);

  const ids: string[] = [];
  for (const [catId, questions] of Object.entries(questionFiles)) {
    if (!excludedIds.includes(catId as CategoryId)) {
      ids.push(...questions.map((q) => q.id));
    }
  }
  return ids;
}

/** 카테고리별 문제 수 맵 */
export function getQuestionCountMap(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const [categoryId, questions] of Object.entries(questionFiles)) {
    map[categoryId] = questions.length;
  }
  return map;
}
