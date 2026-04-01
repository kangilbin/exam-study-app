/**
 * 암기 모드 탭 - 카테고리 선택 화면
 */

import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategoriesWithQuestions } from '@/features/categories/services/categoryService';
import { useUserStore } from '@/store/useUserStore';
import { COLORS } from '@/lib/constants';
import type { Category } from '@/features/questions/types';

export default function FlashcardTab() {
  const router = useRouter();
  const categories = getCategoriesWithQuestions();

  const renderItem = ({ item }: { item: Category }) => {
    const stats = useUserStore.getState().getCategoryStats(item.id);
    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/flashcard/${item.id}`)}
      >
        <MaterialCommunityIcons
          name={item.icon as any}
          size={28}
          color={COLORS.primary}
        />
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardDesc}>{item.description}</Text>
          <Text style={styles.cardCount}>
            {stats.seenCount}/{item.questionCount} 학습완료
          </Text>
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
            카테고리를 선택하여 암기를 시작하세요
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  listContent: { padding: 16 },
  header: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
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
  cardCount: { fontSize: 12, color: COLORS.primary, marginTop: 4 },
});
