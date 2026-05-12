/**
 * 보상형 광고 훅
 * 기출문제 최초 도전 / 전체 다시 풀기 진입 시 사용
 * - 광고 로딩 중 showAd 호출 시 대기 후 자동 실행
 * - Expo Go에서는 네이티브 모듈 미지원으로 광고 없이 즉시 보상 처리
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

interface ShowAdCallbacks {
  onRewarded: () => void;
  onDismissed?: () => void;
  onError?: () => void;
}

interface UseRewardedAdReturn {
  showAd: (callbacks: ShowAdCallbacks) => void;
  isAdLoaded: boolean;
  isAdLoading: boolean;
}

const useRewardedAdNoop = (): UseRewardedAdReturn => ({
  showAd: ({ onRewarded }) => onRewarded(),
  isAdLoaded: false,
  isAdLoading: false,
});

const useRewardedAdReal = (): UseRewardedAdReturn => {
  const { RewardedAd, RewardedAdEventType, AdEventType } =
    require('react-native-google-mobile-ads');
  const { REWARDED_AD_UNIT_ID } = require('@/lib/ads');

  const [loaded, setLoaded] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(true);
  const pendingRef = useRef<ShowAdCallbacks | null>(null);

  const [ad] = useState(() =>
    RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    })
  );

  const executeShow = useCallback(
    (callbacks: ShowAdCallbacks) => {
      let rewarded = false;

      const unsubReward = ad.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => { rewarded = true; }
      );
      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        unsubReward();
        unsubClosed();
        setLoaded(false);
        setIsAdLoading(true);
        ad.load();
        if (rewarded) callbacks.onRewarded();
        else callbacks.onDismissed?.();
      });

      ad.show();
    },
    [ad]
  );

  useEffect(() => {
    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setLoaded(true);
      setIsAdLoading(false);
      // 대기 중인 요청이 있으면 자동 실행
      if (pendingRef.current) {
        const callbacks = pendingRef.current;
        pendingRef.current = null;
        executeShow(callbacks);
      }
    });
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      setLoaded(false);
      setIsAdLoading(false);
      // 대기 중인 요청에 에러 콜백 전달
      if (pendingRef.current) {
        pendingRef.current.onError?.();
        pendingRef.current = null;
      }
    });

    ad.load();

    return () => {
      unsubLoaded();
      unsubError();
    };
  }, [ad, executeShow]);

  const showAd = useCallback(
    (callbacks: ShowAdCallbacks) => {
      if (!loaded) {
        if (isAdLoading) {
          // 로딩 중 → 대기열에 등록, 로드 완료 시 자동 실행
          pendingRef.current = callbacks;
        } else {
          // 로드 실패 상태
          callbacks.onError?.();
        }
        return;
      }
      executeShow(callbacks);
    },
    [loaded, isAdLoading, executeShow]
  );

  return { showAd, isAdLoaded: loaded, isAdLoading };
};

export const useRewardedAd = isExpoGo ? useRewardedAdNoop : useRewardedAdReal;