/**
 * 퀴즈(문제 풀이) 화면
 * memorize 카테고리 → 카드형 암기, 그 외 → 문제 풀이
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import questionImages from '@/assets/images/questions';
import {
  useQuizStore,
  useCurrentQuestion,
  useCorrectCount,
  useIsQuizComplete,
} from '@/store/useQuizStore';
import { useUserStore } from '@/store/useUserStore';
import { useFlashcardStore } from '@/store/useFlashcardStore';
import { loadQuestionsByCategory, shuffleQuestions, getIncorrectQuestions } from '@/features/questions/services/questionService';
import {
  loadFlashcards,
  shuffleCards,
  isMemorizeCategory,
} from '@/features/flashcards/services/flashcardService';
import FlashCardDeck from '@/components/FlashCardDeck';
import { getCategoryById } from '@/features/categories/services/categoryService';
import { COLORS } from '@/lib/constants';
import { detectAnswerType } from '@/features/questions/services/gradingService';
import type { CategoryId } from '@/features/questions/types';
import { BannerAdView } from '@/components/ads/BannerAdView';
import { useInterstitialAd } from '@/components/ads/useInterstitialAd';

const FONT_SIZE_MAP = { small: 11, medium: 13, large: 16 } as const;
const INTERSTITIAL_INTERVAL = 5;

export default function QuizScreen() {
  const { categoryId, mode } = useLocalSearchParams<{ categoryId: string; mode?: string }>();
  const router = useRouter();
  const category = getCategoryById(categoryId as CategoryId);
  const { showAd } = useInterstitialAd();

  // ─── memorize 카테고리 → 카드형 암기 UI ───
  const isCardMode = isMemorizeCategory(categoryId || '');

  const fcStartSession = useFlashcardStore((s) => s.startSession);
  const fcFlipCard = useFlashcardStore((s) => s.flipCard);
  const fcMarkKnown = useFlashcardStore((s) => s.markKnown);
  const fcMarkUnknown = useFlashcardStore((s) => s.markUnknown);
  const fcToggleDisplayMode = useFlashcardStore((s) => s.toggleDisplayMode);
  const fcResetSession = useFlashcardStore((s) => s.resetSession);
  const fcDisplayMode = useFlashcardStore((s) => s.displayMode);
  const fcCards = useFlashcardStore((s) => s.cards);
  const fcCurrentIndex = useFlashcardStore((s) => s.currentIndex);
  const fcIsFlipped = useFlashcardStore((s) => s.isFlipped);
  const fcCardProgress = useFlashcardStore((s) => s.cardProgress);
  const fcGetSessionStats = useFlashcardStore((s) => s.getSessionStats);

  const [showComplete, setShowComplete] = useState(false);

  // 카드 세션 초기화
  useEffect(() => {
    if (!isCardMode || !categoryId) return;
    let cards = loadFlashcards(categoryId as CategoryId);
    if (mode === 'unknown') {
      cards = cards.filter((c) => {
        const p = fcCardProgress[c.id];
        return p && p.status === 'unknown';
      });
    }
    if (cards.length === 0) cards = loadFlashcards(categoryId as CategoryId);
    fcStartSession(categoryId as CategoryId, cards);
  }, [categoryId, isCardMode]);

  const fcIsComplete = fcCurrentIndex >= fcCards.length && fcCards.length > 0;
  useEffect(() => {
    if (fcIsComplete) setShowComplete(true);
  }, [fcIsComplete]);

  const fcStats = useMemo(() => fcGetSessionStats(), [fcCurrentIndex, fcCardProgress]);
  const fcProgress = fcCards.length > 0 ? fcCurrentIndex / fcCards.length : 0;

  const handleFcKnown = useCallback(() => fcMarkKnown(), [fcMarkKnown]);
  const handleFcUnknown = useCallback(() => fcMarkUnknown(), [fcMarkUnknown]);

  // 카드형 UI 렌더링
  if (isCardMode) {
    const categoryName = category?.name || '암기 카드';

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

    const handleGoBack = () => {
      fcResetSession();
      router.back();
    };

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <Stack.Screen options={{ headerShown: false }} />

          {/* 헤더 */}
          <View style={styles.fcHeader}>
            <Pressable onPress={handleGoBack} hitSlop={12}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
            </Pressable>
            <View style={styles.fcHeaderCenter}>
              <Text style={styles.fcHeaderTitle} numberOfLines={1}>{categoryName}</Text>
              <Text style={styles.fcHeaderCount}>
                {Math.min(fcCurrentIndex + 1, fcCards.length)} / {fcCards.length}
              </Text>
            </View>
            <Pressable onPress={fcToggleDisplayMode} style={styles.fcToggle}>
              <MaterialCommunityIcons
                name={fcDisplayMode === 'term-first' ? 'card-text-outline' : 'card-text'}
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.fcToggleText}>
                {fcDisplayMode === 'term-first' ? '용어→설명' : '설명→용어'}
              </Text>
            </Pressable>
          </View>

          {/* 프로그레스 바 */}
          <View style={styles.fcProgressBg}>
            <View style={[styles.fcProgressFill, { width: `${fcProgress * 100}%` }]} />
          </View>

          {/* 카드 덱 */}
          <View style={styles.fcDeckArea}>
            <FlashCardDeck
              cards={fcCards}
              currentIndex={fcCurrentIndex}
              displayMode={fcDisplayMode}
              onKnown={handleFcKnown}
              onUnknown={handleFcUnknown}
              onFlip={fcFlipCard}
              isFlipped={fcIsFlipped}
            />
          </View>

          {/* 하단 버튼 */}
          {!fcIsComplete && fcCards.length > 0 && (
            <View style={styles.fcActionRow}>
              <Pressable style={[styles.fcActionBtn, styles.fcUnknownBtn]} onPress={handleFcUnknown}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.danger} />
                <Text style={styles.fcUnknownText}>모르겠어요</Text>
              </Pressable>
              <Pressable style={[styles.fcActionBtn, styles.fcKnownBtn]} onPress={handleFcKnown}>
                <MaterialCommunityIcons name="check" size={24} color={COLORS.success} />
                <Text style={styles.fcKnownText}>알아요</Text>
              </Pressable>
            </View>
          )}

          <BannerAdView />

          {/* 완료 모달 */}
          <Modal visible={showComplete} transparent animationType="fade">
            <View style={styles.fcModalOverlay}>
              <View style={styles.fcModalContent}>
                <MaterialCommunityIcons name="check-circle" size={56} color={COLORS.success} />
                <Text style={styles.fcModalTitle}>학습 완료!</Text>
                <View style={styles.fcStatsRow}>
                  <View style={styles.fcStatItem}>
                    <Text style={styles.fcStatValue}>{fcStats.known}</Text>
                    <Text style={[styles.fcStatLabel, { color: COLORS.success }]}>알아요</Text>
                  </View>
                  <View style={styles.fcStatDivider} />
                  <View style={styles.fcStatItem}>
                    <Text style={styles.fcStatValue}>{fcStats.unknown}</Text>
                    <Text style={[styles.fcStatLabel, { color: COLORS.danger }]}>모르겠어요</Text>
                  </View>
                  <View style={styles.fcStatDivider} />
                  <View style={styles.fcStatItem}>
                    <Text style={styles.fcStatValue}>{fcStats.total}</Text>
                    <Text style={styles.fcStatLabel}>전체</Text>
                  </View>
                </View>
                {fcStats.unknown > 0 && (
                  <Pressable style={[styles.fcModalBtn, { backgroundColor: COLORS.danger }]} onPress={handleRetryUnknown}>
                    <Text style={styles.fcModalBtnText}>모르겠어요 다시 학습 ({fcStats.unknown}장)</Text>
                  </Pressable>
                )}
                <Pressable style={[styles.fcModalBtn, { backgroundColor: COLORS.primary }]} onPress={handleRetryAll}>
                  <Text style={styles.fcModalBtnText}>전체 다시 학습</Text>
                </Pressable>
                <Pressable style={[styles.fcModalBtn, styles.fcModalBtnOutline]} onPress={handleGoBack}>
                  <Text style={[styles.fcModalBtnText, { color: COLORS.text }]}>목록으로 돌아가기</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }
  // ─── 여기서부터 기존 문제 풀이 UI ───

  const startQuiz = useQuizStore((s) => s.startQuiz);
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
  const currentQuestion = useCurrentQuestion();
  const correctCount = useCorrectCount();
  const isComplete = useIsQuizComplete();
  const updateProgress = useUserStore((s) => s.updateProgress);
  const bookmarks = useUserStore((s) => s.bookmarks);
  const toggleBookmark = useUserStore((s) => s.toggleBookmark);
  const shuffleMode = useUserStore((s) => s.settings.shuffleMode);
  const fontSize = useUserStore((s) => s.settings.fontSize);
  const codeFontSize = FONT_SIZE_MAP[fontSize];

  const canResume = useQuizStore((s) => s.canResume);

  // 주관식 상태
  const userAnswers = useQuizStore((s) => s.userAnswers);
  const gradeResult = useQuizStore((s) => s.gradeResult);
  const setUserAnswer = useQuizStore((s) => s.setUserAnswer);
  const removeUserAnswers = useQuizStore((s) => s.removeUserAnswers);
  const submitSubjectiveAnswer = useQuizStore((s) => s.submitSubjectiveAnswer);
  const isSubjectiveCategory = categoryId?.startsWith('exam-')
    || categoryId?.startsWith('code-')
    || categoryId?.startsWith('sql-')
    || currentQuestion?.categoryId?.startsWith('exam-')
    || currentQuestion?.categoryId?.startsWith('code-')
    || currentQuestion?.categoryId?.startsWith('sql-')
    || false;

  // 현재 문제의 답변 메타 정보 (주관식일 때만 계산)
  const answerMeta = useMemo(
    () => (isSubjectiveCategory && currentQuestion ? detectAnswerType(currentQuestion) : null),
    [isSubjectiveCategory, currentQuestion?.id],
  );

  // SQL 결과 행 수 관리 - userAnswers에서 복원
  const [sqlRowCount, setSqlRowCount] = useState(1);
  useEffect(() => {
    // userAnswers에 row_ 키가 있으면 행 수 복원, 없으면 1
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

    // 북마크/오답은 이전 화면에서 startQuiz 호출 완료
    if (categoryId === 'bookmark') return;

    // 오답 다시 풀기 (기출문제만)
    if (categoryId === 'incorrect') {
      const userProgress = useUserStore.getState().progress;
      let qs = getIncorrectQuestions(userProgress, 'exam');
      if (shuffleMode) qs = shuffleQuestions(qs);
      startQuiz('incorrect' as CategoryId, qs);
      return;
    }

    // mode=resume → 세션 복원 (이어서 풀기)
    if (mode === 'resume') {
      useQuizStore.setState({
        selectedChoiceIndex: null,
        isAnswered: false,
        isExplanationRevealed: false,
      });
      return;
    }

    // mode=unseen → 안 푼 문제만
    const allQs = loadQuestionsByCategory(categoryId as CategoryId);
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

    // mode=all 또는 기본 → 전체 문제
    let qs = [...allQs];
    if (shuffleMode) qs = shuffleQuestions(qs);
    startQuiz(categoryId as CategoryId, qs);
  }, [categoryId]);

  /** 주관식 제출 */
  const handleSubjectiveSubmit = () => {
    if (!currentQuestion) return;
    submitSubjectiveAnswer();
    const result = useQuizStore.getState().gradeResult;
    if (currentQuestion && result) {
      updateProgress(currentQuestion.id, result.isCorrect ? 'correct' : 'incorrect');
    }
  };

  /** 주관식 입력값 존재 여부 (제출 버튼 활성화용) */
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

  /** 선택지 터치 시 즉시 채점 */
  const handleChoicePress = (index: number) => {
    if (isAnswered) return;
    selectChoice(index);
    // selectChoice 후 바로 submitAnswer 호출 (Zustand는 동기적이므로 순서 보장)
    submitAnswer();
    // 진행도 기록
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
            results.filter((r) => !r.isCorrect).map((r) => r.questionId)
          ),
        },
      });
    } else {
      const nextIndex = currentIndex + 1;
      if (nextIndex > 0 && nextIndex % INTERSTITIAL_INTERVAL === 0) {
        showAd(() => nextQuestion());
      } else {
        nextQuestion();
      }
    }
  };

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: categoryId === 'incorrect' ? '틀린 문제 다시 풀기' : categoryId === 'bookmark' ? '북마크 문제 풀기' : `${category?.name || ''} 문제풀이` }} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>이 카테고리에 문제가 없습니다.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>돌아가기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // 정답 인덱스 찾기
  const correctIndex = currentQuestion.choices?.findIndex((c) => c.isCorrect) ?? -1;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: categoryId === 'incorrect' ? '틀린 문제 다시 풀기' : categoryId === 'bookmark' ? '북마크 문제 풀기' : `${category?.name || ''} 문제풀이` }} />

      {/* 진행도 */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${((currentIndex + 1) / questions.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {currentIndex + 1}/{questions.length}
        </Text>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentInner}>
        {/* 문제 헤더 (번호 + 북마크) */}
        <View style={styles.questionHeader}>
          <Text style={styles.questionLabel}>Q{currentIndex + 1}.</Text>
          <Pressable
            style={styles.bookmarkButton}
            onPress={() => toggleBookmark(currentQuestion.id)}
          >
            <MaterialCommunityIcons
              name={bookmarks.includes(currentQuestion.id) ? 'heart' : 'heart-outline'}
              size={24}
              color={bookmarks.includes(currentQuestion.id) ? COLORS.danger : COLORS.gray[400]}
            />
          </Pressable>
        </View>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>

        {/* 문제 이미지 */}
        {currentQuestion.imageUrl && questionImages[currentQuestion.imageUrl] && (
          <Image
            source={questionImages[currentQuestion.imageUrl]}
            style={styles.questionImage}
            resizeMode="contain"
          />
        )}

        {/* 코드 블록 */}
        {currentQuestion.codeSnippet && (
          <View style={styles.codeBlock}>
            <Text style={[styles.codeText, { fontSize: codeFontSize }]}>{currentQuestion.codeSnippet}</Text>
          </View>
        )}

        {/* 주관식 (기출 카테고리) */}
        {isSubjectiveCategory && answerMeta ? (
          <View style={styles.subjectiveArea}>
            {!isAnswered ? (
              <>
                {/* 순서 나열: 보기 표시 */}
                {answerMeta.type === 'ordering' && answerMeta.orderingItems && (
                  <View style={styles.orderingBox}>
                    <Text style={styles.orderingTitle}>[보기]</Text>
                    <View style={styles.orderingGrid}>
                      {answerMeta.orderingItems.map((item) => (
                        <Text key={item.label} style={styles.orderingItem}>
                          {item.label}. {item.text}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                {/* 유형별 힌트 */}
                {answerMeta.type !== 'multiple' && answerMeta.type !== 'sqlResult' && (
                  <Text style={styles.subjectiveHint}>{answerMeta.hint}</Text>
                )}

                {/* SQL 결과: 열별 입력칸 */}
                {answerMeta.type === 'sqlResult' && answerMeta.sqlColumns ? (
                  <View style={styles.sqlResultArea}>
                    <Text style={styles.subjectiveHint}>쿼리 실행 결과를 입력하세요</Text>
                    {Array.from({ length: sqlRowCount }).map((_, rowIdx) => (
                      <View key={rowIdx} style={styles.sqlRow}>
                        {sqlRowCount > 1 && (
                          <View style={styles.sqlRowHeader}>
                            <Text style={styles.sqlRowLabel}>행 {rowIdx + 1}</Text>
                            {rowIdx === sqlRowCount - 1 && sqlRowCount > 1 && (
                              <Pressable
                                onPress={() => {
                                  removeUserAnswers(`row_${rowIdx}_`);
                                  setSqlRowCount((prev) => prev - 1);
                                }}
                              >
                                <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.gray[400]} />
                              </Pressable>
                            )}
                          </View>
                        )}
                        <View style={styles.sqlColumns}>
                          {answerMeta.sqlColumns!.map((col, colIdx) => (
                            <View key={colIdx} style={styles.sqlColInput}>
                              {rowIdx === 0 && <Text style={styles.sqlColLabel}>{col}</Text>}
                              <TextInput
                                style={styles.subjectiveInput}
                                placeholder={col}
                                placeholderTextColor={COLORS.gray[400]}
                                value={userAnswers[`row_${rowIdx}_col_${colIdx}`] || ''}
                                onChangeText={(v) => setUserAnswer(`row_${rowIdx}_col_${colIdx}`, v)}
                                autoCapitalize="none"
                                autoCorrect={false}
                              />
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                    {/* 행 추가 버튼 */}
                    <Pressable
                      style={styles.addRowButton}
                      onPress={() => setSqlRowCount((prev) => prev + 1)}
                    >
                      <MaterialCommunityIcons name="plus-circle-outline" size={20} color={COLORS.primary} />
                      <Text style={styles.addRowText}>행 추가</Text>
                    </Pressable>
                  </View>
                ) : answerMeta.type === 'multiple' && answerMeta.parts ? (
                  /* 복수 답변: 파트별 입력칸 */
                  <View style={styles.multipleInputs}>
                    {answerMeta.parts.map((part, i) => (
                      <View key={i} style={styles.multipleRow}>
                        <Text style={styles.multipleLabel}>{part.label}</Text>
                        <TextInput
                          style={styles.subjectiveInput}
                          placeholder="답 입력"
                          placeholderTextColor={COLORS.gray[400]}
                          value={userAnswers[`part_${i}`] || ''}
                          onChangeText={(v) => setUserAnswer(`part_${i}`, v)}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    ))}
                  </View>
                ) : answerMeta.type === 'codeOutput' ? (
                  /* 코드 출력: textarea */
                  <TextInput
                    style={[styles.subjectiveInput, styles.textArea]}
                    placeholder={answerMeta.hint}
                    placeholderTextColor={COLORS.gray[400]}
                    value={userAnswers['main'] || ''}
                    onChangeText={(v) => setUserAnswer('main', v)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                  />
                ) : (
                  /* 단일 입력칸 */
                  <TextInput
                    style={styles.subjectiveInput}
                    placeholder={answerMeta.hint}
                    placeholderTextColor={COLORS.gray[400]}
                    value={userAnswers['main'] || ''}
                    onChangeText={(v) => setUserAnswer('main', v)}
                    onSubmitEditing={hasSubjectiveInput ? handleSubjectiveSubmit : undefined}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                )}

                {/* 정답 확인 버튼 */}
                <Pressable
                  style={[
                    styles.submitButton,
                    !hasSubjectiveInput && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubjectiveSubmit}
                  disabled={!hasSubjectiveInput}
                >
                  <Text style={styles.submitButtonText}>정답 확인</Text>
                </Pressable>
              </>
            ) : (
              /* 채점 결과 표시 */
              <View>
                {gradeResult && gradeResult.partResults ? (
                  /* 복수 답변 결과 */
                  <View style={styles.gradeResultBox}>
                    {gradeResult.partResults.map((pr, i) => (
                      <View
                        key={i}
                        style={[
                          styles.partResult,
                          pr.isCorrect ? styles.partResultCorrect : styles.partResultIncorrect,
                        ]}
                      >
                        <Text style={styles.partResultLabel}>{pr.label}</Text>
                        {pr.isCorrect ? (
                          <View style={styles.partResultContent}>
                            <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.success} />
                            <Text style={styles.partResultText}>{pr.userAnswer}</Text>
                          </View>
                        ) : (
                          <View style={styles.partResultContent}>
                            <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.danger} />
                            <Text style={styles.partResultWrong}>{pr.userAnswer || '(미입력)'}</Text>
                            <MaterialCommunityIcons name="arrow-right" size={14} color={COLORS.gray[400]} />
                            <Text style={styles.partResultCorrectText}>{pr.correctAnswer}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                ) : gradeResult ? (
                  /* 단일 답변 결과 */
                  <View
                    style={[
                      styles.gradeResultSingle,
                      gradeResult.isCorrect ? styles.gradeCorrect : styles.gradeIncorrect,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={gradeResult.isCorrect ? 'check-circle' : 'close-circle'}
                      size={24}
                      color={gradeResult.isCorrect ? COLORS.success : COLORS.danger}
                    />
                    <View style={styles.gradeTextArea}>
                      <Text style={styles.gradeTitle}>
                        {gradeResult.isCorrect ? '정답입니다!' : '오답입니다'}
                      </Text>
                      {!gradeResult.isCorrect && (
                        <>
                          <Text style={styles.gradeUserAnswer}>
                            내 답: {userAnswers['main'] || '(미입력)'}
                          </Text>
                          <Text style={styles.gradeCorrectAnswer}>
                            정답: {gradeResult.correctAnswer}
                          </Text>
                        </>
                      )}
                      {gradeResult.isCorrect && (
                        <Text style={styles.gradeCorrectAnswer}>
                          정답: {gradeResult.correctAnswer}
                        </Text>
                      )}
                    </View>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        ) : currentQuestion.choices && currentQuestion.choices.length > 0 ? (
          /* 선택지 (객관식) */
          <View style={styles.choiceList}>
            {currentQuestion.choices.map((choice, index) => {
              let extraChoiceStyle = {};
              let extraTextStyle = {};
              let icon = null;

              if (isAnswered) {
                if (choice.isCorrect) {
                  extraChoiceStyle = { borderColor: COLORS.success, backgroundColor: COLORS.success };
                  extraTextStyle = { color: '#fff' };
                  icon = <MaterialCommunityIcons name="check" size={20} color="#fff" />;
                } else if (index === selectedChoiceIndex && !choice.isCorrect) {
                  extraChoiceStyle = { borderColor: COLORS.danger, backgroundColor: COLORS.danger };
                  extraTextStyle = { color: '#fff' };
                  icon = <MaterialCommunityIcons name="close" size={20} color="#fff" />;
                } else {
                  extraChoiceStyle = { borderColor: COLORS.gray[200], backgroundColor: COLORS.gray[100] };
                  extraTextStyle = { color: COLORS.gray[400] };
                }
              } else if (index === selectedChoiceIndex) {
                extraChoiceStyle = { borderColor: COLORS.primary, backgroundColor: '#eef2ff' };
              }

              return (
                <Pressable
                  key={index}
                  style={[styles.choice, extraChoiceStyle]}
                  onPress={() => handleChoicePress(index)}
                  disabled={isAnswered}
                >
                  <Text style={[styles.choiceText, extraTextStyle]}>
                    {choice.label}. {choice.text}
                  </Text>
                  {icon}
                </Pressable>
              );
            })}
          </View>
        ) : (
          // 단답형 - 정답 보기 버튼
          <View style={styles.shortAnswer}>
            {!isAnswered ? (
              <Pressable
                style={styles.showAnswerButton}
                onPress={() => {
                  useQuizStore.setState({ isAnswered: true });
                  updateProgress(currentQuestion.id, 'correct');
                }}
              >
                <Text style={styles.showAnswerButtonText}>정답 보기</Text>
              </Pressable>
            ) : (
              <View style={styles.answerBox}>
                <Text style={styles.answerLabel}>정답:</Text>
                <Text style={styles.answerText}>{currentQuestion.answer}</Text>
              </View>
            )}
          </View>
        )}

        {/* 해설 */}
        {isAnswered && (
          <View>
            {!isExplanationRevealed ? (
              <Pressable style={styles.blurOverlay} onPress={revealExplanation}>
                <Text style={styles.blurText}>터치하여 해설 보기</Text>
              </Pressable>
            ) : (
              <View style={styles.explanationBox}>
                <Text style={styles.explanationLabel}>해설</Text>
                <Text style={styles.explanationText}>
                  {currentQuestion.explanation}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 하단 배너 광고 */}
      <BannerAdView />

      {/* 하단 버튼 - 채점 후 다음 문제 이동 */}
      <View style={styles.bottomBar}>
        {isAnswered ? (
          <Pressable style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>
              {isComplete ? '결과 보기' : '다음 문제'}
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  progressBarBg: {
    flex: 1, height: 6, backgroundColor: COLORS.gray[200], borderRadius: 3, overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressText: { fontSize: 13, color: COLORS.textSecondary, width: 50, textAlign: 'right' },
  scrollContent: { flex: 1 },
  scrollContentInner: { padding: 16, paddingBottom: 32 },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookmarkButton: { padding: 4 },
  questionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  questionText: { fontSize: 16, lineHeight: 24, color: COLORS.text },
  questionImage: {
    width: '100%',
    maxHeight: 300,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  } as const,
  codeBlock: {
    backgroundColor: COLORS.gray[800], borderRadius: 8, padding: 12, marginTop: 12,
  },
  codeText: { fontFamily: 'monospace', fontSize: 13, color: '#e5e7eb', lineHeight: 20 },
  choiceList: { marginTop: 20, gap: 8 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
  },
  choiceSelected: { borderColor: COLORS.primary, backgroundColor: '#eef2ff' },
  choiceCorrect: { borderColor: COLORS.success, backgroundColor: COLORS.success },
  choiceIncorrect: { borderColor: COLORS.danger, backgroundColor: COLORS.danger },
  choiceDisabled: { borderColor: COLORS.gray[200], backgroundColor: COLORS.gray[100] },
  choiceText: { fontSize: 14, color: COLORS.text, flex: 1 },
  shortAnswer: { marginTop: 20 },
  showAnswerButton: {
    backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  showAnswerButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  answerBox: {
    backgroundColor: COLORS.successLight, borderRadius: 10, padding: 16,
  },
  answerLabel: { fontSize: 13, fontWeight: '600', color: COLORS.success, marginBottom: 4 },
  answerText: { fontSize: 18, fontWeight: '700', color: COLORS.text, lineHeight: 28 },
  blurOverlay: {
    backgroundColor: COLORS.gray[200],
    borderRadius: 10,
    padding: 20,
    marginTop: 16,
    alignItems: 'center',
  },
  blurText: { color: COLORS.gray[500], fontSize: 14 },
  explanationBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  explanationLabel: {
    fontSize: 13, fontWeight: '600', color: COLORS.primary, marginBottom: 8,
  },
  explanationText: { fontSize: 14, lineHeight: 22, color: COLORS.textSecondary },
  bottomBar: { padding: 16, paddingBottom: 24 },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonDisabled: { backgroundColor: COLORS.gray[300] },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 16 },

  // 주관식 스타일
  subjectiveArea: { marginTop: 20 },
  subjectiveHint: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  subjectiveInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 120,
    fontFamily: 'monospace',
    lineHeight: 22,
    paddingTop: 12,
  },
  multipleInputs: { gap: 10 },
  multipleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  multipleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    minWidth: 30,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  orderingBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  orderingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  orderingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  orderingItem: {
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },

  // SQL 결과 스타일
  sqlResultArea: { gap: 12 },
  sqlRow: { gap: 6 },
  sqlRowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sqlColumns: {
    flexDirection: 'row',
    gap: 8,
  },
  sqlColInput: {
    flex: 1,
  },
  sqlColLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  sqlRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  addRowText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // 채점 결과 스타일
  gradeResultBox: { gap: 8 },
  partResult: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  partResultCorrect: { backgroundColor: COLORS.successLight },
  partResultIncorrect: { backgroundColor: COLORS.dangerLight },
  partResultLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 30,
  },
  partResultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  partResultText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  partResultWrong: { fontSize: 14, color: COLORS.danger, fontWeight: '600' },
  partResultCorrectText: { fontSize: 14, color: COLORS.success, fontWeight: '600' },
  gradeResultSingle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  gradeCorrect: { backgroundColor: COLORS.successLight },
  gradeIncorrect: { backgroundColor: COLORS.dangerLight },
  gradeTextArea: { flex: 1 },
  gradeTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  gradeUserAnswer: { fontSize: 14, color: COLORS.danger, marginTop: 2 },
  gradeCorrectAnswer: { fontSize: 14, color: COLORS.success, fontWeight: '600', marginTop: 2 },

  // ─── 카드형 암기 스타일 ───
  fcHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  fcHeaderCenter: { flex: 1 },
  fcHeaderTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  fcHeaderCount: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  fcToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.gray[100] },
  fcToggleText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  fcProgressBg: { height: 4, backgroundColor: COLORS.gray[200], marginHorizontal: 16, borderRadius: 2 },
  fcProgressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  fcDeckArea: { flex: 1, paddingVertical: 16 },
  fcActionRow: { flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 12, gap: 16 },
  fcActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  fcUnknownBtn: { backgroundColor: COLORS.dangerLight },
  fcKnownBtn: { backgroundColor: COLORS.successLight },
  fcUnknownText: { fontSize: 15, fontWeight: '700', color: COLORS.danger },
  fcKnownText: { fontSize: 15, fontWeight: '700', color: COLORS.success },
  fcModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  fcModalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', width: '100%', maxWidth: 360 },
  fcModalTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginTop: 12, marginBottom: 24 },
  fcStatsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 16 },
  fcStatItem: { alignItems: 'center' },
  fcStatValue: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  fcStatLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  fcStatDivider: { width: 1, height: 32, backgroundColor: COLORS.gray[200] },
  fcModalBtn: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  fcModalBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.gray[300] },
  fcModalBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
