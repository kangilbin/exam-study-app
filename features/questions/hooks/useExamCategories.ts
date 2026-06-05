import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useUserStore } from '@/store/useUserStore';
import { useQuizStore } from '@/store/useQuizStore';
import { getCategoriesByGroup } from '@/features/categories/services/categoryService';
import { loadQuestionsByCategory } from '@/features/questions/services/questionService';
import { useAdGate } from '@/components/ads/useAdGate';
import type { Category, CategoryId } from '@/features/questions/types';

export interface ExamSection {
  title: string;
  data: Category[];
}

export interface ResumeInfo {
  categoryId: CategoryId;
  categoryName: string;
  totalCount: number;
  seenCount: number;
  unseenCount: number;
  canResume: boolean;
  resumeIndex: number;
  resumeTotal: number;
  correctCount: number;
  incorrectCount: number;
  score: number;
  isPassed: boolean;
  isCompleted: boolean;
}

const extractYear = (id: string): number => {
  const match = id.match(/exam-(\d{4})/);
  return match ? parseInt(match[1], 10) : 0;
};

export const useExamCategories = () => {
  const router = useRouter();
  const { showAdWithLoading, isWaitingForAd, adBlockedCountdown, proceedImmediately } = useAdGate();
  const [modalInfo, setModalInfo] = useState<ResumeInfo | null>(null);

  const sections = useMemo<ExamSection[]>(() => {
    const examCategories = getCategoriesByGroup('exam');
    const years = Array.from(
      new Set(examCategories.map((c) => extractYear(c.id))),
    ).sort((a, b) => b - a);

    return years
      .map((year) => ({
        title: `${year}년`,
        data: examCategories
          .filter((c) => extractYear(c.id) === year)
          .sort((a, b) => b.id.localeCompare(a.id)),
      }))
      .filter((s) => s.data.length > 0);
  }, []);

  const handleExamPress = (item: Category) => {
    const allQs = loadQuestionsByCategory(item.id);
    const userProgress = useUserStore.getState().progress;
    const unseenQs = allQs.filter((q) => {
      const p = userProgress[q.id];
      return !p || p.status === 'unseen';
    });
    const seenCount = allQs.length - unseenQs.length;

    const quizCanResume =
      useQuizStore.getState().categoryId === item.id &&
      useQuizStore.getState().questions.length > 0 &&
      useQuizStore.getState().currentIndex > 0;

    if (seenCount === 0 && !quizCanResume) {
      showAdWithLoading(() => router.push(`/quiz/${item.id}`));
      return;
    }

    const stats = useUserStore.getState().getCategoryStats(item.id);
    const score = allQs.length > 0
      ? Math.round((stats.correctCount / allQs.length) * 100)
      : 0;

    setModalInfo({
      categoryId: item.id,
      categoryName: item.name,
      totalCount: allQs.length,
      seenCount,
      unseenCount: unseenQs.length,
      canResume: quizCanResume,
      resumeIndex: useQuizStore.getState().currentIndex,
      resumeTotal: useQuizStore.getState().questions.length,
      correctCount: stats.correctCount,
      incorrectCount: stats.incorrectCount,
      score,
      isPassed: score >= 60,
      isCompleted: unseenQs.length === 0,
    });
  };

  const navigateWithMode = (mode: string) => {
    if (!modalInfo) return;
    const catId = modalInfo.categoryId;
    setModalInfo(null);

    if (mode === 'all') {
      showAdWithLoading(() => {
        useUserStore.getState().resetCategoryProgress(catId);
        router.push(`/quiz/${catId}?mode=${mode}`);
      });
    } else {
      showAdWithLoading(() => router.push(`/quiz/${catId}?mode=${mode}`));
    }
  };

  const progress = useUserStore((s) => s.progress);

  const getItemStats = (item: Category) => {
    const stats = useUserStore.getState().getCategoryStats(item.id);
    const progress = item.questionCount > 0
      ? Math.round((stats.seenCount / item.questionCount) * 100)
      : 0;
    return { stats, progress };
  };

  return {
    sections,
    progress,
    modalInfo,
    setModalInfo,
    isWaitingForAd,
    adBlockedCountdown,
    proceedImmediately,
    handleExamPress,
    navigateWithMode,
    getItemStats,
  };
};