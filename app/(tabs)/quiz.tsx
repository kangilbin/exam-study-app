/**
 * 문제 풀이 탭 - 카테고리 선택 화면
 * memorize 카테고리는 카드형 암기, code/sql 카테고리는 주관식 문제 풀이
 */

import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategoriesWithQuestions } from '@/features/categories/services/categoryService';
import {
  isMemorizeCategory,
  isAlgorithmCategory,
  getFlashcardCount,
} from '@/features/flashcards/services/flashcardService';
import { useFlashcardStore } from '@/store/useFlashcardStore';
import { useUserStore } from '@/store/useUserStore';
import { COLORS } from '@/lib/constants';
import type { Category } from '@/features/questions/types';

export default function QuizTab() {
  const router = useRouter();
  const progress = useUserStore((s) => s.progress);
  const cardProgress = useFlashcardStore((s) => s.cardProgress);
  const getCategoryProgress = useFlashcardStore((s) => s.getCategoryProgress);
  const categories = getCategoriesWithQuestions();

  const handleCategoryPress = (categoryId: string) => {
    if (isMemorizeCategory(categoryId)) {
      router.push(`/quiz/flashcard?categoryId=${categoryId}`);
    } else {
      router.push(`/quiz/${categoryId}`);
    }
  };

  const renderItem = ({ item }: { item: Category }) => {
    const isCard = isMemorizeCategory(item.id);

    if (isCard) {
      const flashcardTotal = getFlashcardCount(item.id);
      const { known, rate } = getCategoryProgress(item.id, flashcardTotal);
      const percent = Math.round(rate * 100);

      return (
        <Pressable
          style={styles.card}
          onPress={() => handleCategoryPress(item.id)}
        >
          <MaterialCommunityIcons
            name="cards-outline"
            size={28}
            color={COLORS.primary}
          />
          <View style={styles.cardInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>암기</Text>
              </View>
            </View>
            <Text style={styles.cardDesc}>{item.description}</Text>
            <View style={styles.statsRow}>
              <Text style={styles.cardCount}>{flashcardTotal}카드</Text>
              {known > 0 && (
                <Text
                  style={[
                    styles.accuracy,
                    { color: percent >= 70 ? COLORS.success : COLORS.warning },
                  ]}
                >
                  {known}/{flashcardTotal} 암기 ({percent}%)
                </Text>
              )}
            </View>
            {known > 0 && (
              <View style={styles.miniProgressBg}>
                <View
                  style={[
                    styles.miniProgressFill,
                    {
                      width: `${percent}%`,
                      backgroundColor:
                        percent >= 70 ? COLORS.success : COLORS.warning,
                    },
                  ]}
                />
              </View>
            )}
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={COLORS.gray[400]}
          />
        </Pressable>
      );
    }

    // 알고리즘/일반 카테고리
    const stats = useUserStore.getState().getCategoryStats(item.id);
    const accuracyVal =
      stats.seenCount > 0 ? Math.round(stats.accuracy * 100) : 0;

    return (
      <Pressable
        style={styles.card}
        onPress={() => handleCategoryPress(item.id)}
      >
        <MaterialCommunityIcons
          name={item.icon as any}
          size={28}
          color={COLORS.primary}
        />
        <View style={styles.cardInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            {isAlgorithmCategory(item.id) && (
              <View style={[styles.badge, styles.badgeAlgo]}>
                <Text style={[styles.badgeText, styles.badgeTextAlgo]}>
                  주관식
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDesc}>{item.description}</Text>
          <View style={styles.statsRow}>
            <Text style={styles.cardCount}>{item.questionCount}문제</Text>
            {stats.seenCount > 0 && (
              <Text
                style={[
                  styles.accuracy,
                  {
                    color:
                      accuracyVal >= 70 ? COLORS.success : COLORS.danger,
                  },
                ]}
              >
                정답률 {accuracyVal}%
              </Text>
            )}
          </View>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={COLORS.gray[400]}
        />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={categories}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        extraData={[progress, cardProgress]}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.header}>
            카테고리를 선택하여 학습을 시작하세요
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  listContent: { padding: 16 },
  header: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardInfo: { flex: 1, marginLeft: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  cardDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cardCount: { fontSize: 12, color: COLORS.primary },
  accuracy: { fontSize: 12, fontWeight: '600' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  badgeAlgo: { backgroundColor: COLORS.gray[200] },
  badgeTextAlgo: { color: COLORS.gray[600] },
  miniProgressBg: {
    height: 3,
    backgroundColor: COLORS.gray[200],
    borderRadius: 2,
    marginTop: 6,
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
