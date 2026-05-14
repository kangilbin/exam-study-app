import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useFlashcardStore } from '@/store/useFlashcardStore';
import { loadFlashcards, shuffleCards } from '@/features/flashcards/services/flashcardService';
import type { CategoryId } from '@/features/questions/types';

export const useFlashcardSession = (categoryId: string, mode: string | undefined) => {
  const router = useRouter();

  const fcStartSession = useFlashcardStore((s) => s.startSession);
  const fcFlipCard = useFlashcardStore((s) => s.flipCard);
  const fcMarkKnown = useFlashcardStore((s) => s.markKnown);
  const fcMarkUnknown = useFlashcardStore((s) => s.markUnknown);
  const fcToggleDisplayMode = useFlashcardStore((s) => s.toggleDisplayMode);
  const fcResetSession = useFlashcardStore((s) => s.resetSession);
  const fcGoToPrevious = useFlashcardStore((s) => s.goToPrevious);
  const fcGoToNext = useFlashcardStore((s) => s.goToNext);
  const fcSaveSession = useFlashcardStore((s) => s.saveSession);
  const fcResumeSession = useFlashcardStore((s) => s.resumeSession);
  const fcResumeFromProgress = useFlashcardStore((s) => s.resumeFromProgress);
  const fcClearLastSession = useFlashcardStore((s) => s.clearLastSession);
  const fcDisplayMode = useFlashcardStore((s) => s.displayMode);
  const fcCards = useFlashcardStore((s) => s.cards);
  const fcCurrentIndex = useFlashcardStore((s) => s.currentIndex);
  const fcIsFlipped = useFlashcardStore((s) => s.isFlipped);
  const fcCardProgress = useFlashcardStore((s) => s.cardProgress);
  const fcGetSessionStats = useFlashcardStore((s) => s.getSessionStats);
  const fcFlashcardBookmarks = useFlashcardStore((s) => s.flashcardBookmarks);
  const fcToggleFlashcardBookmark = useFlashcardStore((s) => s.toggleFlashcardBookmark);

  const [showComplete, setShowComplete] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    if (!categoryId) return;
    if (categoryId === 'flashcard-bookmark') return;

    if (mode === 'resume') {
      const lastSession = useFlashcardStore.getState().lastSession;
      if (lastSession?.categoryId === categoryId) {
        const success = fcResumeSession();
        if (success) return;
      }
      fcResumeFromProgress(categoryId as CategoryId);
      return;
    }

    let cards = loadFlashcards(categoryId as CategoryId);
    if (mode === 'unknown') {
      cards = cards.filter((c) => {
        const p = fcCardProgress[c.id];
        return p && p.status === 'unknown';
      });
    }
    if (cards.length === 0) cards = loadFlashcards(categoryId as CategoryId);
    fcStartSession(categoryId as CategoryId, cards);
  }, [categoryId]);

  const fcIsComplete = fcCurrentIndex >= fcCards.length && fcCards.length > 0;
  useEffect(() => {
    if (fcIsComplete) setShowComplete(true);
  }, [fcIsComplete]);

  const fcStats = useMemo(() => fcGetSessionStats(), [fcCurrentIndex, fcCardProgress]);
  const fcProgress = fcCards.length > 0 ? fcCurrentIndex / fcCards.length : 0;

  const handleFcKnown = useCallback(() => fcMarkKnown(), [fcMarkKnown]);
  const handleFcUnknown = useCallback(() => fcMarkUnknown(), [fcMarkUnknown]);

  const handleRetryUnknown = () => {
    setShowComplete(false);
    let cards = loadFlashcards(categoryId as CategoryId).filter((c) => {
      const p = fcCardProgress[c.id];
      return p && p.status === 'unknown';
    });
    if (cards.length === 0) cards = loadFlashcards(categoryId as CategoryId);
    fcStartSession(categoryId as CategoryId, cards);
  };

  const handleRetryAll = () => {
    setShowComplete(false);
    const cards = shuffleCards(loadFlashcards(categoryId as CategoryId));
    fcStartSession(categoryId as CategoryId, cards);
  };

  const handleGoBack = () => setShowExitModal(true);

  const handleConfirmExit = () => {
    setShowExitModal(false);
    fcSaveSession();
    fcResetSession();
    router.back();
  };

  const handleExitAfterComplete = () => {
    fcClearLastSession();
    fcResetSession();
    router.back();
  };

  return {
    fcCards,
    fcCurrentIndex,
    fcIsFlipped,
    fcDisplayMode,
    fcCardProgress,
    fcFlashcardBookmarks,
    fcIsComplete,
    fcStats,
    fcProgress,
    showComplete,
    setShowComplete,
    showExitModal,
    setShowExitModal,
    fcFlipCard,
    fcGoToPrevious,
    fcGoToNext,
    fcToggleDisplayMode,
    fcToggleFlashcardBookmark,
    handleFcKnown,
    handleFcUnknown,
    handleRetryUnknown,
    handleRetryAll,
    handleGoBack,
    handleConfirmExit,
    handleExitAfterComplete,
  };
};