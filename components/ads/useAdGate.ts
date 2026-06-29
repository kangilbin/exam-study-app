import { useState, useEffect, useRef } from 'react';
import { useSharedRewardedAd } from './RewardedAdContext';

const AD_LOAD_TIMEOUT_MS = 15_000;

export const useAdGate = () => {
  const { showAd, cancelAd } = useSharedRewardedAd();
  const [isWaitingForAd, setIsWaitingForAd] = useState(false);
  const [adBlockedCountdown, setAdBlockedCountdown] = useState<number | null>(null);
  const pendingNavRef = useRef<(() => void) | null>(null);
  const isWaitingRef = useRef(false);

  useEffect(() => {
    if (adBlockedCountdown === null) return;
    if (adBlockedCountdown === 0) {
      const cb = pendingNavRef.current;
      pendingNavRef.current = null;
      setAdBlockedCountdown(null);
      cb?.();
      return;
    }
    const timer = setTimeout(
      () => setAdBlockedCountdown((prev) => (prev !== null ? prev - 1 : null)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [adBlockedCountdown]);

  const proceedImmediately = () => {
    const cb = pendingNavRef.current;
    pendingNavRef.current = null;
    setAdBlockedCountdown(null);
    cb?.();
  };

  const showAdWithLoading = (onCompleted: () => void) => {
    if (isWaitingRef.current) return;

    isWaitingRef.current = true;
    setIsWaitingForAd(true);

    // resolved 플래그: 워치독 발화 후 뒤늦은 onCompleted 호출 방지 (이중 내비게이션 차단)
    let resolved = false;

    const resolve = (success: boolean) => {
      if (resolved) return;
      resolved = true;
      cancelAd(); // 타임아웃/즉시진입 시 대기 중인 광고 취소
      clearTimeout(timeoutId);
      isWaitingRef.current = false;
      setIsWaitingForAd(false);
      if (success) {
        onCompleted();
      } else {
        pendingNavRef.current = onCompleted;
        setAdBlockedCountdown(5);
      }
    };

    // 15초 내 응답 없으면 카운트다운으로 폴백
    const timeoutId = setTimeout(() => resolve(false), AD_LOAD_TIMEOUT_MS);

    showAd({
      onCompleted: () => resolve(true),
      onError: () => resolve(false),
    });
  };

  return { showAdWithLoading, isWaitingForAd, adBlockedCountdown, proceedImmediately };
};
