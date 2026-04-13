/**
 * 플래시카드 상태 관리 스토어
 * 카드 학습 세션 및 암기 진행도 관리 (AsyncStorage 영속화)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nowISO } from '@/lib/utils';
import type {
  FlashCard,
  CardProgress,
  CardDisplayMode,
  CardStatus,
} from '@/features/flashcards/types';
import type { CategoryId } from '@/features/questions/types';

interface FlashcardState {
  // 현재 세션 (영속화 제외)
  categoryId: CategoryId | null;
  cards: FlashCard[];
  currentIndex: number;
  isFlipped: boolean;

  // 설정 (영속화)
  displayMode: CardDisplayMode;

  // 카드별 암기 상태 (영속화)
  cardProgress: Record<string, CardProgress>;

  // 세션 액션
  startSession: (categoryId: CategoryId, cards: FlashCard[]) => void;
  flipCard: () => void;
  markKnown: () => void;
  markUnknown: () => void;
  nextCard: () => void;
  toggleDisplayMode: () => void;
  resetSession: () => void;

  // 통계
  getSessionStats: () => {
    known: number;
    unknown: number;
    unseen: number;
    total: number;
  };
  getCategoryProgress: (
    categoryId: CategoryId,
    totalCards: number
  ) => { known: number; total: number; rate: number };
}

export const useFlashcardStore = create<FlashcardState>()(
  persist(
    (set, get) => ({
      categoryId: null,
      cards: [],
      currentIndex: 0,
      isFlipped: false,
      displayMode: 'term-first',
      cardProgress: {},

      startSession: (categoryId, cards) => {
        set({
          categoryId,
          cards,
          currentIndex: 0,
          isFlipped: false,
        });
      },

      flipCard: () => {
        set((state) => ({ isFlipped: !state.isFlipped }));
      },

      markKnown: () => {
        const { cards, currentIndex, cardProgress } = get();
        const card = cards[currentIndex];
        if (!card) return;

        const existing = cardProgress[card.id];
        set({
          cardProgress: {
            ...cardProgress,
            [card.id]: {
              cardId: card.id,
              status: 'known',
              reviewCount: (existing?.reviewCount || 0) + 1,
              lastReviewAt: nowISO(),
            },
          },
          currentIndex: currentIndex + 1,
          isFlipped: false,
        });
      },

      markUnknown: () => {
        const { cards, currentIndex, cardProgress } = get();
        const card = cards[currentIndex];
        if (!card) return;

        const existing = cardProgress[card.id];
        set({
          cardProgress: {
            ...cardProgress,
            [card.id]: {
              cardId: card.id,
              status: 'unknown',
              reviewCount: (existing?.reviewCount || 0) + 1,
              lastReviewAt: nowISO(),
            },
          },
          currentIndex: currentIndex + 1,
          isFlipped: false,
        });
      },

      nextCard: () => {
        const { currentIndex, cards } = get();
        if (currentIndex < cards.length - 1) {
          set({ currentIndex: currentIndex + 1, isFlipped: false });
        }
      },

      toggleDisplayMode: () => {
        set((state) => ({
          displayMode:
            state.displayMode === 'term-first'
              ? 'definition-first'
              : 'term-first',
        }));
      },

      resetSession: () => {
        set({
          categoryId: null,
          cards: [],
          currentIndex: 0,
          isFlipped: false,
        });
      },

      getSessionStats: () => {
        const { cards, cardProgress } = get();
        let known = 0;
        let unknown = 0;
        let unseen = 0;

        for (const card of cards) {
          const progress = cardProgress[card.id];
          if (!progress || progress.status === 'unseen') unseen++;
          else if (progress.status === 'known') known++;
          else unknown++;
        }

        return { known, unknown, unseen, total: cards.length };
      },

      getCategoryProgress: (categoryId, totalCards) => {
        const { cardProgress } = get();
        let known = 0;

        for (const [, progress] of Object.entries(cardProgress)) {
          if (
            progress.cardId.includes(categoryId) &&
            progress.status === 'known'
          ) {
            known++;
          }
        }

        return {
          known,
          total: totalCards,
          rate: totalCards > 0 ? known / totalCards : 0,
        };
      },
    }),
    {
      name: '@flashcard-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        cardProgress: state.cardProgress,
        displayMode: state.displayMode,
      }),
    }
  )
);
