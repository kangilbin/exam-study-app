/**
 * 블러 오버레이 컴포넌트
 * revealed=false: 반투명 오버레이로 내용 숨김
 * 터치 시 onReveal 호출 → opacity 애니메이션(300ms)으로 오버레이 제거
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { BLUR_REVEAL_DURATION } from '@/lib/constants';

interface BlurOverlayProps {
  children: React.ReactNode;
  revealed: boolean;
  onReveal: () => void;
  label?: string;
  style?: ViewStyle;
}

export const BlurOverlay: React.FC<BlurOverlayProps> = ({
  children,
  revealed,
  onReveal,
  label = '터치하여 해설 보기',
  style,
}) => {
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (revealed) {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: BLUR_REVEAL_DURATION,
        useNativeDriver: true,
      }).start();
    } else {
      overlayOpacity.setValue(1);
    }
  }, [revealed]);

  return (
    <View style={[styles.wrapper, style]}>
      {children}
      {!revealed && (
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={styles.touchArea} onPress={onReveal}>
            <Text style={styles.overlayText}>{label}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(107, 114, 128, 0.85)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default BlurOverlay;
