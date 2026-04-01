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
  calculateOverallStats,
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
  getProgress: (questionId: string) => QuestionProgress | undefined;

  // 액션 (북마크)
  toggleBookmark: (questionId: string) => void;
  isBookmarked: (questionId: string) => boolean;
  getBookmarkedQuestions: () => string[];

  // 액션 (설정)
  updateSettings: (settings: Partial<UserSettings>) => void;

  // 액션 (통계)
  getCategoryStats: (categoryId: CategoryId) => CategoryStats;
  getOverallStats: () => {
    totalSeen: number;
    totalCorrect: number;
    accuracy: number;
  };
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      progress: {},
      bookmarks: [],
      settings: {
        darkMode: false,
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

      getProgress: (questionId) => {
        return get().progress[questionId];
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

      isBookmarked: (questionId) => {
        return get().bookmarks.includes(questionId);
      },

      getBookmarkedQuestions: () => {
        return get().bookmarks;
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      getCategoryStats: (categoryId) => {
        const { progress } = get();
        const questions = loadQuestionsByCategory(categoryId);
        const questionIds = questions.map((q) => q.id);
        return calculateCategoryStats(categoryId, progress, questionIds);
      },

      getOverallStats: () => {
        const { progress } = get();
        // 전체 문제 수는 동적으로 계산
        const totalQuestions = Object.keys(progress).length;
        return calculateOverallStats(progress, totalQuestions);
      },
    }),
    {
      name: '@user-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        progress: state.progress,
        bookmarks: state.bookmarks,
        settings: state.settings,
      }),
    }
  )
);
