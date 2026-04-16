/**
 * 플래시카드 관련 타입 정의
 * 암기 카드 학습 기능의 도메인 모델
 */

import type { CategoryId } from '@/features/questions/types';

/** 플래시카드 엔티티 */
export interface FlashCard {
  id: string;                          // "card-{categoryId}_{number}"
  categoryId: CategoryId;              // memorize-se, memorize-db 등
  subcategory: string;                 // 소분류
  term: string;                        // 용어 (카드 앞면)
  definition: string;                  // 설명 (카드 뒷면)
  mnemonic?: string;                   // 암기법 (예: "도부이결다조")
  tip?: string;                        // 암기 팁
  relatedTerms?: string[];             // 관련 카드 ID
  source: 'memorize' | 'theory';       // 원본 출처
  sourceQuestionId: string;            // 원본 문제 ID
  tags: string[];
}

/** 카드 암기 상태 */
export type CardStatus = 'unseen' | 'known' | 'unknown';

/** 카드별 진행도 */
export interface CardProgress {
  cardId: string;
  status: CardStatus;
  reviewCount: number;
  lastReviewAt: string;                // ISO 8601
}

/** 카드 표시 모드 */
export type CardDisplayMode = 'term-first' | 'definition-first';

/** 마지막 학습 세션 정보 (영속화 대상) */
export interface LastSession {
  categoryId: CategoryId;
  cardIds: string[];      // 카드 순서 보존
  currentIndex: number;   // 마지막 학습 위치
  savedAt: string;        // ISO 8601
}
