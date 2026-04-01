/**
 * 객관식 선택지 목록 컴포넌트
 * answered=true 시 정답/오답 색상 표시
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/constants';
import type { Choice } from '@/features/questions/types';

interface ChoiceListProps {
  choices: Choice[];
  selectedLabel: string | null;
  onSelect: (label: string) => void;
  answered: boolean;
}

export const ChoiceList: React.FC<ChoiceListProps> = ({
  choices,
  selectedLabel,
  onSelect,
  answered,
}) => {
  return (
    <View style={styles.container}>
      {choices.map((choice) => {
        const isSelected = selectedLabel === choice.label;

        let choiceStyle = styles.choiceDefault;
        let textStyle = styles.textDefault;

        if (answered) {
          if (choice.isCorrect) {
            choiceStyle = styles.choiceCorrect;
            textStyle = styles.textWhite;
          } else if (isSelected && !choice.isCorrect) {
            choiceStyle = styles.choiceIncorrect;
            textStyle = styles.textWhite;
          } else {
            choiceStyle = styles.choiceDisabled;
            textStyle = styles.textDisabled;
          }
        } else if (isSelected) {
          choiceStyle = styles.choiceSelected;
        }

        return (
          <TouchableOpacity
            key={choice.label}
            style={[styles.choice, choiceStyle]}
            onPress={() => !answered && onSelect(choice.label)}
            disabled={answered}
            activeOpacity={0.8}
          >
            <Text style={[styles.choiceLabel, textStyle]}>{choice.label}.</Text>
            <Text style={[styles.choiceText, textStyle, { flex: 1 }]}>
              {choice.text}
            </Text>
            {/* 정답 여부 아이콘 */}
            {answered && choice.isCorrect && (
              <Text style={styles.icon}>✓</Text>
            )}
            {answered && isSelected && !choice.isCorrect && (
              <Text style={styles.icon}>✗</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 8, marginTop: 16 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 2,
    gap: 8,
  },
  choiceDefault: { borderColor: COLORS.gray[200] },
  choiceSelected: { borderColor: COLORS.primary, backgroundColor: '#eef2ff' },
  choiceCorrect: { borderColor: COLORS.success, backgroundColor: COLORS.success },
  choiceIncorrect: { borderColor: COLORS.danger, backgroundColor: COLORS.danger },
  choiceDisabled: {
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.gray[100],
  },
  choiceLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 20,
  },
  choiceText: { fontSize: 14, color: COLORS.text },
  textDefault: { color: COLORS.text },
  textWhite: { color: '#fff' },
  textDisabled: { color: COLORS.gray[400] },
  icon: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ChoiceList;
