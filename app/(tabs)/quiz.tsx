/**
 * 문제 풀이 탭 - 카테고리 선택 화면
 */

import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategoriesWithQuestions } from '@/features/categories/services/categoryService';
import { useUserStore } from '@/store/useUserStore';
import { COLORS } from '@/lib/constants';
import type { Category } from '@/features/questions/types';

export default function QuizTab() {
  const router = useRouter();
  const categories = getCategoriesWithQuestions();

  const renderItem = ({ item }: { item: Category }) => {
    const stats = useUserStore.getState().getCategoryStats(item.id);
    const accuracy = stats.seenCount > 0 ? Math.round(stats.accuracy * 100) : 0;

    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/quiz/${item.id}`)}
      >
        <MaterialCommunityIcons
          name={item.icon as any}
          size={28}
          color={COLORS.primary}
        />
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardDesc}>{item.description}</Text>
          <View style={styles.statsRow}>
            <Text style={styles.cardCount}>
              {item.questionCount}문제
            </Text>
            {stats.seenCount > 0 && (
              <Text style={[
                styles.accuracy,
                { color: accuracy >= 70 ? COLORS.success : COLORS.danger }
              ]}>
                정답률 {accuracy}%
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
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.header}>
            카테고리를 선택하여 문제를 풀어보세요
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
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  cardDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cardCount: { fontSize: 12, color: COLORS.primary },
  accuracy: { fontSize: 12, fontWeight: '600' },
});
