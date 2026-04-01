/**
 * 홈 화면 카테고리 카드 컴포넌트
 * 카테고리명, 아이콘, 문제 수, 진행도 표시
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';
import type { Category, CategoryStats } from '@/features/questions/types';

interface CategoryCardProps {
  category: Category;
  progress?: CategoryStats;
  onPress: () => void;
}

const GROUP_COLORS: Record<Category['group'], string> = {
  code: '#eef2ff',
  sql: '#f0fdf4',
  theory: '#fff7ed',
  exam: '#fdf4ff',
};

const GROUP_ICON_COLORS: Record<Category['group'], string> = {
  code: COLORS.primary,
  sql: COLORS.success,
  theory: COLORS.warning,
  exam: '#a855f7',
};

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  progress,
  onPress,
}) => {
  const accuracyPercent = progress ? Math.round(progress.accuracy * 100) : 0;
  const seenPercent =
    progress && progress.totalQuestions > 0
      ? Math.round((progress.seenCount / progress.totalQuestions) * 100)
      : 0;

  const bgColor = GROUP_COLORS[category.group];
  const iconColor = GROUP_ICON_COLORS[category.group];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons
          name={category.icon as any}
          size={28}
          color={iconColor}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {category.name}
        </Text>
        <Text style={styles.questionCount}>{category.questionCount}문제</Text>
      </View>
      <View style={styles.progressArea}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${seenPercent}%`, backgroundColor: iconColor },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>{seenPercent}%</Text>
      </View>
      {progress && progress.seenCount > 0 && (
        <Text style={styles.accuracy}>정답률 {accuracyPercent}%</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  info: { marginBottom: 10 },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  questionCount: { fontSize: 12, color: COLORS.textSecondary },
  progressArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    minWidth: 30,
    textAlign: 'right',
  },
  accuracy: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});

export default CategoryCard;
