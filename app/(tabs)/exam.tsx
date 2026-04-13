/**
 * 기출문제 탭 화면
 * 연도별 SectionList로 기출 회차 표시
 */

import { useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  Pressable,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategoriesByGroup } from '@/features/categories/services/categoryService';
import { loadQuestionsByCategory } from '@/features/questions/services/questionService';
import { useQuizStore } from '@/store/useQuizStore';
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

/** 모달에 표시할 정보 */
interface ResumeInfo {
  categoryId: CategoryId;
  categoryName: string;
  totalCount: number;
  seenCount: number;
  unseenCount: number;
  canResume: boolean;
  resumeIndex: number;
  resumeTotal: number;
}

export default function ExamScreen() {
  const router = useRouter();
  /** progress 구독으로 학습 후 돌아왔을 때 리렌더링 보장 */
  const progress = useUserStore((s) => s.progress);
  const [modalInfo, setModalInfo] = useState<ResumeInfo | null>(null);

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

  /** 기출문제 카드 클릭 */
  const handleExamPress = (item: Category) => {
    const allQs = loadQuestionsByCategory(item.id);
    const userProgress = useUserStore.getState().progress;
    const unseenQs = allQs.filter((q) => {
      const p = userProgress[q.id];
      return !p || p.status === 'unseen';
    });
    const seenCount = allQs.length - unseenQs.length;

    const quizCanResume = useQuizStore.getState().categoryId === item.id
      && useQuizStore.getState().questions.length > 0
      && useQuizStore.getState().currentIndex > 0;

    // 학습 기록이 없으면 바로 진입
    if (seenCount === 0 && !quizCanResume) {
      router.push(`/quiz/${item.id}?mode=unseen`);
      return;
    }

    // 기록이 있으면 모달 표시
    setModalInfo({
      categoryId: item.id,
      categoryName: item.name,
      totalCount: allQs.length,
      seenCount,
      unseenCount: unseenQs.length,
      canResume: quizCanResume,
      resumeIndex: useQuizStore.getState().currentIndex,
      resumeTotal: useQuizStore.getState().questions.length,
    });
  };

  /** 모달에서 선택 후 이동 */
  const navigateWithMode = (mode: string) => {
    if (!modalInfo) return;
    const catId = modalInfo.categoryId;
    setModalInfo(null);
    // 전체 다시 풀기 → 학습 기록 초기화
    if (mode === 'all') {
      useUserStore.getState().resetCategoryProgress(catId);
    }
    router.push(`/quiz/${catId}?mode=${mode}`);
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
        onPress={() => handleExamPress(item)}
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
        extraData={progress}
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

      {/* 학습 모드 선택 모달 */}
      <Modal
        visible={modalInfo !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setModalInfo(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalInfo(null)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            {/* 헤더 */}
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={32}
                color={COLORS.primary}
              />
              <Text style={styles.modalTitle}>{modalInfo?.categoryName}</Text>
            </View>

            {/* 진행 상태 */}
            <View style={styles.modalStats}>
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatValue}>{modalInfo?.totalCount}</Text>
                <Text style={styles.modalStatLabel}>전체</Text>
              </View>
              <View style={styles.modalStatDivider} />
              <View style={styles.modalStatItem}>
                <Text style={[styles.modalStatValue, { color: COLORS.success }]}>
                  {modalInfo?.seenCount}
                </Text>
                <Text style={styles.modalStatLabel}>학습완료</Text>
              </View>
              <View style={styles.modalStatDivider} />
              <View style={styles.modalStatItem}>
                <Text style={[styles.modalStatValue, { color: COLORS.primary }]}>
                  {modalInfo?.unseenCount}
                </Text>
                <Text style={styles.modalStatLabel}>미학습</Text>
              </View>
            </View>

            {/* 버튼들 */}
            <View style={styles.modalButtons}>
              {/* 이어서 풀기 (퀴즈 세션이 있을 때) */}
              {modalInfo?.canResume && (
                <Pressable
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={() => navigateWithMode('resume')}
                >
                  <MaterialCommunityIcons name="play-circle" size={20} color="#fff" />
                  <Text style={styles.modalButtonPrimaryText}>
                    이어서 풀기 ({(modalInfo.resumeIndex + 1)}/{modalInfo.resumeTotal})
                  </Text>
                </Pressable>
              )}

              {/* 안 푼 문제만 */}
              {modalInfo && modalInfo.unseenCount > 0 && (
                <Pressable
                  style={[styles.modalButton, !modalInfo.canResume ? styles.modalButtonPrimary : styles.modalButtonOutline]}
                  onPress={() => navigateWithMode('unseen')}
                >
                  <MaterialCommunityIcons
                    name="checkbox-marked-circle-outline"
                    size={20}
                    color={!modalInfo.canResume ? '#fff' : COLORS.primary}
                  />
                  <Text style={!modalInfo.canResume ? styles.modalButtonPrimaryText : styles.modalButtonOutlineText}>
                    안 푼 문제만 ({modalInfo.unseenCount}문제)
                  </Text>
                </Pressable>
              )}

              {/* 전체 다시 풀기 */}
              <Pressable
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={() => navigateWithMode('all')}
              >
                <MaterialCommunityIcons name="refresh" size={20} color={COLORS.primary} />
                <Text style={styles.modalButtonOutlineText}>
                  전체 다시 풀기 ({modalInfo?.totalCount}문제)
                </Text>
              </Pressable>
            </View>

            {/* 닫기 */}
            <Pressable
              style={styles.modalClose}
              onPress={() => setModalInfo(null)}
            >
              <Text style={styles.modalCloseText}>취소</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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

  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  modalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalStatDivider: {
    width: 1,
    backgroundColor: COLORS.gray[200],
  },
  modalButtons: {
    gap: 10,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 12,
  },
  modalButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalButtonOutline: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: COLORS.gray[200],
  },
  modalButtonOutlineText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  modalClose: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  modalCloseText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});