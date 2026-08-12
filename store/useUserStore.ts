/**
 * 사용자 상태 관리 스토어
 * 학습 진행도, 북마크, 설정 관리 (AsyncStorage 영속화)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  QuestionProgress,
  CategoryId,
  CategoryStats,
  UserSettings,
} from '@/features/questions/types';
import {
  recordAnswer,
  calculateCategoryStats,
} from '@/features/questions/services/progressService';
import { loadQuestionsByCategory } from '@/features/questions/services/questionService';
import { nowISO } from '@/lib/utils';

interface UserState {
  // 상태
  progress: Record<string, QuestionProgress>;
  bookmarks: string[];
  settings: UserSettings;

  // 액션 (진행도)
  updateProgress: (
    questionId: string,
    result: 'correct' | 'incorrect' | 'known' | 'unknown'
  ) => void;

  // 액션 (북마크)
  toggleBookmark: (questionId: string) => void;

  // 액션 (설정)
  updateSettings: (settings: Partial<UserSettings>) => void;

  // 액션 (초기화)
  resetCategoryProgress: (categoryId: CategoryId) => void;

  // 액션 (통계)
  getCategoryStats: (categoryId: CategoryId) => CategoryStats;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      progress: {},
      bookmarks: [],
      settings: {
        shuffleMode: false,
        fontSize: 'medium' as const,
      },

      updateProgress: (questionId, result) => {
        const { progress } = get();
        const existing = progress[questionId];
        const updated = recordAnswer(questionId, result, existing);

        set({
          progress: { ...progress, [questionId]: updated },
        });
      },

      toggleBookmark: (questionId) => {
        const { bookmarks, progress } = get();
        const isCurrentlyBookmarked = bookmarks.includes(questionId);

        // 진행도의 isBookmarked도 업데이트
        const existing = progress[questionId];
        const updatedProgress = {
          ...progress,
          [questionId]: {
            questionId,
            status: existing?.status || 'unseen',
            attempts: existing?.attempts || 0,
            lastAttemptAt: existing?.lastAttemptAt || nowISO(),
            isBookmarked: !isCurrentlyBookmarked,
          } as QuestionProgress,
        };

        set({
          bookmarks: isCurrentlyBookmarked
            ? bookmarks.filter((id) => id !== questionId)
            : [...bookmarks, questionId],
          progress: updatedProgress,
        });
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      resetCategoryProgress: (categoryId) => {
        const { progress } = get();
        const questions = loadQuestionsByCategory(categoryId);
        const questionIds = new Set(questions.map((q) => q.id));
        const updated = { ...progress };
        for (const id of questionIds) {
          delete updated[id];
        }
        set({ progress: updated });
      },

      getCategoryStats: (categoryId) => {
        const { progress } = get();
        const questions = loadQuestionsByCategory(categoryId);
        const questionIds = questions.map((q) => q.id);
        return calculateCategoryStats(categoryId, progress, questionIds);
      },
    }),
    {
      name: '@user-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // v1: 저작권 대응 재배치로 문항 id가 다른 문항을 가리키게 되어, 이전에 저장된
      // progress/bookmarks(questionId 기준)를 그대로 두면 엉뚱한 문항에 결과가 붙는다.
      // 버전이 낮은 기존 데이터는 progress/bookmarks만 초기화하고 settings는 유지한다.
      migrate: (persistedState, version) => {
        const state = persistedState as UserState;
        if (version < 1) {
          return { ...state, progress: {}, bookmarks: [] };
        }
        return state;
      },
      partialize: (state) => ({
        progress: state.progress,
        bookmarks: state.bookmarks,
        settings: state.settings,
      }),
    }
  )
);
