/**
 * 배너 광고 컴포넌트
 * Expo Go에서는 네이티브 모듈 미지원으로 빈 컴포넌트 반환
 * onHeightChange: 광고 로드 완료 후 실제 높이를 부모에 전달
 */

import { useState } from 'react';
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

      return (
        <View
          style={[styles.container, !isLoaded && styles.hidden]}
          onLayout={(e) => {
            if (isLoaded) {
              onHeightChange?.(e.nativeEvent.layout.height);
            }
          }}
        >
          <BannerAd
            unitId={BANNER_AD_UNIT_ID}
            size={adSize}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            onAdLoaded={() => setIsLoaded(true)}
            onAdFailedToLoad={() => setIsLoaded(false)}
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