/**
 * 해설 패널 컴포넌트
 * BlurOverlay를 활용하여 해설 숨김/공개 처리
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/constants';
import { BlurOverlay } from '@/components/ui/BlurOverlay';

interface ExplanationPanelProps {
  explanation: string;
  revealed: boolean;
  onReveal: () => void;
}

export const ExplanationPanel: React.FC<ExplanationPanelProps> = ({
  explanation,
  revealed,
  onReveal,
}) => {
  return (
    <View style={styles.container}>
      <BlurOverlay revealed={revealed} onReveal={onReveal} style={styles.overlay}>
        <View style={styles.explanationBox}>
          <Text style={styles.explanationLabel}>해설</Text>
          <Text style={styles.explanationText}>{explanation}</Text>
        </View>
      </BlurOverlay>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  overlay: {
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 80,
  },
  explanationBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  explanationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
});

export default ExplanationPanel;
