/**
 * 플래시카드 상태 관리 스토어
 * 카드 학습 세션 및 암기 진행도 관리 (AsyncStorage 영속화)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nowISO } from '@/lib/utils';
import { loadFlashcards } from '@/features/flashcards/services/flashcardService';
import type {
  FlashCard,
  CardProgress,
  CardDisplayMode,
  CardStatus,
  LastSession,
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

  // 북마크된 카드 ID (영속화)
  flashcardBookmarks: string[];

  // 마지막 세션 (영속화)
  lastSession: LastSession | null;

  // 세션 액션
  startSession: (categoryId: CategoryId, cards: FlashCard[]) => void;
  flipCard: () => void;
  markKnown: () => void;
  markUnknown: () => void;
  toggleDisplayMode: () => void;
  resetSession: () => void;

  // 네비게이션 액션
  goToPrevious: () => void;
  goToNext: () => void;

  // 북마크 액션
  toggleFlashcardBookmark: (cardId: string) => void;

  // 세션 저장/복원
  saveSession: () => void;
  resumeSession: () => boolean;
  resumeFromProgress: (categoryId: CategoryId) => void;
  clearLastSession: () => void;

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
      flashcardBookmarks: [],
      lastSession: null,

      startSession: (categoryId, cards) => {
        set({
          categoryId,
          cards,
          currentIndex: 0,
          isFlipped: false,
        });
        get().saveSession();
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
        get().saveSession();
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
        get().saveSession();
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

      goToPrevious: () => {
        const { currentIndex } = get();
        if (currentIndex <= 0) return;
        set({
          currentIndex: currentIndex - 1,
          isFlipped: false,
        });
      },

      goToNext: () => {
        const { currentIndex, cards } = get();
        if (currentIndex >= cards.length - 1) return;
        set({
          currentIndex: currentIndex + 1,
          isFlipped: false,
        });
      },

      saveSession: () => {
        const { categoryId, cards, currentIndex } = get();
        if (!categoryId || cards.length === 0) return;
        set({
          lastSession: {
            categoryId,
            cardIds: cards.map((c) => c.id),
            currentIndex,
            savedAt: nowISO(),
          },
        });
      },

      resumeSession: () => {
        const { lastSession } = get();
        if (!lastSession) return false;

        const allCards = loadFlashcards(lastSession.categoryId);
        const cardMap = new Map(allCards.map((c) => [c.id, c]));
        const restoredCards = lastSession.cardIds
          .map((id) => cardMap.get(id))
          .filter((c): c is FlashCard => c !== undefined);

        if (restoredCards.length === 0) return false;

        const safeIndex = Math.min(
          lastSession.currentIndex,
          restoredCards.length - 1
        );
        set({
          categoryId: lastSession.categoryId,
          cards: restoredCards,
          currentIndex: safeIndex,
          isFlipped: false,
        });
        return true;
      },

      resumeFromProgress: (categoryId) => {
        const { cardProgress } = get();
        const allCards = loadFlashcards(categoryId);
        if (allCards.length === 0) return;

        // 첫 번째 unseen 카드 위치 찾기
        let resumeIndex = 0;
        for (let i = 0; i < allCards.length; i++) {
          const p = cardProgress[allCards[i].id];
          if (!p || p.status === 'unseen') {
            resumeIndex = i;
            break;
          }
          // 모든 카드를 본 경우 → 처음부터
          if (i === allCards.length - 1) {
            resumeIndex = 0;
          }
        }

        set({
          categoryId,
          cards: allCards,
          currentIndex: resumeIndex,
          isFlipped: false,
        });
        get().saveSession();
      },

      toggleFlashcardBookmark: (cardId) => {
        const { flashcardBookmarks } = get();
        const isBookmarked = flashcardBookmarks.includes(cardId);
        set({
          flashcardBookmarks: isBookmarked
            ? flashcardBookmarks.filter((id) => id !== cardId)
            : [...flashcardBookmarks, cardId],
        });
      },

      clearLastSession: () => {
        set({ lastSession: null });
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
        lastSession: state.lastSession,
        flashcardBookmarks: state.flashcardBookmarks,
      }),
    }
  )
);