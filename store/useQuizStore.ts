/**
 * 퀴즈(문제 풀이) 상태 관리 스토어
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectAnswerType, gradeAnswer } from '@/features/questions/services/gradingService';
import { getQuestionById } from '@/features/questions/services/questionService';
import type { Question, CategoryId, GradeResult } from '@/features/questions/types';

interface QuizState {
  // 상태
  categoryId: CategoryId | null;
  questions: Question[];
  currentIndex: number;
  selectedChoiceIndex: number | null;
  isAnswered: boolean;
  isExplanationRevealed: boolean;
  results: { questionId: string; isCorrect: boolean }[];
  startedAt: number | null;

  // 주관식 상태
  userAnswers: Record<string, string>;
  gradeResult: GradeResult | null;

  // 액션
  startQuiz: (categoryId: CategoryId, questions: Question[]) => void;
  canResume: (categoryId: string) => boolean;
  selectChoice: (index: number) => void;
  submitAnswer: () => void;
  revealExplanation: () => void;
  nextQuestion: () => void;
  resetQuiz: () => void;

  // 주관식 액션
  setUserAnswer: (key: string, value: string) => void;
  removeUserAnswers: (prefix: string) => void;
  submitSubjectiveAnswer: () => void;
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      categoryId: null,
      questions: [],
      currentIndex: 0,
      selectedChoiceIndex: null,
      isAnswered: false,
      isExplanationRevealed: false,
      results: [],
      startedAt: null,
      userAnswers: {},
      gradeResult: null,

      startQuiz: (categoryId, questions) => {
        set({
          categoryId,
          questions,
          currentIndex: 0,
          selectedChoiceIndex: null,
          isAnswered: false,
          isExplanationRevealed: false,
          results: [],
          startedAt: Date.now(),
          userAnswers: {},
          gradeResult: null,
        });
      },

      canResume: (categoryId) => {
        const state = get();
        return (
          state.categoryId === categoryId &&
          state.questions.length > 0 &&
          state.currentIndex > 0
        );
      },

      selectChoice: (index) => {
        if (get().isAnswered) return;
        set({ selectedChoiceIndex: index });
      },

      submitAnswer: () => {
        const { questions, currentIndex, selectedChoiceIndex, results } = get();
        if (selectedChoiceIndex === null) return;

        const question = questions[currentIndex];
        if (!question?.choices) return;

        const isCorrect = question.choices[selectedChoiceIndex]?.isCorrect ?? false;

        set({
          isAnswered: true,
          results: [...results, { questionId: question.id, isCorrect }],
        });
      },

      revealExplanation: () => {
        set({ isExplanationRevealed: true });
      },

      nextQuestion: () => {
        const { currentIndex, questions } = get();
        if (currentIndex < questions.length - 1) {
          set({
            currentIndex: currentIndex + 1,
            selectedChoiceIndex: null,
            isAnswered: false,
            isExplanationRevealed: false,
            userAnswers: {},
            gradeResult: null,
          });
        }
      },

      resetQuiz: () => {
        set({
          categoryId: null,
          questions: [],
          currentIndex: 0,
          selectedChoiceIndex: null,
          isAnswered: false,
          isExplanationRevealed: false,
          results: [],
          startedAt: null,
          userAnswers: {},
          gradeResult: null,
        });
      },

      setUserAnswer: (key, value) => {
        set({ userAnswers: { ...get().userAnswers, [key]: value } });
      },

      removeUserAnswers: (prefix) => {
        const current = get().userAnswers;
        const updated: Record<string, string> = {};
        for (const [k, v] of Object.entries(current)) {
          if (!k.startsWith(prefix)) updated[k] = v;
        }
        set({ userAnswers: updated });
      },

      submitSubjectiveAnswer: () => {
        const { questions, currentIndex, userAnswers, results } = get();
        const question = questions[currentIndex];
        if (!question) return;

        const answerMeta = detectAnswerType(question);
        const result = gradeAnswer(userAnswers, answerMeta);

        set({
          isAnswered: true,
          gradeResult: result,
          results: [...results, { questionId: question.id, isCorrect: result.isCorrect }],
        });
      },
    }),
    {
      name: '@quiz-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        categoryId: state.categoryId,
        questionIds: state.questions.map((q) => q.id),
        currentIndex: state.currentIndex,
        results: state.results,
        startedAt: state.startedAt,
        userAnswers: state.userAnswers,
      }),
      onRehydrateStorage: () => (state) => {
        // questionIds → questions 복원 (항상 최신 JSON 데이터 사용)
        if (!state) return;
        const stored = (state as any).questionIds as string[] | undefined;
        if (stored && stored.length > 0 && state.questions.length === 0) {
          const questions = stored
            .map((id: string) => getQuestionById(id))
            .filter((q): q is Question => q !== null);
          state.questions = questions;
        }
      },
    }
  )
);

/** 현재 문제 가져오기 */
export const useCurrentQuestion = () =>
  useQuizStore((s) => s.questions[s.currentIndex] ?? null);

/** 정답 수 */
export const useCorrectCount = () =>
  useQuizStore((s) => s.results.filter((r) => r.isCorrect).length);

/** 완료 여부 */
export const useIsQuizComplete = () =>
  useQuizStore((s) => s.currentIndex >= s.questions.length - 1 && s.isAnswered);

/** 경과 시간 (초) */
export const useElapsedTime = () =>
  useQuizStore((s) =>
    s.startedAt ? Math.floor((Date.now() - s.startedAt) / 1000) : 0
  );
