import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  useQuizStore,
  useCurrentQuestion,
  useCorrectCount,
  useIsQuizComplete,
  type QuestionAnswerState,
} from '@/store/useQuizStore';
import { useUserStore } from '@/store/useUserStore';
import { loadQuestionsByCategory, shuffleQuestions, getIncorrectQuestions } from '@/features/questions/services/questionService';
import { detectAnswerType } from '@/features/questions/services/gradingService';
import type { CategoryId, Question } from '@/features/questions/types';

const FONT_SIZE_MAP = { small: 11, medium: 13, large: 16 } as const;

export const useQuizSession = (categoryId: string, mode: string | undefined) => {
  const router = useRouter();
  const startQuiz = useQuizStore((s) => s.startQuiz);
  const startQuizAt = useQuizStore((s) => s.startQuizAt);
  const restoreSavedSession = useQuizStore((s) => s.restoreSavedSession);
  const quizGoToPrevious = useQuizStore((s) => s.goToPrevious);
  const resetQuiz = useQuizStore((s) => s.resetQuiz);
  const selectChoice = useQuizStore((s) => s.selectChoice);
  const submitAnswer = useQuizStore((s) => s.submitAnswer);
  const revealExplanation = useQuizStore((s) => s.revealExplanation);
  const nextQuestion = useQuizStore((s) => s.nextQuestion);
  const selectedChoiceIndex = useQuizStore((s) => s.selectedChoiceIndex);
  const isAnswered = useQuizStore((s) => s.isAnswered);
  const isExplanationRevealed = useQuizStore((s) => s.isExplanationRevealed);
  const currentIndex = useQuizStore((s) => s.currentIndex);
  const questions = useQuizStore((s) => s.questions);
  const results = useQuizStore((s) => s.results);
  const userAnswers = useQuizStore((s) => s.userAnswers);
  const gradeResult = useQuizStore((s) => s.gradeResult);
  const setUserAnswer = useQuizStore((s) => s.setUserAnswer);
  const removeUserAnswers = useQuizStore((s) => s.removeUserAnswers);
  const submitSubjectiveAnswer = useQuizStore((s) => s.submitSubjectiveAnswer);

  const currentQuestion = useCurrentQuestion();
  const correctCount = useCorrectCount();
  const isComplete = useIsQuizComplete();

  const updateProgress = useUserStore((s) => s.updateProgress);
  const bookmarks = useUserStore((s) => s.bookmarks);
  const toggleBookmark = useUserStore((s) => s.toggleBookmark);
  const shuffleMode = useUserStore((s) => s.settings.shuffleMode);
  const fontSize = useUserStore((s) => s.settings.fontSize);
  const codeFontSize = FONT_SIZE_MAP[fontSize];

  const isSubjectiveCategory =
    categoryId?.startsWith('exam-') ||
    categoryId?.startsWith('code-') ||
    categoryId?.startsWith('sql-') ||
    currentQuestion?.categoryId?.startsWith('exam-') ||
    currentQuestion?.categoryId?.startsWith('code-') ||
    currentQuestion?.categoryId?.startsWith('sql-') ||
    false;

  const answerMeta = useMemo(
    () => (isSubjectiveCategory && currentQuestion ? detectAnswerType(currentQuestion) : null),
    [isSubjectiveCategory, currentQuestion?.id],
  );

  const [sqlRowCount, setSqlRowCount] = useState(1);
  useEffect(() => {
    const rowKeys = Object.keys(userAnswers).filter((k) => k.startsWith('row_'));
    if (rowKeys.length > 0) {
      const maxRow = rowKeys.reduce((max, k) => {
        const m = k.match(/^row_(\d+)/);
        return m ? Math.max(max, parseInt(m[1], 10)) : max;
      }, 0);
      setSqlRowCount(maxRow + 1);
    } else {
      setSqlRowCount(1);
    }
  }, [currentQuestion?.id]);

  useEffect(() => {
    if (!categoryId) return;
    if (categoryId === 'bookmark') return;

    if (categoryId === 'incorrect') {
      const userProgress = useUserStore.getState().progress;
      let qs = getIncorrectQuestions(userProgress, 'exam');
      if (shuffleMode) qs = shuffleQuestions(qs);
      startQuiz('incorrect' as CategoryId, qs);
      return;
    }

    if (mode === 'resume') {
      const quizState = useQuizStore.getState();
      const restored = quizState.answeredStates[quizState.currentIndex];
      useQuizStore.setState({
        selectedChoiceIndex: restored?.selectedChoiceIndex ?? null,
        isAnswered: restored?.isAnswered ?? false,
        isExplanationRevealed: restored?.isExplanationRevealed ?? false,
        userAnswers: restored?.userAnswers ?? {},
        gradeResult: restored?.gradeResult ?? null,
      });
      return;
    }

    const allQs = loadQuestionsByCategory(categoryId as CategoryId);

    if (mode === 'resume-progress') {
      const quizState = useQuizStore.getState();
      const userProgress = useUserStore.getState().progress;

      let qs: Question[] = [];
      let states: Record<number, QuestionAnswerState> = {};

      if (quizState.categoryId === categoryId && quizState.questions.length > 0) {
        qs = quizState.questions;
        states = quizState.answeredStates;
      } else if (restoreSavedSession(categoryId as string)) {
        const restored = useQuizStore.getState();
        qs = restored.questions;
        states = restored.answeredStates;
      }

      if (qs.length > 0) {
        let resumeIndex = 0;
        for (let i = 0; i < qs.length; i++) {
          const p = userProgress[qs[i].id];
          if (!p || p.status === 'unseen') { resumeIndex = i; break; }
          if (i === qs.length - 1) resumeIndex = 0;
        }
        const restoredState = states[resumeIndex];
        useQuizStore.setState({
          currentIndex: resumeIndex,
          selectedChoiceIndex: restoredState?.selectedChoiceIndex ?? null,
          isAnswered: restoredState?.isAnswered ?? false,
          isExplanationRevealed: restoredState?.isExplanationRevealed ?? false,
          userAnswers: restoredState?.userAnswers ?? {},
          gradeResult: restoredState?.gradeResult ?? null,
        });
        return;
      }

      let resumeIndex = 0;
      for (let i = 0; i < allQs.length; i++) {
        const p = userProgress[allQs[i].id];
        if (!p || p.status === 'unseen') { resumeIndex = i; break; }
        if (i === allQs.length - 1) resumeIndex = 0;
      }
      startQuizAt(categoryId as CategoryId, allQs, resumeIndex);
      return;
    }

    if (mode === 'incorrect') {
      const userProgress = useUserStore.getState().progress;
      const incorrectQs = allQs.filter((q) => {
        const p = userProgress[q.id];
        return p?.status === 'incorrect';
      });
      let qs = incorrectQs.length > 0 ? incorrectQs : allQs;
      if (shuffleMode) qs = shuffleQuestions(qs);
      startQuiz(categoryId as CategoryId, qs);
      return;
    }

    if (mode === 'unseen') {
      const userProgress = useUserStore.getState().progress;
      const unseenQs = allQs.filter((q) => {
        const p = userProgress[q.id];
        return !p || p.status === 'unseen';
      });
      let qs = unseenQs.length > 0 ? unseenQs : allQs;
      if (shuffleMode) qs = shuffleQuestions(qs);
      startQuiz(categoryId as CategoryId, qs);
      return;
    }

    let qs = [...allQs];
    if (shuffleMode) qs = shuffleQuestions(qs);
    startQuiz(categoryId as CategoryId, qs);
  }, [categoryId]);

  const hasSubjectiveInput = useMemo(() => {
    if (!answerMeta) return false;
    if (answerMeta.type === 'sqlResult' && answerMeta.sqlExpectedRows) {
      return answerMeta.sqlExpectedRows.some((row, r) =>
        row.some((_, c) => (userAnswers[`row_${r}_col_${c}`] || '').trim().length > 0),
      );
    }
    if (answerMeta.type === 'multiple' && answerMeta.parts) {
      return answerMeta.parts.some((_, i) => (userAnswers[`part_${i}`] || '').trim().length > 0);
    }
    return (userAnswers['main'] || '').trim().length > 0;
  }, [answerMeta, userAnswers]);

  const handleSubjectiveSubmit = () => {
    if (!currentQuestion) return;
    submitSubjectiveAnswer(answerMeta);
    const result = useQuizStore.getState().gradeResult;
    if (result) {
      updateProgress(currentQuestion.id, result.isCorrect ? 'correct' : 'incorrect');
    }
  };

  const handleShowAnswer = () => {
    if (!currentQuestion) return;
    useQuizStore.setState({ isAnswered: true });
    updateProgress(currentQuestion.id, 'correct');
  };

  const handleRetry = () => {
    useQuizStore.setState({
      selectedChoiceIndex: null,
      isAnswered: false,
      isExplanationRevealed: false,
      userAnswers: {},
      gradeResult: null,
    });
  };

  const handleChoicePress = (index: number) => {
    if (isAnswered) return;
    selectChoice(index);
    submitAnswer();
    if (currentQuestion) {
      const isCorrect = currentQuestion.choices?.[index]?.isCorrect ?? false;
      updateProgress(currentQuestion.id, isCorrect ? 'correct' : 'incorrect');
    }
  };

  const handleNext = () => {
    if (isComplete) {
      resetQuiz();
      router.replace({
        pathname: '/quiz/result',
        params: {
          categoryId: categoryId || '',
          total: String(questions.length),
          correct: String(correctCount),
          incorrect: JSON.stringify(
            results.filter((r) => !r.isCorrect).map((r) => r.questionId),
          ),
        },
      });
    } else {
      nextQuestion();
    }
  };

  const correctIndex = currentQuestion?.choices?.findIndex((c) => c.isCorrect) ?? -1;

  return {
    questions,
    currentIndex,
    currentQuestion,
    correctCount,
    isComplete,
    isAnswered,
    isExplanationRevealed,
    selectedChoiceIndex,
    userAnswers,
    gradeResult,
    results,
    bookmarks,
    toggleBookmark,
    shuffleMode,
    fontSize,
    codeFontSize,
    isSubjectiveCategory,
    answerMeta,
    hasSubjectiveInput,
    correctIndex,
    sqlRowCount,
    setSqlRowCount,
    selectChoice,
    submitAnswer,
    revealExplanation,
    nextQuestion,
    resetQuiz,
    setUserAnswer,
    removeUserAnswers,
    quizGoToPrevious,
    handleChoicePress,
    handleNext,
    handleSubjectiveSubmit,
    handleShowAnswer,
    handleRetry,
  };
};