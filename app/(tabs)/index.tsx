/**
 * 학습 탭 화면
 * 전체 진행도 + 카테고리 그리드 (기출 제외)
 * 카테고리 클릭 시 학습 기록이 있으면 이어서/처음부터 선택 모달 표시
 */

import { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAdGate } from '@/components/ads/useAdGate';
import { AdGateOverlay } from '@/components/ads/AdGateOverlay';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAllCategories } from '@/features/categories/services/categoryService';
import { getQuestionCountExcludingGroup, getQuestionIdsExcludingGroup } from '@/features/questions/services/questionService';
import {
  isMemorizeCategory,
  getFlashcardCount,
  loadFlashcards,
} from '@/features/flashcards/services/flashcardService';
import { useFlashcardStore } from '@/store/useFlashcardStore';
import { useUserStore } from '@/store/useUserStore';
import { calculateOverallStatsFiltered } from '@/features/questions/services/progressService';
import { COLORS } from '@/lib/constants';
import type { Category, CategoryId } from '@/features/questions/types';

/** 학습 모달 정보 */
interface StudyResumeInfo {
  categoryId: CategoryId;
  categoryName: string;
  icon: string;
  isCard: boolean;
  // 암기 카테고리
  totalCards: number;
  knownCount: number;
  unknownCount: number;
  unseenCount: number;
  canResume: boolean;
  // 일반 카테고리
  totalQuestions: number;
  seenCount: number;
  unseenQuestions: number;
  correctCount: number;
  incorrectCount: number;
}

