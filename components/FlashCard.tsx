/**
 * 플래시카드 컴포넌트
 */

import { Pressable, Text, View, StyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';
import type { FlashCard as FlashCardType, CardDisplayMode } from '@/features/flashcards/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_MARGIN = 24;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2;

interface FlashCardProps {
  card: FlashCardType;
  displayMode: CardDisplayMode;
  isFlipped: boolean;
  onFlip: () => void;
  showHint?: boolean;
}

const FlashCardComponent = ({
  card,
  displayMode,
  isFlipped,
  onFlip,
  showHint = false,
}: FlashCardProps) => {
  const isFront = !isFlipped;
  const frontText = displayMode === 'term-first' ? card.term : card.definition;
  const backText = displayMode === 'term-first' ? card.definition : card.term;
  const hasTip = !isFront && (card.tip || card.mnemonic);

  if (isFront) {
    return (
      <View style={styles.outer}>
        <Pressable onPress={onFlip} style={styles.front}>
          <Text style={styles.frontLabel}>
            {displayMode === 'term-first' ? '용어' : '설명'}
          </Text>
          <View style={styles.frontBody}>
            <Text style={styles.frontText}>{frontText}</Text>
          </View>
          {showHint && <Text style={styles.hint}>탭하여 뒤집기</Text>}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.outer}>
      <Pressable onPress={onFlip} style={styles.back}>
        <Text style={styles.backLabel}>
          {displayMode === 'term-first' ? '설명' : '용어'}
        </Text>
        <Text style={styles.backText}>{backText}</Text>
      </Pressable>
      {hasTip && (
        <View style={styles.tip}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color={COLORS.warning} />
          <Text style={styles.tipText}>
            {[card.mnemonic, card.tip].filter(Boolean).join('\n')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    gap: 10,
  },

  front: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    minHeight: 220,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  frontLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray[400],
    letterSpacing: 1,
  },
  frontBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  frontText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 32,
  },
  hint: {
    fontSize: 12,
    color: COLORS.gray[400],
    textAlign: 'center',
  },

  back: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    minHeight: 220,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  backLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 8,
  },
  backText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
    lineHeight: 26,
  },

  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#92400e',
    lineHeight: 20,
  },
});

export default FlashCardComponent;