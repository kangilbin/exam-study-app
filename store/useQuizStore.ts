/**
 * 퀴즈(문제 풀이) 상태 관리 스토어
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectAnswerType, gradeAnswer } from '@/features/questions/services/gradingService';
import type { AnswerMeta } from '@/features/questions/types';
import { getQuestionById } from '@/features/questions/services/questionService';
import type { Question, CategoryId, GradeResult } from '@/features/questions/types';

/** 문제별 답변 상태 (이전 문제 복원용) */
interface QuestionAnswerState {
  selectedChoiceIndex: number | null;
  isAnswered: boolean;
  isExplanationRevealed: boolean;
  userAnswers: Record<string, string>;
  gradeResult: GradeResult | null;
}

/** 카테고리별 저장된 세션 */
interface SavedSession {
  questionIds: string[];
  currentIndex: number;
  results: { questionId: string; isCorrect: boolean }[];
  answeredStates: Record<number, QuestionAnswerState>;
  startedAt: number | null;
}

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

  // 문제별 답변 상태 저장소
  answeredStates: Record<number, QuestionAnswerState>;

  // 카테고리별 세션 저장소 (다른 카테고리 갔다 돌아와도 유지)
  savedSessions: Record<string, SavedSession>;

  // 액션
  startQuiz: (categoryId: CategoryId, questions: Question[]) => void;
  startQuizAt: (categoryId: CategoryId, questions: Question[], startIndex: number) => void;
  canResume: (categoryId: string) => boolean;
  saveCurrentSession: () => void;
  restoreSavedSession: (categoryId: string) => boolean;
  selectChoice: (index: number) => void;
  submitAnswer: () => void;
  revealExplanation: () => void;
  nextQuestion: () => void;
  goToPrevious: () => void;
  resetQuiz: () => void;

  // 주관식 액션
  setUserAnswer: (key: string, value: string) => void;
  removeUserAnswers: (prefix: string) => void;
  submitSubjectiveAnswer: (answerMeta?: AnswerMeta | null) => void;
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
      answeredStates: {},
      savedSessions: {},

      startQuiz: (categoryId, questions) => {
        // 현재 세션을 먼저 저장
        get().saveCurrentSession();
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
          answeredStates: {},
        });
      },

      startQuizAt: (categoryId, questions, startIndex) => {
        // 현재 세션을 먼저 저장
        get().saveCurrentSession();
        const safeIndex = Math.min(startIndex, questions.length - 1);
        set({
          categoryId,
          questions,
          currentIndex: Math.max(0, safeIndex),
          selectedChoiceIndex: null,
          isAnswered: false,
          isExplanationRevealed: false,
          results: [],
          startedAt: Date.now(),
          userAnswers: {},
          gradeResult: null,
          answeredStates: {},
        });
      },

      canResume: (categoryId) => {
        const state = get();
        // 현재 활성 세션이거나 저장된 세션이 있으면 이어서 가능
        if (state.savedSessions[categoryId]) return true;
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
        const { questions, currentIndex, selectedChoiceIndex, results, answeredStates } = get();
        if (selectedChoiceIndex === null) return;

        const question = questions[currentIndex];
        if (!question?.choices) return;

        const isCorrect = question.choices[selectedChoiceIndex]?.isCorrect ?? false;

        set({
          isAnswered: true,
          results: [...results, { questionId: question.id, isCorrect }],
          // 답변 상태 즉시 저장
          answeredStates: {
            ...answeredStates,
            [currentIndex]: {
              selectedChoiceIndex,
              isAnswered: true,
              isExplanationRevealed: false,
              userAnswers: {},
              gradeResult: null,
            },
          },
        });
      },

      revealExplanation: () => {
        const { currentIndex, answeredStates, selectedChoiceIndex, userAnswers, gradeResult } = get();
        set({
          isExplanationRevealed: true,
          answeredStates: {
            ...answeredStates,
            [currentIndex]: {
              selectedChoiceIndex,
              isAnswered: true,
              isExplanationRevealed: true,
              userAnswers: { ...userAnswers },
              gradeResult,
            },
          },
        });
      },

      nextQuestion: () => {
        const { currentIndex, questions, answeredStates, selectedChoiceIndex, isAnswered, isExplanationRevealed, userAnswers, gradeResult } = get();
        if (currentIndex >= questions.length - 1) return;

        // 현재 문제 상태 저장
        const saved = {
          ...answeredStates,
          [currentIndex]: { selectedChoiceIndex, isAnswered, isExplanationRevealed, userAnswers: { ...userAnswers }, gradeResult },
        };

        const nextIdx = currentIndex + 1;
        const restored = saved[nextIdx];

        set({
          answeredStates: saved,
          currentIndex: nextIdx,
          selectedChoiceIndex: restored?.selectedChoiceIndex ?? null,
          isAnswered: restored?.isAnswered ?? false,
          isExplanationRevealed: restored?.isExplanationRevealed ?? false,
          userAnswers: restored?.userAnswers ?? {},
          gradeResult: restored?.gradeResult ?? null,
        });
      },

      goToPrevious: () => {
        const { currentIndex, answeredStates, selectedChoiceIndex, isAnswered, isExplanationRevealed, userAnswers, gradeResult } = get();
        if (currentIndex <= 0) return;

        // 현재 문제 상태 저장
        const saved = {
          ...answeredStates,
          [currentIndex]: { selectedChoiceIndex, isAnswered, isExplanationRevealed, userAnswers: { ...userAnswers }, gradeResult },
        };

        const prevIdx = currentIndex - 1;
        const restored = saved[prevIdx];

        set({
          answeredStates: saved,
          currentIndex: prevIdx,
          selectedChoiceIndex: restored?.selectedChoiceIndex ?? null,
          isAnswered: restored?.isAnswered ?? false,
          isExplanationRevealed: restored?.isExplanationRevealed ?? false,
          userAnswers: restored?.userAnswers ?? {},
          gradeResult: restored?.gradeResult ?? null,
        });
      },

      resetQuiz: () => {
        // 현재 세션 저장 후 초기화
        get().saveCurrentSession();
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
          answeredStates: {},
        });
      },

      saveCurrentSession: () => {
        const { categoryId, questions, currentIndex, results, answeredStates,
                selectedChoiceIndex, isAnswered, isExplanationRevealed, userAnswers, gradeResult,
                savedSessions } = get();
        if (!categoryId || questions.length === 0) return;

        // 현재 문제 상태도 answeredStates에 반영
        const finalStates = {
          ...answeredStates,
          [currentIndex]: { selectedChoiceIndex, isAnswered, isExplanationRevealed, userAnswers: { ...userAnswers }, gradeResult },
        };

        set({
          savedSessions: {
            ...savedSessions,
            [categoryId]: {
              questionIds: questions.map((q) => q.id),
              currentIndex,
              results,
              answeredStates: finalStates,
              startedAt: get().startedAt,
            },
          },
        });
      },

      restoreSavedSession: (categoryId) => {
        // 현재 세션을 먼저 저장
        get().saveCurrentSession();
        const { savedSessions } = get();
        const saved = savedSessions[categoryId];
        if (!saved || saved.questionIds.length === 0) return false;

        // questionIds → questions 복원
        const questions = saved.questionIds
          .map((id) => getQuestionById(id))
          .filter((q): q is Question => q !== null);
        if (questions.length === 0) return false;

        const safeIndex = Math.min(saved.currentIndex, questions.length - 1);
        const restored = saved.answeredStates[safeIndex];

        set({
          categoryId: categoryId as CategoryId,
          questions,
          currentIndex: safeIndex,
          results: saved.results,
          answeredStates: saved.answeredStates,
          startedAt: saved.startedAt,
          selectedChoiceIndex: restored?.selectedChoiceIndex ?? null,
          isAnswered: restored?.isAnswered ?? false,
          isExplanationRevealed: restored?.isExplanationRevealed ?? false,
          userAnswers: restored?.userAnswers ?? {},
          gradeResult: restored?.gradeResult ?? null,
        });
        return true;
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

      submitSubjectiveAnswer: (precomputedMeta?: AnswerMeta | null) => {
        const { questions, currentIndex, userAnswers, results, answeredStates } = get();
        const question = questions[currentIndex];
        if (!question) return;

        // 화면에서 이미 계산된 answerMeta를 우선 사용 (순서 나열 문제의 셔플 일관성 보장)
        const answerMeta = precomputedMeta ?? detectAnswerType(question);
        const result = gradeAnswer(userAnswers, answerMeta);

        set({
          isAnswered: true,
          gradeResult: result,
          results: [...results, { questionId: question.id, isCorrect: result.isCorrect }],
          // 답변 상태 즉시 저장
          answeredStates: {
            ...answeredStates,
            [currentIndex]: {
              selectedChoiceIndex: null,
              isAnswered: true,
              isExplanationRevealed: false,
              userAnswers: { ...userAnswers },
              gradeResult: result,
            },
          },
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
        answeredStates: state.answeredStates,
        savedSessions: state.savedSessions,
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

