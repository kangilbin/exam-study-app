/**
 * 전면 광고 훅
 * 퀴즈 결과 → 홈 이동 시 사용
 * Expo Go에서는 네이티브 모듈 미지원으로 no-op 반환
 */

import { useEffect, useCallback, useState } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const useInterstitialAdNoop = () => ({
  showAd: (onComplete?: () => void) => onComplete?.(),
  isAdLoaded: false,
});

const useInterstitialAdReal = () => {
  const { InterstitialAd, AdEventType } = require('react-native-google-mobile-ads');
  const { INTERSTITIAL_AD_UNIT_ID } = require('@/lib/ads');

  const [loaded, setLoaded] = useState(false);
  const [ad] = useState(() =>
    InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    })
  );

  useEffect(() => {
    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      setLoaded(true);
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      setLoaded(false);
    });

    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setLoaded(false);
      ad.load();
    });

    ad.load();

    return () => {
      unsubLoaded();
      unsubError();
      unsubClosed();
    };
  }, [ad]);

  const showAd = useCallback((onComplete?: () => void) => {
    if (loaded) {
      const unsub = ad.addAdEventListener(AdEventType.CLOSED, () => {
        unsub();
        onComplete?.();
      });
      ad.show();
    } else {
      onComplete?.();
    }
  }, [ad, loaded]);

  return { showAd, isAdLoaded: loaded };
};

export const useInterstitialAd = isExpoGo ? useInterstitialAdNoop : useInterstitialAdReal;
