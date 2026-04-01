/**
 * 기출문제 탭 화면
 * 연도별 SectionList로 기출 회차 표시
 */

import { useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategoriesByGroup } from '@/features/categories/services/categoryService';
import { useUserStore } from '@/store/useUserStore';
import { COLORS } from '@/lib/constants';
import type { Category, CategoryId } from '@/features/questions/types';

/** 연도별 섹션 타입 */
interface ExamSection {
  title: string;
  data: Category[];
}

/** 카테고리 ID에서 연도를 추출 */
const extractYear = (id: string): number => {
  const match = id.match(/exam-(\d{4})/);
  return match ? parseInt(match[1], 10) : 0;
};

export default function ExamScreen() {
  const router = useRouter();

  /** 기출 카테고리를 연도별로 그룹핑 */
  const sections = useMemo<ExamSection[]>(() => {
    const examCategories = getCategoriesByGroup('exam');
    const years = [2025, 2024, 2023, 2022, 2021, 2020];

    return years
      .map((year) => ({
        title: `${year}년`,
        data: examCategories
          .filter((c) => extractYear(c.id) === year)
          .sort((a, b) => a.id.localeCompare(b.id)),
      }))
      .filter((s) => s.data.length > 0);
  }, []);

  /** 풀이모드로 이동 */
  const handleExamPress = (categoryId: CategoryId) => {
    router.push(`/quiz/${categoryId}`);
  };

  /** 회차 카드 렌더링 */
  const renderItem = ({ item }: { item: Category }) => {
    const stats = useUserStore.getState().getCategoryStats(item.id);
    const progress =
      item.questionCount > 0
        ? Math.round((stats.seenCount / item.questionCount) * 100)
        : 0;

    return (
      <Pressable
        style={styles.card}
        onPress={() => handleExamPress(item.id)}
      >
        <MaterialCommunityIcons
          name="file-document-outline"
          size={28}
          color={COLORS.primary}
        />
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <View style={styles.statsRow}>
            <Text style={styles.cardCount}>
              {item.questionCount}문제
            </Text>
            {stats.seenCount > 0 && (
              <Text style={styles.cardProgress}>
                {stats.seenCount}/{item.questionCount} 학습완료
              </Text>
            )}
          </View>
          {/* 진행도 바 */}
          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBar, { width: `${progress}%` }]}
            />
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

  /** 연도별 섹션 헤더 렌더링 */
  const renderSectionHeader = ({
    section,
  }: {
    section: ExamSection;
  }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>
        {section.data.length}개 회차
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <Text style={styles.header}>
            회차를 선택하여 문제를 풀어보세요
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="file-document-remove-outline"
              size={48}
              color={COLORS.gray[300]}
            />
            <Text style={styles.emptyText}>
              기출문제가 없습니다
            </Text>
          </View>
        }
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
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
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
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cardCount: {
    fontSize: 12,
    color: COLORS.primary,
  },
  cardProgress: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
});
