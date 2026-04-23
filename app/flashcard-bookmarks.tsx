/**
 * 암기 카드 북마크 목록 화면
 */

import { useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFlashcardStore } from '@/store/useFlashcardStore';
import { loadFlashcards } from '@/features/flashcards/services/flashcardService';
import { COLORS } from '@/lib/constants';
import type { FlashCard } from '@/features/flashcards/types';
import type { CategoryId } from '@/features/questions/types';

const MEMORIZE_CATEGORIES: CategoryId[] = [
  'memorize-se',
  'memorize-db',
  'memorize-network',
  'memorize-os',
];

export default function FlashcardBookmarksScreen() {
  const router = useRouter();
  const bookmarkIds = useFlashcardStore((s) => s.flashcardBookmarks);
  const toggleFlashcardBookmark = useFlashcardStore((s) => s.toggleFlashcardBookmark);

  const bookmarkedCards = useMemo(() => {
    const cardMap = new Map<string, FlashCard>();
    for (const catId of MEMORIZE_CATEGORIES) {
      for (const card of loadFlashcards(catId)) {
        cardMap.set(card.id, card);
      }
    }
    return bookmarkIds
      .map((id) => cardMap.get(id))
      .filter((c): c is FlashCard => c !== undefined);
  }, [bookmarkIds]);

  const startCardSession = (fromIndex: number) => {
    // 탭한 카드부터 시작하도록 순서 재배열
    const ordered = [
      ...bookmarkedCards.slice(fromIndex),
      ...bookmarkedCards.slice(0, fromIndex),
    ];
    useFlashcardStore.getState().startSession('flashcard-bookmark' as CategoryId, ordered);
    router.push('/quiz/flashcard-bookmark');
  };

  const handlePlayAll = () => {
    if (bookmarkedCards.length === 0) return;
    startCardSession(0);
  };

  if (bookmarkedCards.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="bookmark-off-outline"
            size={48}
            color={COLORS.gray[400]}
          />
          <Text style={styles.emptyText}>북마크한 암기 카드가 없습니다.</Text>
          <Text style={styles.emptySubText}>
            학습 중 북마크 아이콘을 눌러 저장하세요.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.playAllButton} onPress={handlePlayAll}>
        <MaterialCommunityIcons name="play-circle" size={20} color="#fff" />
        <Text style={styles.playAllText}>
          전체 학습 ({bookmarkedCards.length}장)
        </Text>
      </Pressable>

      <FlatList
        data={bookmarkedCards}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <Pressable style={styles.card} onPress={() => startCardSession(index)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardSubcategory}>{item.subcategory}</Text>
              <Pressable onPress={() => toggleFlashcardBookmark(item.id)} hitSlop={8}>
                <MaterialCommunityIcons
                  name="bookmark"
                  size={20}
                  color={COLORS.primary}
                />
              </Pressable>
            </View>
            <Text style={styles.cardTerm}>{item.term}</Text>
            <Text style={styles.cardDefinition} numberOfLines={2}>
              {item.definition}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardHint}>탭하여 학습하기</Text>
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
  emptySubText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
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
  cardSubcategory: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardTerm: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardDefinition: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cardHint: { fontSize: 12, color: COLORS.gray[400], marginRight: 2 },
});
