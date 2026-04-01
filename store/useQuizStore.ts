/**
 * 퀴즈(문제 풀이) 상태 관리 스토어
 */

import { create } from 'zustand';
import type { Question, CategoryId } from '@/features/questions/types';

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

  // 액션
  startQuiz: (categoryId: CategoryId, questions: Question[]) => void;
  selectChoice: (index: number) => void;
  submitAnswer: () => void;
  revealExplanation: () => void;
  nextQuestion: () => void;
  resetQuiz: () => void;
}

export const useQuizStore = create<QuizState>()((set, get) => ({
  categoryId: null,
  questions: [],
  currentIndex: 0,
  selectedChoiceIndex: null,
  isAnswered: false,
  isExplanationRevealed: false,
  results: [],
  startedAt: null,

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
    });
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
    });
  },
}));

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
