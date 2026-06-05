/**
 * 기출문제 탭 화면
 * 연도별 SectionList로 기출 회차 표시
 */

import {
  View,
  Text,
  SectionList,
  Pressable,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';
import type { Category } from '@/features/questions/types';
import { useExamCategories, type ExamSection } from '@/features/questions/hooks/useExamCategories';
import { AdGateOverlay } from '@/components/ads/AdGateOverlay';

export default function ExamScreen() {
  const { bottom } = useSafeAreaInsets();
  const {
    sections, progress, modalInfo, setModalInfo,
    isWaitingForAd, adBlockedCountdown, proceedImmediately,
    handleExamPress, navigateWithMode, getItemStats,
  } = useExamCategories();

  const renderItem = ({ item }: { item: Category }) => {
    const { stats, progress } = getItemStats(item);

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
        <Pressable style={styles.modalOverlay} onPress={() => setModalInfo(null)}>
          <Pressable style={[styles.modalContent, { paddingBottom: 36 + bottom }]} onPress={() => {}}>
            {/* 헤더 */}
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="file-document-outline" size={32} color={COLORS.primary} />
              <Text style={styles.modalTitle}>{modalInfo?.categoryName}</Text>
            </View>

            {/* 진행 상태: 완료 시 점수 카드, 미완료 시 통계 */}
            {modalInfo?.isCompleted ? (
              <View style={styles.modalStats}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={styles.scoreValue}>
                    {modalInfo.score}
                    <Text style={styles.scoreSuffix}>점</Text>
                  </Text>
                  <View style={[styles.passBadge, { backgroundColor: modalInfo.isPassed ? COLORS.successLight : COLORS.dangerLight }]}>
                    <Text style={[styles.passBadgeText, { color: modalInfo.isPassed ? COLORS.success : COLORS.danger }]}>
                      {modalInfo.isPassed ? '합격' : '불합격'}
                    </Text>
                  </View>
                  <View style={styles.scoreDetailRow}>
                    <View style={styles.scoreDetailItem}>
                      <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.success} />
                      <Text style={[styles.scoreDetailText, { color: COLORS.success }]}>정답 {modalInfo.correctCount}개</Text>
                    </View>
                    <View style={styles.scoreDetailItem}>
                      <MaterialCommunityIcons name="close-circle" size={16} color={COLORS.danger} />
                      <Text style={[styles.scoreDetailText, { color: COLORS.danger }]}>오답 {modalInfo.incorrectCount}개</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatValue}>{modalInfo?.totalCount}</Text>
                  <Text style={styles.modalStatLabel}>전체</Text>
                </View>
                <View style={styles.modalStatDivider} />
                <View style={styles.modalStatItem}>
                  <Text style={[styles.modalStatValue, { color: COLORS.success }]}>{modalInfo?.seenCount}</Text>
                  <Text style={styles.modalStatLabel}>학습완료</Text>
                </View>
                <View style={styles.modalStatDivider} />
                <View style={styles.modalStatItem}>
                  <Text style={[styles.modalStatValue, { color: COLORS.primary }]}>{modalInfo?.unseenCount}</Text>
                  <Text style={styles.modalStatLabel}>미학습</Text>
                </View>
              </View>
            )}

            {/* 버튼들 */}
            <View style={styles.modalButtons}>
              {modalInfo && modalInfo.unseenCount > 0 && (
                <Pressable style={[styles.modalButton, styles.modalButtonPrimary]} onPress={() => navigateWithMode('resume-progress')}>
                  <MaterialCommunityIcons name="play-circle" size={20} color="#fff" />
                  <Text style={styles.modalButtonPrimaryText}>이어서 풀기 ({modalInfo.unseenCount}문제 남음)</Text>
                </Pressable>
              )}
              {modalInfo?.isCompleted && modalInfo.incorrectCount > 0 && (
                <Pressable style={[styles.modalButton, styles.modalButtonPrimary]} onPress={() => navigateWithMode('incorrect')}>
                  <MaterialCommunityIcons name="close-circle-outline" size={20} color="#fff" />
                  <Text style={styles.modalButtonPrimaryText}>틀린 문제만 다시 풀기 ({modalInfo.incorrectCount}문제)</Text>
                </Pressable>
              )}
              <Pressable style={[styles.modalButton, styles.modalButtonOutline]} onPress={() => navigateWithMode('all')}>
                <MaterialCommunityIcons name="refresh" size={20} color={COLORS.primary} />
                <Text style={styles.modalButtonOutlineText}>전체 다시 풀기 ({modalInfo?.totalCount}문제)</Text>
              </Pressable>
            </View>

            {/* 닫기 */}
            <Pressable style={styles.modalClose} onPress={() => setModalInfo(null)}>
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
  scoreValue: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  scoreSuffix: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  passBadge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  passBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scoreDetailRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },
  scoreDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreDetailText: {
    fontSize: 14,
    fontWeight: '600',
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
  adLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adLoadingBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 14,
  },
  adLoadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  adBlockedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  adBlockedSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  adBlockedButton: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 28,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  adBlockedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalCloseText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});