/**
 * 북마크 목록 화면
 */

import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUserStore } from '@/store/useUserStore';
import { useQuizStore } from '@/store/useQuizStore';
import { getQuestionById } from '@/features/questions/services/questionService';
import { COLORS } from '@/lib/constants';
import type { Question, CategoryId } from '@/features/questions/types';

export default function BookmarksScreen() {
  const router = useRouter();
  const bookmarkIds = useUserStore((s) => s.bookmarks);
  const toggleBookmark = useUserStore((s) => s.toggleBookmark);

  const bookmarkedQuestions = bookmarkIds
    .map((id) => getQuestionById(id))
    .filter(Boolean) as Question[];

  const handleQuestionPress = (item: Question) => {
    // 해당 문제 1개를 퀴즈로 시작
    useQuizStore.getState().startQuiz(item.categoryId as CategoryId, [item]);
    router.push(`/quiz/${item.categoryId}`);
  };

  const handlePlayAll = () => {
    if (bookmarkedQuestions.length === 0) return;
    // 북마크 전체를 퀴즈로 시작
    useQuizStore.getState().startQuiz('bookmark' as CategoryId, bookmarkedQuestions);
    router.push('/quiz/bookmark');
  };

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
      {/* 전체 풀기 버튼 */}
      <Pressable style={styles.playAllButton} onPress={handlePlayAll}>
        <MaterialCommunityIcons name="play-circle" size={20} color="#fff" />
        <Text style={styles.playAllText}>
          북마크 전체 풀기 ({bookmarkedQuestions.length}문제)
        </Text>
      </Pressable>

      <FlatList
        data={bookmarkedQuestions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => handleQuestionPress(item)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardCategory}>{item.categoryId}</Text>
              <Pressable onPress={() => toggleBookmark(item.id)} hitSlop={8}>
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
            <View style={styles.cardFooter}>
              <Text style={styles.cardHint}>탭하여 문제 풀기</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.gray[400]} />
            </View>
          </Pressable>
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
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cardHint: { fontSize: 12, color: COLORS.gray[400], marginRight: 2 },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    gap: 6,
  },
  playAllText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
