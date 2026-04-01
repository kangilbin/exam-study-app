/**
 * 퀴즈 결과 화면
 * 정답률 표시 + 오답 목록
 */

import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';

export default function QuizResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    categoryId: string;
    total: string;
    correct: string;
    incorrect: string;
  }>();

  const total = parseInt(params.total || '0', 10);
  const correct = parseInt(params.correct || '0', 10);
  const incorrect = total - correct;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 결과 원형 */}
        <View style={styles.resultCircle}>
          <Text style={styles.resultPercent}>{accuracy}%</Text>
          <Text style={styles.resultLabel}>정답률</Text>
        </View>

        {/* 통계 */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: COLORS.successLight }]}>
            <MaterialCommunityIcons name="check-circle" size={28} color={COLORS.success} />
            <Text style={styles.statValue}>{correct}</Text>
            <Text style={styles.statLabel}>정답</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: COLORS.dangerLight }]}>
            <MaterialCommunityIcons name="close-circle" size={28} color={COLORS.danger} />
            <Text style={styles.statValue}>{incorrect}</Text>
            <Text style={styles.statLabel}>오답</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#e0e7ff' }]}>
            <MaterialCommunityIcons name="format-list-numbered" size={28} color={COLORS.primary} />
            <Text style={styles.statValue}>{total}</Text>
            <Text style={styles.statLabel}>전체</Text>
          </View>
        </View>

        {/* 메시지 */}
        <Text style={styles.message}>
          {accuracy >= 90
            ? '훌륭합니다! 완벽에 가까운 점수입니다.'
            : accuracy >= 70
            ? '잘하셨습니다! 조금만 더 노력하면 됩니다.'
            : accuracy >= 50
            ? '괜찮습니다. 오답을 복습해보세요.'
            : '더 많은 연습이 필요합니다. 화이팅!'}
        </Text>

        {/* 버튼 */}
        <View style={styles.buttonGroup}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              router.replace(`/quiz/${params.categoryId}`);
            }}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>다시 풀기</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.navigate('/(tabs)')}
          >
            <MaterialCommunityIcons name="home" size={20} color={COLORS.primary} />
            <Text style={styles.secondaryButtonText}>홈으로</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  content: { padding: 24, alignItems: 'center' },
  resultCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: COLORS.primary,
    marginVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultPercent: { fontSize: 40, fontWeight: '800', color: COLORS.primary },
  resultLabel: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  message: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  buttonGroup: { width: '100%', gap: 12 },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
});
