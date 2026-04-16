/**
 * 플래시카드 서비스
 * 카드 데이터를 로드하고 필터링하는 서비스
 */

import type { FlashCard } from '@/features/flashcards/types';
import type { CategoryId } from '@/features/questions/types';
import { shuffle } from '@/lib/utils';

const flashcardData: Record<string, FlashCard[]> = {
  'memorize-se': require('@/data/flashcards/flashcards-se.json'),
  'memorize-db': require('@/data/flashcards/flashcards-db.json'),
  'memorize-network': require('@/data/flashcards/flashcards-network.json'),
  'memorize-os': require('@/data/flashcards/flashcards-os.json'),
};

/** 카테고리별 카드 로드 */
export const loadFlashcards = (categoryId: CategoryId): FlashCard[] => {
  return flashcardData[categoryId] || [];
};

/** 카테고리별 카드 수 조회 */
export const getFlashcardCount = (categoryId: CategoryId): number => {
  return (flashcardData[categoryId] || []).length;
};

/** 카드 셔플 */
export const shuffleCards = (cards: FlashCard[]): FlashCard[] => shuffle(cards);

/** 암기 카테고리 여부 확인 */
export const isMemorizeCategory = (categoryId: string): boolean => {
  return categoryId.startsWith('memorize-');
};

/** 알고리즘 카테고리 여부 확인 */
export const isAlgorithmCategory = (categoryId: string): boolean => {
  return categoryId.startsWith('code-') || categoryId.startsWith('sql-');
};
