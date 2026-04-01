/**
 * 프로필/내정보 탭
 * 학습 통계 + 설정
 */

import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUserStore } from '@/store/useUserStore';
import { getTotalQuestionCount } from '@/features/questions/services/questionService';
import { calculateOverallStats } from '@/features/questions/services/progressService';
import { COLORS } from '@/lib/constants';

export default function ProfileScreen() {
  const router = useRouter();
  const progress = useUserStore((s) => s.progress);
  const totalQuestions = getTotalQuestionCount();
  const overallStats = useMemo(
    () => calculateOverallStats(progress, totalQuestions),
    [progress, totalQuestions]
  );
  const bookmarks = useUserStore((s) => s.bookmarks);
  const settings = useUserStore((s) => s.settings);
  const updateSettings = useUserStore((s) => s.updateSettings);

  const accuracy = overallStats.totalSeen > 0
    ? Math.round(overallStats.accuracy * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 통계 카드 */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>학습 통계</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{overallStats.totalSeen}</Text>
              <Text style={styles.statLabel}>학습한 문제</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalQuestions}</Text>
              <Text style={styles.statLabel}>전체 문제</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                {overallStats.totalCorrect}
              </Text>
              <Text style={styles.statLabel}>정답 수</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: accuracy >= 70 ? COLORS.success : COLORS.danger }]}>
                {accuracy}%
              </Text>
              <Text style={styles.statLabel}>정답률</Text>
            </View>
          </View>
        </View>

        {/* 메뉴 */}
        <View style={styles.menuSection}>
          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/bookmarks')}
          >
            <MaterialCommunityIcons name="bookmark" size={24} color={COLORS.primary} />
            <Text style={styles.menuText}>북마크</Text>
            <Text style={styles.menuBadge}>{bookmarks.length}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.gray[400]} />
          </Pressable>
        </View>

        {/* 설정 */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>설정</Text>
          <Pressable
            style={styles.menuItem}
            onPress={() => updateSettings({ shuffleMode: !settings.shuffleMode })}
          >
            <MaterialCommunityIcons name="shuffle" size={24} color={COLORS.primary} />
            <Text style={styles.menuText}>문제 셔플</Text>
            <Text style={styles.menuToggle}>
              {settings.shuffleMode ? 'ON' : 'OFF'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => {
              const sizes = ['small', 'medium', 'large'] as const;
              const idx = sizes.indexOf(settings.fontSize);
              updateSettings({ fontSize: sizes[(idx + 1) % 3] });
            }}
          >
            <MaterialCommunityIcons name="format-size" size={24} color={COLORS.primary} />
            <Text style={styles.menuText}>코드 폰트 크기</Text>
            <Text style={styles.menuToggle}>
              {settings.fontSize === 'small' ? '작게' : settings.fontSize === 'medium' ? '보통' : '크게'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  content: { padding: 16 },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statItem: {
    width: '47%',
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '700', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  menuSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    padding: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  menuText: { flex: 1, fontSize: 15, color: COLORS.text, marginLeft: 12 },
  menuBadge: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: 8,
  },
  menuToggle: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: 8,
  },
});
