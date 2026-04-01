/**
 * 퀴즈 결과 요약 컴포넌트
 * 정답률, 정답/오답 수, 오답 목록, 다시 풀기/홈으로 버튼
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { COLORS } from '@/lib/constants';
import type { Question } from '@/features/questions/types';

interface QuizResultProps {
  totalQuestions: number;
  correctCount: number;
  wrongQuestions: Question[];
  onRetry: () => void;
  onHome: () => void;
}

export const QuizResult: React.FC<QuizResultProps> = ({
  totalQuestions,
  correctCount,
  wrongQuestions,
  onRetry,
  onHome,
}) => {
  const wrongCount = totalQuestions - correctCount;
  const accuracyPercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const accuracyColor =
    accuracyPercent >= 80
      ? COLORS.success
      : accuracyPercent >= 50
      ? COLORS.warning
      : COLORS.danger;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 결과 헤더 */}
      <View style={styles.resultHeader}>
        <Text style={styles.resultEmoji}>
          {accuracyPercent >= 60 ? '🏆' : '😢'}
        </Text>
        <Text style={styles.resultTitle}>퀴즈 완료!</Text>
        <View style={[styles.accuracyCircle, { borderColor: accuracyColor }]}>
          <Text style={[styles.accuracyPercent, { color: accuracyColor }]}>
            {accuracyPercent}%
          </Text>
          <Text style={styles.accuracyLabel}>정답률</Text>
        </View>
      </View>

      {/* 통계 */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: COLORS.successLight }]}>
          <Text style={[styles.statNumber, { color: COLORS.success }]}>
            {correctCount}
          </Text>
          <Text style={styles.statLabel}>정답</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: COLORS.dangerLight }]}>
          <Text style={[styles.statNumber, { color: COLORS.danger }]}>
            {wrongCount}
          </Text>
          <Text style={styles.statLabel}>오답</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: COLORS.gray[100] }]}>
          <Text style={[styles.statNumber, { color: COLORS.textSecondary }]}>
            {totalQuestions}
          </Text>
          <Text style={styles.statLabel}>전체</Text>
        </View>
      </View>

      {/* 오답 목록 */}
      {wrongQuestions.length > 0 && (
        <View style={styles.wrongSection}>
          <Text style={styles.wrongTitle}>
            오답 목록 ({wrongQuestions.length}개)
          </Text>
          {wrongQuestions.map((q, index) => (
            <View key={q.id} style={styles.wrongItem}>
              <Text style={styles.wrongIndex}>{index + 1}.</Text>
              <View style={styles.wrongContent}>
                <Text style={styles.wrongQuestion} numberOfLines={2}>
                  {q.question}
                </Text>
                <Text style={styles.wrongAnswer}>정답: {q.answer}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 버튼 영역 */}
      <View style={styles.buttonArea}>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.85}>
          <Text style={styles.retryButtonText}>🔄 다시 풀기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeButton} onPress={onHome} activeOpacity={0.85}>
          <Text style={styles.homeButtonText}>🏠 홈으로</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  content: { padding: 24, paddingBottom: 48 },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  resultEmoji: { fontSize: 56 },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
  },
  accuracyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  accuracyPercent: { fontSize: 24, fontWeight: '800' },
  accuracyLabel: { fontSize: 12, color: COLORS.textSecondary },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  wrongSection: { marginBottom: 24 },
  wrongTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  wrongItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
    gap: 8,
  },
  wrongIndex: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
    minWidth: 20,
  },
  wrongContent: { flex: 1 },
  wrongQuestion: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  wrongAnswer: { fontSize: 13, color: COLORS.success, fontWeight: '600' },
  buttonArea: { gap: 12 },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  homeButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  homeButtonText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
});

export default QuizResult;
