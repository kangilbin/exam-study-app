/**
 * 북마크 목록 화면
 */

import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUserStore } from '@/store/useUserStore';
import { getQuestionById } from '@/features/questions/services/questionService';
import { COLORS } from '@/lib/constants';
import type { Question } from '@/features/questions/types';

export default function BookmarksScreen() {
  const router = useRouter();
  const bookmarkIds = useUserStore((s) => s.bookmarks);
  const toggleBookmark = useUserStore((s) => s.toggleBookmark);

  const bookmarkedQuestions = bookmarkIds
    .map((id) => getQuestionById(id))
    .filter(Boolean) as Question[];

  if (bookmarkedQuestions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="bookmark-off-outline"
            size={48}
            color={COLORS.gray[400]}
          />
          <Text style={styles.emptyText}>
            북마크한 문제가 없습니다.
          </Text>
          <Text style={styles.emptySubText}>
            학습 중 하트 아이콘을 눌러 북마크하세요.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={bookmarkedQuestions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardCategory}>{item.categoryId}</Text>
              <Pressable onPress={() => toggleBookmark(item.id)}>
                <MaterialCommunityIcons
                  name="heart"
                  size={20}
                  color={COLORS.danger}
                />
              </Pressable>
            </View>
            <Text style={styles.cardQuestion} numberOfLines={3}>
              {item.question}
            </Text>
            <Text style={styles.cardAnswer} numberOfLines={1}>
              정답: {item.answer}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  listContent: { padding: 16 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  emptySubText: { fontSize: 14, color: COLORS.textSecondary },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardCategory: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardQuestion: { fontSize: 14, lineHeight: 20, color: COLORS.text },
  cardAnswer: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
    marginTop: 8,
  },
});
