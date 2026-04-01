/**
 * 문제 데이터 서비스
 * 로컬 JSON에서 문제 데이터를 로드하고 필터링하는 서비스
 */

import type {
  Question,
  CategoryId,
  QuestionType,
  Difficulty,
  QuestionSource,
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

/** 여러 카테고리의 문제 로드 */
export function loadQuestionsByCategories(categoryIds: CategoryId[]): Question[] {
  const result: Question[] = [];
  for (const id of categoryIds) {
    result.push(...loadQuestionsByCategory(id));
  }
  return result;
}

/** 특정 문제 ID로 조회 */
export function getQuestionById(questionId: string): Question | null {
  const all = loadAllQuestions();
  return all.find((q) => q.id === questionId) || null;
}

/** 태그로 문제 검색 */
export function searchQuestionsByTag(tag: string): Question[] {
  const all = loadAllQuestions();
  return all.filter((q) => q.tags.some((t) => t.includes(tag)));
}

/** 문제 배열 셔플 (Fisher-Yates) */
export function shuffleQuestions(questions: Question[]): Question[] {
  return shuffle(questions);
}

/** 필터 조건에 맞는 문제 조회 */
export function filterQuestions(options: {
  categoryId?: CategoryId;
  type?: QuestionType;
  difficulty?: Difficulty;
  source?: QuestionSource;
  year?: number;
}): Question[] {
  let result = options.categoryId
    ? loadQuestionsByCategory(options.categoryId)
    : loadAllQuestions();

  if (options.type) {
    result = result.filter((q) => q.type === options.type);
  }
  if (options.difficulty) {
    result = result.filter((q) => q.difficulty === options.difficulty);
  }
  if (options.source) {
    result = result.filter((q) => q.source === options.source);
  }
  if (options.year) {
    result = result.filter((q) => q.year === options.year);
  }

  return result;
}

/** 오답 문제만 조회 (userStore 진행도 기반) */
export function getIncorrectQuestions(
  progress: Record<string, QuestionProgress>
): Question[] {
  const all = loadAllQuestions();
  return all.filter((q) => {
    const p = progress[q.id];
    return p && p.status === 'incorrect';
  });
}

/** 전체 문제 수 */
export function getTotalQuestionCount(): number {
  return loadAllQuestions().length;
}

/** 카테고리별 문제 수 맵 */
export function getQuestionCountMap(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const [categoryId, questions] of Object.entries(questionFiles)) {
    map[categoryId] = questions.length;
  }
  return map;
}
