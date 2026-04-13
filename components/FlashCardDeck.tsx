/**
 * 플래시카드 덱 컴포넌트
 * 스와이프로 카드 이동 (좌=모르겠어요, 우=알아요)
 */

import { useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import FlashCardComponent from '@/components/FlashCard';
import { COLORS } from '@/lib/constants';
import type { FlashCard, CardDisplayMode } from '@/features/flashcards/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface FlashCardDeckProps {
  cards: FlashCard[];
  currentIndex: number;
  displayMode: CardDisplayMode;
  onKnown: () => void;
  onUnknown: () => void;
  onFlip: () => void;
  isFlipped: boolean;
}

const FlashCardDeck = ({
  cards,
  currentIndex,
  displayMode,
  onKnown,
  onUnknown,
  onFlip,
  isFlipped,
}: FlashCardDeckProps) => {
  const translateX = useSharedValue(0);
  const currentCard = cards[currentIndex];

  const resetPosition = useCallback(() => {
    translateX.value = withSpring(0, { damping: 15 });
  }, []);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        runOnJS(onKnown)();
        translateX.value = 0;
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        runOnJS(onUnknown)();
        translateX.value = 0;
      } else {
        runOnJS(resetPosition)();
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftIndicatorStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? Math.min(Math.abs(translateX.value) / 80, 1) : 0,
  }));

  const rightIndicatorStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 20 ? Math.min(translateX.value / 80, 1) : 0,
  }));

  if (!currentCard) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>카드가 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.indicator, styles.indicatorLeft, leftIndicatorStyle]}>
        <Text style={styles.indicatorTextRed}>모르겠어요</Text>
      </Animated.View>
      <Animated.View style={[styles.indicator, styles.indicatorRight, rightIndicatorStyle]}>
        <Text style={styles.indicatorTextGreen}>알아요</Text>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.cardWrapper, cardStyle]}>
          <FlashCardComponent
            card={currentCard}
            displayMode={displayMode}
            isFlipped={isFlipped}
            onFlip={onFlip}
            showHint={currentIndex === 0 && !isFlipped}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  indicator: {
    position: 'absolute',
    top: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  indicatorLeft: {
    left: 20,
    backgroundColor: COLORS.dangerLight,
  },
  indicatorRight: {
    right: 20,
    backgroundColor: COLORS.successLight,
  },
  indicatorTextRed: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },
  indicatorTextGreen: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
  },
});

export default FlashCardDeck;