export default function HomeScreen() {
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const { showAdWithLoading, isWaitingForAd, adBlockedCountdown, proceedImmediately } = useAdGate();
  /** 기출 제외, 문제 또는 플래시카드가 있는 카테고리 */
  const categories = getAllCategories().filter(
    (cat) => cat.group !== 'exam' && (cat.questionCount > 0 || isMemorizeCategory(cat.id))
  );
  const totalQuestions = getQuestionCountExcludingGroup('exam');
  const studyQuestionIds = getQuestionIdsExcludingGroup('exam');
  const progress = useUserStore((s) => s.progress);
  const cardProgress = useFlashcardStore((s) => s.cardProgress);
  const getCategoryProgress = useFlashcardStore((s) => s.getCategoryProgress);
  const overallStats = useMemo(
    () => calculateOverallStatsFiltered(progress, studyQuestionIds),
    [progress, studyQuestionIds]
  );

  /** 플래시카드 전체 진행도 계산 */
  const flashcardStats = useMemo(() => {
    const memorizeCats = categories.filter((c) => isMemorizeCategory(c.id));
    let totalCards = 0;
    let knownCards = 0;
    for (const cat of memorizeCats) {
      const count = getFlashcardCount(cat.id);
      totalCards += count;
      knownCards += getCategoryProgress(cat.id, count).known;
    }
    return { totalCards, knownCards };
  }, [categories, cardProgress]);

  /** 문제 + 플래시카드 통합 진행도 */
  const totalItems = totalQuestions + flashcardStats.totalCards;
  const totalSeen = overallStats.totalSeen + flashcardStats.knownCards;
  const progressPercent =
    totalItems > 0
      ? Math.round((totalSeen / totalItems) * 100)
      : 0;

  const [modalInfo, setModalInfo] = useState<StudyResumeInfo | null>(null);

  const handleCategoryPress = (item: Category) => {
    const isCard = isMemorizeCategory(item.id);

    if (isCard) {
      const flashcardTotal = getFlashcardCount(item.id);

      // 카드별 상태 계산
      const allCards = loadFlashcards(item.id);
      let knownCount = 0, unknownCount = 0, unseenCount = 0;
      for (const card of allCards) {
        const p = cardProgress[card.id];
        if (!p || p.status === 'unseen') unseenCount++;
        else if (p.status === 'known') knownCount++;
        else unknownCount++;
      }

      const hasProgress = knownCount + unknownCount > 0;

      // 학습 기록 없으면 광고 후 진입
      if (!hasProgress) {
        showAdWithLoading(() => router.push(`/quiz/${item.id}`));
        return;
      }

      // 이어서 학습 가능 = 아직 안 본 카드가 남아있음
      const canResume = unseenCount > 0;

      setModalInfo({
        categoryId: item.id,
        categoryName: item.name,
        icon: item.icon,
        isCard: true,
        totalCards: flashcardTotal,
        knownCount,
        unknownCount,
        unseenCount,
        canResume,
        totalQuestions: 0,
        seenCount: 0,
        unseenQuestions: 0,
        correctCount: 0,
        incorrectCount: 0,
      });
    } else {
      const stats = useUserStore.getState().getCategoryStats(item.id);

      // 학습 기록 없으면 광고 후 진입
      if (stats.seenCount === 0) {
        showAdWithLoading(() => router.push(`/quiz/${item.id}?mode=unseen`));
        return;
      }

      const unseenQuestions = stats.totalQuestions - stats.seenCount;

      setModalInfo({
        categoryId: item.id,
        categoryName: item.name,
        icon: item.icon,
        isCard: false,
        totalCards: 0,
        knownCount: 0,
        unknownCount: 0,
        unseenCount: 0,
        canResume: false,
        totalQuestions: stats.totalQuestions,
        seenCount: stats.seenCount,
        unseenQuestions,
        correctCount: stats.correctCount,
        incorrectCount: stats.incorrectCount,
      });
    }
  };

  const navigateFromModal = (mode: string) => {
    if (!modalInfo) return;
    const catId = modalInfo.categoryId;
    setModalInfo(null);

    if (modalInfo.isCard) {
      const paths: Record<string, string> = {
        resume: `/quiz/${catId}?mode=resume`,
        all: `/quiz/${catId}`,
        unknown: `/quiz/${catId}?mode=unknown`,
      };
      const path = paths[mode];
      if (path) showAdWithLoading(() => router.push(path));
    } else {
      showAdWithLoading(() => {
        if (mode === 'all') useUserStore.getState().resetCategoryProgress(catId);
        router.push(`/quiz/${catId}?mode=${mode}`);
      });
    }
  };

  const renderCategory = ({ item }: { item: Category }) => {
    const isCard = isMemorizeCategory(item.id);

    if (isCard) {
      const flashcardTotal = getFlashcardCount(item.id);
      const { known, rate } = getCategoryProgress(item.id, flashcardTotal);
      const percent = Math.round(rate * 100);

      return (
        <Pressable
          style={styles.categoryCard}
          onPress={() => handleCategoryPress(item)}
        >
          <MaterialCommunityIcons
            name={item.icon as any}
            size={32}
            color={COLORS.primary}
          />
          <Text style={styles.categoryName}>{item.name}</Text>
          <Text style={styles.categoryCount}>
            {known}/{flashcardTotal} 암기
          </Text>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${percent}%`,
                  backgroundColor: percent >= 70 ? COLORS.success : COLORS.primary,
                },
              ]}
            />
          </View>
        </Pressable>
      );
    }

    const stats = useUserStore.getState().getCategoryStats(item.id);
    const catProgress =
      item.questionCount > 0
        ? Math.round((stats.seenCount / item.questionCount) * 100)
        : 0;

    return (
      <Pressable
        style={styles.categoryCard}
        onPress={() => handleCategoryPress(item)}
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        extraData={[progress, cardProgress]}
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
                {progressPercent}% ({totalSeen}/{totalItems})
              </Text>
            </View>

            <Text style={styles.sectionTitle}>카테고리</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <AdGateOverlay
        isWaitingForAd={isWaitingForAd}
        adBlockedCountdown={adBlockedCountdown}
        proceedImmediately={proceedImmediately}
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
          <Pressable style={[styles.modalContent, { paddingBottom: 36 + bottom }]} onPress={() => {}}>
            {/* 헤더 */}
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons
                name={(modalInfo?.icon as any) || 'book-open-variant'}
                size={32}
                color={COLORS.primary}
              />
              <Text style={styles.modalTitle}>{modalInfo?.categoryName}</Text>
            </View>

            {/* 진행 상태 */}
            {modalInfo?.isCard ? (
              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatValue}>{modalInfo.totalCards}</Text>
                  <Text style={styles.modalStatLabel}>전체</Text>
                </View>
                <View style={styles.modalStatDivider} />
                <View style={styles.modalStatItem}>
                  <Text style={[styles.modalStatValue, { color: COLORS.success }]}>
                    {modalInfo.knownCount}
                  </Text>
                  <Text style={styles.modalStatLabel}>알아요</Text>
                </View>
                <View style={styles.modalStatDivider} />
                <View style={styles.modalStatItem}>
                  <Text style={[styles.modalStatValue, { color: COLORS.danger }]}>
                    {modalInfo.unknownCount}
                  </Text>
                  <Text style={styles.modalStatLabel}>모르겠어요</Text>
                </View>
              </View>
            ) : (
              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatValue}>{modalInfo?.totalQuestions}</Text>
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
                    {modalInfo?.unseenQuestions}
                  </Text>
                  <Text style={styles.modalStatLabel}>미학습</Text>
                </View>
              </View>
            )}

            {/* 버튼 */}
            <View style={styles.modalButtons}>
              {modalInfo?.isCard ? (
                <>
                  {/* 암기 카테고리 버튼 */}
                  {modalInfo.canResume && (
                    <Pressable
                      style={[styles.modalButton, styles.modalButtonPrimary]}
                      onPress={() => navigateFromModal('resume')}
                    >
                      <MaterialCommunityIcons name="play-circle" size={20} color="#fff" />
                      <Text style={styles.modalButtonPrimaryText}>
                        이어서 학습 ({modalInfo.unseenCount}장 남음)
                      </Text>
                    </Pressable>
                  )}
                  {modalInfo.unknownCount > 0 && (
                    <Pressable
                      style={[styles.modalButton, styles.modalButtonOutline]}
                      onPress={() => navigateFromModal('unknown')}
                    >
                      <MaterialCommunityIcons name="close-circle-outline" size={20} color={COLORS.primary} />
                      <Text style={styles.modalButtonOutlineText}>
                        모르는 카드만 ({modalInfo.unknownCount}장)
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={[styles.modalButton, styles.modalButtonOutline]}
                    onPress={() => navigateFromModal('all')}
                  >
                    <MaterialCommunityIcons name="refresh" size={20} color={COLORS.primary} />
                    <Text style={styles.modalButtonOutlineText}>
                      처음부터 ({modalInfo.totalCards}장)
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  {/* 일반 카테고리 버튼 */}
                  {modalInfo && modalInfo.unseenQuestions > 0 && (
                    <Pressable
                      style={[styles.modalButton, styles.modalButtonPrimary]}
                      onPress={() => navigateFromModal('unseen')}
                    >
                      <MaterialCommunityIcons name="play-circle" size={20} color="#fff" />
                      <Text style={styles.modalButtonPrimaryText}>
                        이어서 학습 ({modalInfo.unseenQuestions}문제 남음)
                      </Text>
                    </Pressable>
                  )}
                  {modalInfo && modalInfo.incorrectCount > 0 && (
                    <Pressable
                      style={[styles.modalButton, styles.modalButtonOutline]}
                      onPress={() => navigateFromModal('incorrect')}
                    >
                      <MaterialCommunityIcons name="close-circle-outline" size={20} color={COLORS.primary} />
                      <Text style={styles.modalButtonOutlineText}>
                        틀린 문제만 ({modalInfo.incorrectCount}문제)
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={[styles.modalButton, styles.modalButtonOutline]}
                    onPress={() => navigateFromModal('all')}
                  >
                    <MaterialCommunityIcons name="refresh" size={20} color={COLORS.primary} />
                    <Text style={styles.modalButtonOutlineText}>
                      처음부터 ({modalInfo?.totalQuestions}문제)
                    </Text>
                  </Pressable>
                </>
              )}
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