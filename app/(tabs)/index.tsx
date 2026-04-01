/**
 * 학습 탭 화면
 * 전체 진행도 + 모드 선택 + 카테고리 그리드 (기출 제외)
 */

import { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategoriesWithQuestions } from '@/features/categories/services/categoryService';
import { getTotalQuestionCount } from '@/features/questions/services/questionService';
import { useUserStore } from '@/store/useUserStore';
import { calculateOverallStats } from '@/features/questions/services/progressService';
import { COLORS } from '@/lib/constants';
import type { Category, CategoryId } from '@/features/questions/types';

export default function HomeScreen() {
  const router = useRouter();
  /** 기출 카테고리 제외 */
  const categories = getCategoriesWithQuestions().filter(
    (cat) => cat.group !== 'exam'
  );
  const totalQuestions = getTotalQuestionCount();
  const progress = useUserStore((s) => s.progress);
  const overallStats = useMemo(
    () => calculateOverallStats(progress, totalQuestions),
    [progress, totalQuestions]
  );

  const progressPercent =
    totalQuestions > 0
      ? Math.round((overallStats.totalSeen / totalQuestions) * 100)
      : 0;

  const handleCategoryPress = (categoryId: CategoryId) => {
    router.push(`/quiz/${categoryId}`);
  };

  const renderCategory = ({ item }: { item: Category }) => {
    const stats = useUserStore.getState().getCategoryStats(item.id);
    const catProgress =
      item.questionCount > 0
        ? Math.round((stats.seenCount / item.questionCount) * 100)
        : 0;

    return (
      <Pressable
        style={styles.categoryCard}
        onPress={() => handleCategoryPress(item.id)}
      >
        <MaterialCommunityIcons
          name={item.icon as any}
          size={32}
          color={COLORS.primary}
        />
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.categoryCount}>
          {stats.seenCount}/{item.questionCount}
        </Text>
        <View style={styles.progressBarContainer}>
          <View
            style={[styles.progressBar, { width: `${catProgress}%` }]}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* 전체 진행도 */}
            <View style={styles.overallProgress}>
              <Text style={styles.overallLabel}>전체 진행도</Text>
              <View style={styles.overallBarContainer}>
                <View
                  style={[
                    styles.overallBar,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>
              <Text style={styles.overallText}>
                {progressPercent}% ({overallStats.totalSeen}/{totalQuestions})
              </Text>
            </View>

            <Text style={styles.sectionTitle}>카테고리</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  listContent: {
    padding: 16,
  },
  header: {
    marginBottom: 8,
  },
  overallProgress: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  overallLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  overallBarContainer: {
    height: 8,
    backgroundColor: COLORS.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  overallBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  overallText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  row: {
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
  },
  categoryCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
});
