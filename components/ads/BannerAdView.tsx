/**
 * 배너 광고 컴포넌트
 * Expo Go에서는 네이티브 모듈 미지원으로 빈 컴포넌트 반환
 * onHeightChange: 광고 로드 완료 후 실제 높이를 부모에 전달
 */

import { useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

interface BannerAdViewProps {
  size?: string;
  onHeightChange?: (height: number) => void;
}

export const BannerAdView = isExpoGo
  ? () => null
  : ({ size, onHeightChange }: BannerAdViewProps) => {
      const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads');
      const { BANNER_AD_UNIT_ID } = require('@/lib/ads');
      const [isLoaded, setIsLoaded] = useState(false);
      const adSize = size ?? BannerAdSize.ANCHORED_ADAPTIVE_BANNER;
      // 일부 Android에서 네이티브 BannerAd가 height:0 제약을 무시하고 먼저 onLayout을
      // 발생시키는 경우, onAdLoaded 시점에 저장된 높이를 사용해 높이 전달
      const pendingHeightRef = useRef(0);

      return (
        <View
          style={[styles.container, !isLoaded && styles.hidden]}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (isLoaded && h > 0) {
              onHeightChange?.(h);
            } else {
              pendingHeightRef.current = h;
            }
          }}
        >
          <BannerAd
            unitId={BANNER_AD_UNIT_ID}
            size={adSize}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            onAdLoaded={() => {
              setIsLoaded(true);
              if (pendingHeightRef.current > 0) {
                onHeightChange?.(pendingHeightRef.current);
              }
            }}
            onAdFailedToLoad={() => {
              setIsLoaded(false);
              onHeightChange?.(0);
            }}
          />
        </View>
      );
    };

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  hidden: {
    height: 0,
    overflow: 'hidden',
  },
});