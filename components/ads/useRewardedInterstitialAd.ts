/**
 * 보상형 전면 광고 훅
 * - lib/admob.ts가 인스턴스 생성·로드·재로드 전체 관리
 * - 이 훅은 광고 표시(show) 로직과 대기열 처리만 담당
 * - Expo Go에서는 네이티브 모듈 미지원으로 광고 없이 즉시 처리
 */

import { useSyncExternalStore, useCallback, useEffect, useRef } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AdEventType } from 'react-native-google-mobile-ads';
import { subscribeAdState, getAdState, getAd, triggerLoad as _triggerLoad } from '@/lib/admob';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

interface ShowAdCallbacks {
  onCompleted: () => void;
  onError?: () => void;
}

interface UseRewardedInterstitialAdReturn {
  showAd: (callbacks: ShowAdCallbacks) => void;
  cancelAd: () => void;
  isAdLoaded: boolean;
  isAdLoading: boolean;
}

const useRewardedInterstitialAdNoop = (): UseRewardedInterstitialAdReturn => ({
  showAd: ({ onCompleted }) => onCompleted(),
  cancelAd: () => {},
  isAdLoaded: false,
  isAdLoading: false,
});

const useRewardedInterstitialAdReal = (): UseRewardedInterstitialAdReturn => {
  const { loaded, isLoading } = useSyncExternalStore(subscribeAdState, getAdState);

  const pendingRef = useRef<ShowAdCallbacks | null>(null);
  const isShowingRef = useRef(false);

  const executeShow = useCallback((callbacks: ShowAdCallbacks) => {
    const ad = getAd();
    if (!ad) { callbacks.onError?.(); return; }

    isShowingRef.current = true;
    let done = false;
    let unsubClosed: (() => void) | undefined;
    let unsubShowError: (() => void) | undefined;

    const cleanup = () => {
      if (done) return;
      done = true;
      isShowingRef.current = false;
      unsubClosed?.();
      unsubShowError?.();
    };

    // lib/admob.ts의 CLOSED 리스너가 재로드 처리
    // 여기선 콜백 실행만 담당
    unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      cleanup();
      callbacks.onCompleted();
    });

    unsubShowError = ad.addAdEventListener(AdEventType.ERROR, () => {
      if (!isShowingRef.current) return;
      cleanup();
      callbacks.onError?.();
    });

    ad.show();
  }, []);

  // 광고 로드 완료 시 대기 중인 요청 자동 실행
  useEffect(() => {
    if (loaded && pendingRef.current && !isShowingRef.current) {
      const callbacks = pendingRef.current;
      pendingRef.current = null;
      executeShow(callbacks);
    }
  }, [loaded, executeShow]);

  const cancelAd = useCallback(() => {
    pendingRef.current = null;
  }, []);

  const showAd = useCallback((callbacks: ShowAdCallbacks) => {
    if (!loaded) {
      pendingRef.current = callbacks;
      if (!isLoading) {
        _triggerLoad();
      }
      return;
    }
    executeShow(callbacks);
  }, [loaded, isLoading, executeShow]);

  return { showAd, cancelAd, isAdLoaded: loaded, isAdLoading: isLoading };
};

export const useRewardedInterstitialAd = isExpoGo
  ? useRewardedInterstitialAdNoop
  : useRewardedInterstitialAdReal;