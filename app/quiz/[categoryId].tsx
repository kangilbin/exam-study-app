/**
 * 퀴즈(문제 풀이) 화면
 * 문제 표시 + 선택지 + 해설
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useQuizStore,
  useCurrentQuestion,
  useCorrectCount,
  useIsQuizComplete,
} from '@/store/useQuizStore';
import { useUserStore } from '@/store/useUserStore';
import { loadQuestionsByCategory, shuffleQuestions, getIncorrectQuestions } from '@/features/questions/services/questionService';
import { getCategoryById } from '@/features/categories/services/categoryService';
import { COLORS } from '@/lib/constants';
import type { CategoryId } from '@/features/questions/types';

const FONT_SIZE_MAP = { small: 11, medium: 13, large: 16 } as const;

export default function QuizScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const router = useRouter();
  const category = getCategoryById(categoryId as CategoryId);

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

  useEffect(() => {
    if (!categoryId) return;

    // 북마크/오답은 이전 화면에서 startQuiz 호출 완료
    if (categoryId === 'bookmark') return;

    // 오답 다시 풀기
    if (categoryId === 'incorrect') {
      const userProgress = useUserStore.getState().progress;
      let qs = getIncorrectQuestions(userProgress);
      if (shuffleMode) qs = shuffleQuestions(qs);
      startQuiz('incorrect' as CategoryId, qs);
      return;
    }

    if (canResume(categoryId)) {
      // 저장된 진행 상태 복원 - UI 상태만 초기화
      useQuizStore.setState({
        selectedChoiceIndex: null,
        isAnswered: false,
        isExplanationRevealed: false,
      });
    } else {
      // 새로 시작
      let qs = loadQuestionsByCategory(categoryId as CategoryId);
      if (shuffleMode) qs = shuffleQuestions(qs);
      startQuiz(categoryId as CategoryId, qs);
    }
  }, [categoryId]);

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
      nextQuestion();
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

        {/* 코드 블록 */}
        {currentQuestion.codeSnippet && (
          <View style={styles.codeBlock}>
            <Text style={[styles.codeText, { fontSize: codeFontSize }]}>{currentQuestion.codeSnippet}</Text>
          </View>
        )}

        {/* 선택지 (객관식인 경우) */}
        {currentQuestion.choices && currentQuestion.choices.length > 0 ? (
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
});
